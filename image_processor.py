"""
parser/image_processor.py

Rasterizes PDF pages to images using PyMuPDF (no poppler dependency needed).
Falls back to pdftoppm if PyMuPDF rasterization fails.
"""

import os
import tempfile
from pathlib import Path

import fitz  # PyMuPDF
from rich.console import Console

import config

console = Console()


def rasterize_page(pdf_path: str, page_number: int, tmp_dir: str) -> str | None:
    """
    Rasterize a single PDF page (1-based) to a JPEG image.
    Returns the path to the saved image, or None on failure.

    Uses PyMuPDF for fast, dependency-free rendering.
    """
    output_path = os.path.join(tmp_dir, f"page_{page_number:04d}.jpg")

    try:
        doc = fitz.open(pdf_path)
        page = doc[page_number - 1]  # 0-based index

        # Scale matrix for desired DPI (default PDF DPI is 72)
        scale = config.RASTERIZE_DPI / 72.0
        mat = fitz.Matrix(scale, scale)

        pix = page.get_pixmap(matrix=mat, alpha=False)

        # Save as JPEG (smaller than PNG, good enough for VLM)
        pix.save(output_path, jpg_quality=90)
        
        # Explicit PyMuPDF memory cleanup
        pix = None
        page = None
        doc.close()
        return output_path

    except Exception as e:
        console.print(f"  [red]✗ Failed to rasterize page {page_number}: {e}[/red]")
        return None


def rasterize_pages_batch(
    pdf_path: str,
    page_numbers: list[int],
    tmp_dir: str,
    verbose: bool = False,
) -> dict[int, str]:
    """
    Rasterize multiple pages at once.
    Returns dict: {page_number → image_path}
    Opens the PDF once for efficiency.
    """
    results: dict[int, str] = {}

    try:
        doc = fitz.open(pdf_path)
        scale = config.RASTERIZE_DPI / 72.0
        mat = fitz.Matrix(scale, scale)

        for page_num in page_numbers:
            output_path = os.path.join(tmp_dir, f"page_{page_num:04d}.jpg")
            try:
                page = doc[page_num - 1]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                pix.save(output_path, jpg_quality=90)
                results[page_num] = output_path

                # Explicitly free memory for PyMuPDF objects
                # which allocates C/C++ memory outside Python's heap
                pix = None
                page = None

                if verbose:
                    console.print(
                        f"  [dim]Rasterized page {page_num} → "
                        f"{Path(output_path).name}[/dim]"
                    )
            except Exception as e:
                console.print(
                    f"  [yellow]⚠ Could not rasterize page {page_num}: {e}[/yellow]"
                )

        doc.close()

    except Exception as e:
        console.print(f"  [red]✗ Failed to open PDF for rasterization: {e}[/red]")

    return results
