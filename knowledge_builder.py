"""
output/knowledge_builder.py

Assembles all processed page content into a structured Markdown
knowledge base optimised for exam preparation with AI.
"""

import os
from datetime import datetime
from pathlib import Path

from page_processor import PageContent
from pdf_analyzer import PageType
import config


def build_knowledge_base(
    pages: list[PageContent],
    pdf_path: str,
    output_path: str,
) -> str:
    """
    Build the final Markdown knowledge base from processed page content.
    Returns the path of the written file.
    """
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)

    pdf_name = Path(pdf_path).stem
    visual_pages = [p for p in pages if p.has_visual]

    lines: list[str] = []

    # ── Header ────────────────────────────────────────────────────────────────
    lines += [
        f"# 📚 Knowledge Base: {pdf_name}",
        "",
        f"> Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} using Groq Llama 4 Vision",
        f"> Source: `{Path(pdf_path).name}`  |  Total pages: {len(pages)}",
        "",
        "---",
        "",
    ]

    # ── Stats box ─────────────────────────────────────────────────────────────
    text_count  = sum(1 for p in pages if p.page_type == PageType.TEXT)
    image_count = sum(1 for p in pages if p.page_type == PageType.IMAGE)
    mixed_count = sum(1 for p in pages if p.page_type == PageType.MIXED)

    lines += [
        "## 📊 Document Overview",
        "",
        f"| Type | Pages | Processing |",
        f"|------|-------|------------|",
        f"| 📝 Text-only | {text_count} | Direct extraction |",
        f"| 🖼 Image/Scanned | {image_count} | Llama 4 Vision (VLM) |",
        f"| 📋 Mixed | {mixed_count} | Text + VLM for visuals |",
        "",
    ]

    # ── Visual pages index ────────────────────────────────────────────────────
    if visual_pages and config.INCLUDE_TOC:
        lines += [
            "## 🗺 Pages with Diagrams / Images",
            "",
            "*Quick reference — pages containing visual content processed by VLM:*",
            "",
        ]
        for p in visual_pages:
            icon = "🖼" if p.page_type == PageType.IMAGE else "📋"
            lines.append(
                f"- {icon} [Page {p.page_number}](#page-{p.page_number}) "
                f"— `{p.processing_note}`"
            )
        lines += ["", "---", ""]

    # ── Per-page content ──────────────────────────────────────────────────────
    lines += [
        "## 📖 Full Content",
        "",
    ]

    for page in pages:
        lines += _render_page(page)

    # ── Study tips footer ─────────────────────────────────────────────────────
    lines += [
        "---",
        "",
        "## 💡 How to Use This Knowledge Base with AI",
        "",
        "Paste this entire document to an AI assistant and use prompts like:",
        "",
        '- *"Explain the diagram on page X in simple terms"*',
        '- *"Quiz me on the key concepts from pages 1–10"*',
        '- *"What are the most important topics to study from this material?"*',
        '- *"Create flashcards for all the labeled diagrams in this document"*',
        '- *"Which pages have diagrams I should draw by hand?"*',
        "",
        "> Pages marked with 📌 contain diagrams worth drawing by hand for better retention.",
        "",
    ]

    content = "\n".join(lines)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    return output_path


def _render_page(page: PageContent) -> list[str]:
    """Render a single page as a markdown section."""
    lines: list[str] = []

    # Page header with anchor
    anchor = f"page-{page.page_number}"
    icon = {"text": "📝", "image": "🖼", "mixed": "📋"}[page.page_type.value]

    lines += [
        f'<a id="{anchor}"></a>',
        f"### {icon} Page {page.page_number}",
        "",
        f"*[{page.processing_note}]*",
        "",
    ]

    # ── TEXT page ──────────────────────────────────────────────────────────
    if page.page_type == PageType.TEXT:
        if page.text_content:
            lines += [page.text_content, ""]
        else:
            lines += ["*[No text content extracted from this page]*", ""]

    # ── IMAGE page ─────────────────────────────────────────────────────────
    elif page.page_type == PageType.IMAGE:
        lines += [
            f"> 📌 **Page {page.page_number} is a visual page** "
            f"(scanned/image). See VLM description below.",
            "",
        ]
        if page.vlm_description:
            lines += [page.vlm_description, ""]
        else:
            lines += ["*[No VLM description available]*", ""]

    # ── MIXED page ─────────────────────────────────────────────────────────
    elif page.page_type == PageType.MIXED:
        if page.text_content:
            lines += [
                "#### 📝 Extracted Text",
                "",
                page.text_content,
                "",
            ]

        if page.vlm_description:
            lines += [
                f"#### 🖼 Visual Elements (Page {page.page_number})",
                "",
                f"> 📌 **This page contains diagrams/figures on page {page.page_number}.** "
                f"VLM description:",
                "",
                page.vlm_description,
                "",
            ]

    lines += ["---", ""]
    return lines
