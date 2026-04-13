"""
parser/page_processor.py

Processes each page according to its type and returns a structured
PageContent object ready for the knowledge base builder.
"""

from dataclasses import dataclass
from typing import Callable, Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from pdf_analyzer import PageInfo, PageType
from image_processor import rasterize_pages_batch
from vlm_client import describe_page_image

console = Console()


@dataclass
class PageContent:
    page_number: int
    page_type: PageType
    text_content: str         # extracted or empty
    vlm_description: str      # VLM output or empty
    has_visual: bool          # True if page had any diagram/image
    processing_note: str      # e.g. "Text extracted" / "VLM via Llama 4"


def process_all_pages(
    pdf_path: str,
    pages: list[PageInfo],
    tmp_dir: str,
    verbose: bool = False,
    progress_callback: Optional[Callable[[int, int, PageInfo], None]] = None,
) -> list[PageContent]:
    """
    Process all pages and return PageContent for each.
    Batches rasterization for efficiency.
    """
    results: list[PageContent] = []

    # ── Identify pages that need rasterization ────────────────────────────────
    needs_raster = [
        p.page_number for p in pages
        if p.page_type in (PageType.IMAGE, PageType.MIXED)
    ]

    rasterized: dict[int, str] = {}
    if needs_raster:
        console.print(
            f"\n[bold cyan]🖼  Rasterizing {len(needs_raster)} pages "
            f"at {__import__('config').RASTERIZE_DPI} DPI...[/bold cyan]"
        )
        rasterized = rasterize_pages_batch(
            pdf_path, needs_raster, tmp_dir, verbose=verbose
        )

    # ── Process each page ─────────────────────────────────────────────────────
    console.print(f"\n[bold cyan]🤖 Processing pages with Groq Llama 4...[/bold cyan]\n")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Processing pages", total=len(pages))

        for page_info in pages:
            content = _process_single_page(page_info, rasterized, verbose)
            results.append(content)

            if progress_callback is not None:
                try:
                    progress_callback(len(results), len(pages), page_info)
                except Exception:
                    # Keep parser robust even if caller callback fails.
                    pass

            status_icon = {
                PageType.TEXT:  "📝",
                PageType.IMAGE: "🖼",
                PageType.MIXED: "📋",
            }[page_info.page_type]

            progress.update(
                task,
                advance=1,
                description=(
                    f"{status_icon} Page {page_info.page_number:>3}/"
                    f"{len(pages)}  [{page_info.page_type.value}]"
                ),
            )

    return results


def _process_single_page(
    page_info: PageInfo,
    rasterized: dict[int, str],
    verbose: bool,
) -> PageContent:
    """Process one page according to its type."""

    pn = page_info.page_number

    # ── TEXT pages: just clean up extracted text ───────────────────────────
    if page_info.page_type == PageType.TEXT:
        return PageContent(
            page_number=pn,
            page_type=PageType.TEXT,
            text_content=_clean_text(page_info.extracted_text),
            vlm_description="",
            has_visual=False,
            processing_note="Direct text extraction",
        )

    # ── IMAGE pages: full VLM description ─────────────────────────────────
    if page_info.page_type == PageType.IMAGE:
        img_path = rasterized.get(pn)
        if not img_path:
            return PageContent(
                page_number=pn,
                page_type=PageType.IMAGE,
                text_content="",
                vlm_description="*[Page image unavailable — rasterization failed]*",
                has_visual=True,
                processing_note="Rasterization failed",
            )

        if verbose:
            console.print(f"  [yellow]→ VLM (full) page {pn}[/yellow]")

        vlm_out = describe_page_image(img_path, pn, mode="full")
        return PageContent(
            page_number=pn,
            page_type=PageType.IMAGE,
            text_content="",
            vlm_description=vlm_out,
            has_visual=True,
            processing_note=f"VLM: {__import__('config').VLM_MODEL}",
        )

    # ── MIXED pages: text + VLM for visuals ───────────────────────────────
    if page_info.page_type == PageType.MIXED:
        img_path = rasterized.get(pn)
        vlm_out = ""

        if img_path:
            if verbose:
                console.print(f"  [blue]→ VLM (visuals only) page {pn}[/blue]")
            vlm_out = describe_page_image(img_path, pn, mode="visuals_only")

        return PageContent(
            page_number=pn,
            page_type=PageType.MIXED,
            text_content=_clean_text(page_info.extracted_text),
            vlm_description=vlm_out,
            has_visual=True,
            processing_note="Text + VLM for visuals",
        )

    # Fallback
    return PageContent(
        page_number=pn,
        page_type=page_info.page_type,
        text_content=page_info.extracted_text,
        vlm_description="",
        has_visual=False,
        processing_note="Fallback",
    )


def _clean_text(text: str) -> str:
    """Basic cleanup of extracted text — remove excessive blank lines."""
    if not text:
        return ""
    lines = text.splitlines()
    cleaned = []
    prev_blank = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not prev_blank:
                cleaned.append("")
            prev_blank = True
        else:
            cleaned.append(stripped)
            prev_blank = False
    return "\n".join(cleaned).strip()
