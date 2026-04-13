"""
main.py — PDF Knowledge Parser
Entry point. Run with: python main.py --pdf your_file.pdf
"""

import argparse
import os
import sys
import tempfile
import time
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule

import config
from pdf_analyzer import analyze_pdf, print_analysis_summary
from page_processor import process_all_pages
from knowledge_builder import build_knowledge_base

console = Console()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Parse a PDF into AI-ready study material using Groq Llama 4 Vision",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --pdf textbook.pdf
  python main.py --pdf notes.pdf --output my_notes.md --dpi 200
  python main.py --pdf slides.pdf --verbose
        """,
    )
    parser.add_argument(
        "--pdf",
        required=True,
        help="Path to the input PDF file",
    )
    parser.add_argument(
        "--output",
        default=None,
        help=f"Output markdown file (default: output/<pdf_name>_knowledge.md)",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=config.RASTERIZE_DPI,
        help=f"DPI for rasterizing image pages (default: {config.RASTERIZE_DPI})",
    )
    parser.add_argument(
        "--model",
        default=config.VLM_MODEL,
        help=f"Groq model to use (default: {config.VLM_MODEL})",
    )
    parser.add_argument(
        "--pages",
        default=None,
        help="Page range to process, e.g. '1-10' or '5,8,12' (default: all)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed per-page processing info",
    )
    parser.add_argument(
        "--analyze-only",
        action="store_true",
        help="Only analyze page types, don't call VLM or build output",
    )
    return parser.parse_args()


def resolve_page_range(spec: str | None, total: int) -> list[int] | None:
    """Parse page range string like '1-10' or '1,3,5' into list of ints."""
    if spec is None:
        return None
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            pages.update(range(int(start), int(end) + 1))
        else:
            pages.add(int(part))
    return sorted(p for p in pages if 1 <= p <= total)


def validate_environment():
    """Check that required tools and API key are present."""
    errors = []

    if not config.GROQ_API_KEY:
        errors.append(
            "GROQ_API_KEY not set. Add it to your .env file.\n"
            "  Get a free key at: https://console.groq.com"
        )

    try:
        import fitz
    except ImportError:
        errors.append("PyMuPDF not installed. Run: pip install pymupdf")

    try:
        import pdfplumber
    except ImportError:
        errors.append("pdfplumber not installed. Run: pip install pdfplumber")

    try:
        import groq
    except ImportError:
        errors.append("groq not installed. Run: pip install groq")

    if errors:
        console.print("\n[bold red]❌ Setup errors:[/bold red]")
        for e in errors:
            console.print(f"  • {e}")
        sys.exit(1)


def main():
    args = parse_args()

    # ── Banner ────────────────────────────────────────────────────────────────
    console.print(Panel.fit(
        "[bold cyan]📚 PDF Knowledge Parser[/bold cyan]\n"
        "[dim]Powered by Groq Cloud + Llama 4 Vision[/dim]",
        border_style="cyan",
    ))

    # ── Validate ──────────────────────────────────────────────────────────────
    if not os.path.isfile(args.pdf):
        console.print(f"[red]✗ File not found: {args.pdf}[/red]")
        sys.exit(1)

    if not args.analyze_only:
        validate_environment()

    # Apply CLI overrides to config
    config.RASTERIZE_DPI = args.dpi
    config.VLM_MODEL = args.model

    # Output path
    if args.output:
        output_path = args.output
    else:
        pdf_stem = Path(args.pdf).stem
        os.makedirs(config.OUTPUT_DIR, exist_ok=True)
        output_path = os.path.join(config.OUTPUT_DIR, f"{pdf_stem}_knowledge.md")

    console.print(f"\n[bold]PDF :[/bold] {args.pdf}")
    console.print(f"[bold]Out :[/bold] {output_path}")
    console.print(f"[bold]DPI :[/bold] {config.RASTERIZE_DPI}")
    console.print(f"[bold]VLM :[/bold] {config.VLM_MODEL}")

    start_time = time.time()

    # ── Step 1: Analyze pages ─────────────────────────────────────────────────
    console.print(Rule("\n[bold]Step 1 — Analyzing PDF[/bold]"))
    all_pages = analyze_pdf(args.pdf, verbose=args.verbose)
    print_analysis_summary(all_pages)

    # Apply page range filter if specified
    if args.pages:
        selected_nums = resolve_page_range(args.pages, len(all_pages))
        if selected_nums:
            all_pages = [p for p in all_pages if p.page_number in selected_nums]
            console.print(f"[dim]Filtered to {len(all_pages)} pages: {args.pages}[/dim]\n")

    if args.analyze_only:
        console.print("[yellow]--analyze-only flag set. Stopping after analysis.[/yellow]")
        return

    # ── Step 2: Process pages ─────────────────────────────────────────────────
    console.print(Rule("[bold]Step 2 — Processing Pages[/bold]"))

    with tempfile.TemporaryDirectory(prefix="pdf_parser_") as tmp_dir:
        processed = process_all_pages(
            pdf_path=args.pdf,
            pages=all_pages,
            tmp_dir=tmp_dir,
            verbose=args.verbose,
        )

    # ── Step 3: Build knowledge base ──────────────────────────────────────────
    console.print(Rule("[bold]Step 3 — Building Knowledge Base[/bold]"))
    console.print(f"\n[cyan]Writing markdown to:[/cyan] {output_path}")

    out = build_knowledge_base(
        pages=processed,
        pdf_path=args.pdf,
        output_path=output_path,
    )

    elapsed = time.time() - start_time
    size_kb = os.path.getsize(out) / 1024

    # ── Done ──────────────────────────────────────────────────────────────────
    console.print(Panel.fit(
        f"[bold green]✅ Done![/bold green]\n\n"
        f"Output  : [cyan]{out}[/cyan]\n"
        f"Size    : {size_kb:.1f} KB\n"
        f"Pages   : {len(processed)}\n"
        f"Time    : {elapsed:.1f}s",
        border_style="green",
        title="Knowledge Base Ready",
    ))

    console.print(
        "\n[bold]Next step:[/bold] Upload [cyan]" + output_path + "[/cyan] to your "
        "favourite AI (ChatGPT, Claude, etc.) and say:\n"
        '  [italic]"This is my study material. Teach me the key concepts '
        'and quiz me. When there are diagrams, tell me their page numbers '
        'so I can draw them."[/italic]\n'
    )


if __name__ == "__main__":
    main()
