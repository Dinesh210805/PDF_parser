"""
parser/pdf_analyzer.py

Analyzes each page of a PDF and classifies it as:
  - TEXT     → pure text, extract directly
  - IMAGE    → scanned or full-image page, needs VLM
  - MIXED    → has both text and embedded visuals, do both
  - DIAGRAM  → has text but also significant vector/raster diagrams
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import fitz  # PyMuPDF
import pdfplumber
from rich.console import Console

console = Console()


class PageType(Enum):
    TEXT = "text"
    IMAGE = "image"
    MIXED = "mixed"


@dataclass
class PageInfo:
    page_number: int          # 1-based
    page_type: PageType
    extracted_text: str       # raw text from pdfplumber (may be empty)
    char_count: int
    has_raster_images: bool   # embedded JPEG/PNG raster images
    has_vector_graphics: bool # vector drawings (charts, diagrams)
    image_coverage: float     # fraction of page area covered by images (0.0–1.0)
    width: float
    height: float


def analyze_pdf(pdf_path: str, verbose: bool = False) -> list[PageInfo]:
    """
    Analyze every page of the PDF and return a list of PageInfo objects.
    Uses PyMuPDF for image/graphics detection and pdfplumber for text.
    """
    pages: list[PageInfo] = []

    # Open with both libraries
    mupdf_doc = fitz.open(pdf_path)

    with pdfplumber.open(pdf_path) as plumber_doc:
        total = len(plumber_doc.pages)

        if verbose:
            console.print(f"[bold cyan]📄 Analyzing {total} pages...[/bold cyan]")

        for i, plumber_page in enumerate(plumber_doc.pages):
            page_num = i + 1
            mupdf_page = mupdf_doc[i]

            # ── 1. Extract text ────────────────────────────────────────────
            raw_text = plumber_page.extract_text() or ""
            char_count = len(raw_text.strip())

            # ── 2. Detect raster images ────────────────────────────────────
            image_list = mupdf_page.get_images(full=True)
            has_raster = len(image_list) > 0

            # ── 3. Estimate image area coverage ───────────────────────────
            page_area = plumber_page.width * plumber_page.height
            image_coverage = 0.0

            if has_raster:
                # Sum bounding boxes of raster images on the page
                covered = 0.0
                for img_info in mupdf_page.get_image_info(hashes=False):
                    bbox = img_info.get("bbox", (0, 0, 0, 0))
                    w = abs(bbox[2] - bbox[0])
                    h = abs(bbox[3] - bbox[1])
                    covered += w * h
                image_coverage = min(covered / page_area, 1.0) if page_area > 0 else 0.0

            # ── 4. Detect vector drawings (paths/lines → diagrams/charts) ──
            paths = mupdf_page.get_drawings()
            # More than 10 distinct drawing paths → likely contains a diagram
            has_vector = len(paths) > 10

            # ── 5. Classify page type ──────────────────────────────────────
            page_type = _classify(char_count, has_raster, has_vector, image_coverage)

            pages.append(PageInfo(
                page_number=page_num,
                page_type=page_type,
                extracted_text=raw_text,
                char_count=char_count,
                has_raster_images=has_raster,
                has_vector_graphics=has_vector,
                image_coverage=image_coverage,
                width=plumber_page.width,
                height=plumber_page.height,
            ))

            if verbose:
                _log_page(pages[-1])

    mupdf_doc.close()
    return pages


def _classify(
    char_count: int,
    has_raster: bool,
    has_vector: bool,
    image_coverage: float,
) -> PageType:
    """Classify a page based on its content signals."""

    # Mostly blank or image-dominated page with very little text
    if char_count < 100 and (has_raster or has_vector):
        return PageType.IMAGE

    # Full-image scanned page (no text at all)
    if char_count < 30:
        return PageType.IMAGE

    # Has substantial text AND visuals → mixed
    if char_count >= 100 and (has_raster or (has_vector and image_coverage > 0.1)):
        return PageType.MIXED

    # Pure text
    return PageType.TEXT


def _log_page(p: PageInfo):
    type_color = {
        PageType.TEXT: "green",
        PageType.IMAGE: "yellow",
        PageType.MIXED: "blue",
    }
    color = type_color[p.page_type]
    console.print(
        f"  Page [bold]{p.page_number:>3}[/bold]  "
        f"[{color}]{p.page_type.value.upper():<6}[/{color}]  "
        f"chars={p.char_count:<5}  "
        f"raster={'✓' if p.has_raster_images else '✗'}  "
        f"vector={'✓' if p.has_vector_graphics else '✗'}  "
        f"img_cov={p.image_coverage:.0%}"
    )


def print_analysis_summary(pages: list[PageInfo]):
    text_pages  = [p for p in pages if p.page_type == PageType.TEXT]
    image_pages = [p for p in pages if p.page_type == PageType.IMAGE]
    mixed_pages = [p for p in pages if p.page_type == PageType.MIXED]

    console.print("\n[bold]📊 Analysis Summary[/bold]")
    console.print(f"  Total pages : {len(pages)}")
    console.print(f"  [green]TEXT  pages : {len(text_pages)}[/green]  (direct extraction)")
    console.print(f"  [yellow]IMAGE pages : {len(image_pages)}[/yellow]  (VLM processing)")
    console.print(f"  [blue]MIXED pages : {len(mixed_pages)}[/blue]  (text + VLM for visuals)")
    console.print()
