# PDF Knowledge Parser 📚

Converts any PDF — including scanned pages, diagrams, and mixed content — into rich, AI-ready study material using **Groq Cloud + Llama 4 Vision**.

## How it works

| Page Type | Detection | Processing |
|---|---|---|
| Text-only | High char count, no raster images | `pdfplumber` direct extraction |
| Image/Scan | Low/no extractable text | Rasterized → Llama 4 Vision via Groq |
| Mixed (text + diagram) | Moderate text + embedded images | Both: text extracted + VLM describes visuals |

## Output

Generates a structured **Markdown knowledge base** (`output/knowledge_base.md`) with:

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your Groq API key
cp .env.example .env
# Edit .env and add your GROQ_API_KEY from https://console.groq.com

# 3. Run
python main.py --pdf your_textbook.pdf

# Options
python main.py --pdf notes.pdf --output my_notes.md --dpi 200 --verbose
```

## Run with the React UI

The project now includes a backend API that the UI can call directly.

1. Start the Python API server from the project root:

```bash
python api_server.py
```

2. In a separate terminal, start the UI:

```bash
cd ui
npm install
npm run dev
```

3. Open `http://localhost:3000`, upload a PDF, and parse.

### Optional UI backend URL override

By default, the UI calls `http://127.0.0.1:8000`. To change this, set:

```bash
VITE_BACKEND_URL=http://your-host:8000
```

when starting the UI.

## Deploy (Recommended Free Option)

Best free option for this repo: Render (Docker web service).

Why Render for this project:
- Runs a single Docker service, perfect for FastAPI + built React UI.
- `render.yaml` is already included for one-click setup.
- Free web plan is enough for demos and testing.

### Render deploy steps

1. Push your repository to GitHub.
2. In Render, create a new Blueprint deploy from your repo.
3. Render will detect `render.yaml` and configure the service.
4. Set `GROQ_API_KEY` in Render environment variables.
5. Deploy.

After deploy, your site and API are served from one domain:
- `/` -> React UI
- `/api/health` -> health endpoint

### Production environment variables

- `GROQ_API_KEY` (required)
- `API_HOST=0.0.0.0` (set by `render.yaml`)
- `API_PORT=8000` (set by `render.yaml`)

## Production Deployment (Recommended Free Option)

Best free website for this full-stack setup: **Render** (single Docker web service).

Why Render:
- Free web service tier supports Docker deploys.
- Works well for FastAPI + built Vite frontend in one service.
- Simple env var management for `GROQ_API_KEY`.

### Deployment files included

- `Dockerfile` — builds UI and runs FastAPI
- `render.yaml` — Render Blueprint config
- `.dockerignore` — avoids shipping local artifacts/secrets

### Deploy on Render

1. Push this repo to GitHub.
2. Open Render dashboard and create a new **Blueprint**.
3. Select this repo (Render detects `render.yaml`).
4. Set `GROQ_API_KEY` in Render environment variables.
5. Deploy.

After deployment, your app is available from one URL:
- API health: `/api/health`
- UI: `/`

## Requirements
- Python 3.9+
- poppler-utils installed (`sudo apt install poppler-utils` / `brew install poppler`)
- Groq API key (free tier available at console.groq.com)
