"""
parser/vlm_client.py

Sends rasterized page images to Groq's Llama 4 Vision model and returns
a rich textual description suitable for exam preparation.
"""

import base64
import time
from pathlib import Path

from groq import Groq
from rich.console import Console

import config

console = Console()
_client: Groq | None = None


def set_api_key(api_key: str) -> None:
    """Update API key and reset client so future calls use fresh credentials."""
    global _client
    config.GROQ_API_KEY = api_key.strip()
    _client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not config.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY is not set.\n"
                "Add it to your .env file: GROQ_API_KEY=gsk_..."
            )
        _client = Groq(api_key=config.GROQ_API_KEY)
    return _client


# ─── Prompts ──────────────────────────────────────────────────────────────────

FULL_PAGE_PROMPT = """\
You are an expert academic tutor analyzing a page from a study document.

This page contains visual content (diagram, figure, chart, scanned text, or a mix).

Your task is to produce a COMPLETE and DETAILED description for exam preparation purposes. Include:

1. **All visible text** — transcribe every word exactly as written (headings, labels, captions, annotations).
2. **Diagrams & figures** — describe in detail: what type (flowchart, anatomy diagram, circuit, graph, etc.), what it depicts, all labeled components, arrows, relationships, and any key values.
3. **Tables** — reproduce the full table content in markdown format.
4. **Mathematical equations or formulas** — write them out clearly.
5. **Key concepts highlighted** — bold the most important terms.

Format your response as structured markdown. Start directly with the content — no preamble like "This page shows...".

If the page has a diagram that would be useful to redraw while studying, end with:
> 📌 **Study tip:** This page contains a diagram worth drawing by hand for better retention.
"""

MIXED_VISUAL_PROMPT = """\
You are an academic tutor. A page of study material has been provided — it has extractable text AND visual elements (diagrams, charts, figures).

The extracted text is already available. Your job is to describe ONLY the visual elements (diagrams, figures, charts, illustrations) found on the page — not the text.

For each visual:
- State what type of visual it is
- Describe all components, labels, and relationships in detail
- Note what concept it illustrates
- If it contains data (graph/chart), describe the trends or values

Format as markdown. If you see a diagram worth drawing during revision, add:
> 📌 **Study tip:** This diagram is worth drawing by hand for better retention.
"""


# ─── Core API call ────────────────────────────────────────────────────────────

def describe_page_image(
    image_path: str,
    page_number: int,
    mode: str = "full",  # "full" or "visuals_only"
) -> str:
    """
    Send a rasterized page image to Groq Llama 4 Vision.
    Returns a markdown string with the full description.

    mode:
      "full"         → transcribe everything (for IMAGE pages)
      "visuals_only" → describe diagrams/figures only (for MIXED pages)
    """
    prompt = FULL_PAGE_PROMPT if mode == "full" else MIXED_VISUAL_PROMPT

    image_data = _encode_image(image_path)
    client = get_client()

    for attempt in range(1, config.MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=config.VLM_MODEL,
                max_tokens=config.VLM_MAX_TOKENS,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                },
                            },
                            {
                                "type": "text",
                                "text": prompt,
                            },
                        ],
                    }
                ],
            )
            result = response.choices[0].message.content or ""
            return result.strip()

        except Exception as e:
            error_text = str(e)
            if "invalid_api_key" in error_text.lower() or "invalid api key" in error_text.lower():
                raise RuntimeError(
                    f"Invalid API key provided for page {page_number}."
                ) from e

            if attempt < config.MAX_RETRIES:
                console.print(
                    f"  [yellow]⚠ Groq API error on page {page_number} "
                    f"(attempt {attempt}/{config.MAX_RETRIES}): {e}. Retrying...[/yellow]"
                )
                time.sleep(config.RETRY_DELAY_SECONDS * attempt)
            else:
                console.print(
                    f"  [red]✗ Failed to process page {page_number} after "
                    f"{config.MAX_RETRIES} attempts: {e}[/red]"
                )
                return f"*[VLM processing failed for page {page_number}: {e}]*"


def _encode_image(image_path: str) -> str:
    """Read image file and return base64-encoded string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")
