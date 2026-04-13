"""
config.py — Central configuration for PDF Knowledge Parser
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── Groq / LLM Settings ──────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Llama 4 Scout — fast, multimodal, great for diagrams
# Alternatives: "meta-llama/llama-4-maverick-17b-128e-instruct" (smarter, slower)
VLM_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# Max tokens for VLM page description
VLM_MAX_TOKENS = 1024

# Max tokens for text summarization/cleaning pass (optional)
TEXT_CLEANUP_MAX_TOKENS = 512

# ─── PDF Processing Settings ──────────────────────────────────────────────────

# DPI for rasterizing pages (150 = fast, 200 = balanced, 300 = high quality)
RASTERIZE_DPI = 180

# A page is "text-rich" if it has at least this many characters extractable
TEXT_CHAR_THRESHOLD = 100

# A page is "image-heavy" if the text/area ratio is below this (chars per sq point)
TEXT_DENSITY_THRESHOLD = 0.05

# If a page has fewer chars than TEXT_CHAR_THRESHOLD AND has embedded images → VLM
# If a page has decent text but also images → MIXED mode (text + VLM for images)
# If a page is pure text → TEXT mode only

# ─── Output Settings ──────────────────────────────────────────────────────────

OUTPUT_DIR = "output"
DEFAULT_OUTPUT_FILENAME = "knowledge_base.md"

# Include a table of contents at the top of the knowledge base
INCLUDE_TOC = True

# Add page number anchors for cross-referencing
ADD_PAGE_ANCHORS = True

# ─── Retry Settings ───────────────────────────────────────────────────────────

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2.0
