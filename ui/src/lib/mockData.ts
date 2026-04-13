export const MOCK_LOGS = [
  "Initializing parsing engine...",
  "Loading PDF document (12 pages)...",
  "Analyzing document structure...",
  "Page 1: Extracting text layer...",
  "Page 1: Rasterizing for vision model...",
  "Page 2: Detected complex table, routing to VLM...",
  "Page 3: Extracting text layer...",
  "Page 4: Found 2 images, generating descriptions...",
  "Page 5: Extracting text layer...",
  "Page 6: Rasterizing diagram...",
  "Page 7: Extracting text layer...",
  "Page 8: Extracting text layer...",
  "Page 9: Detected mixed content...",
  "Page 10: Extracting text layer...",
  "Page 11: Extracting text layer...",
  "Page 12: Finalizing document structure...",
  "Aligning markdown segments...",
  "Running QA checks...",
  "Parsing complete. Ready for review."
];

export const MOCK_MARKDOWN = `
# The Future of Knowledge Extraction

## Abstract
This document explores the paradigm shift in document parsing, moving from traditional OCR to Vision-Language Models (VLMs).

## 1. Introduction
Historically, PDF parsing has been a lossy process. Tables break, diagrams are ignored, and reading order is often jumbled by multi-column layouts.

> "The PDF was designed for paper, not for data extraction."

## 2. Methodology
We propose a hybrid approach:
1. **Text Layer Extraction**: Fast and accurate for standard paragraphs.
2. **Vision Routing**: Complex pages are rasterized and sent to a VLM.

### 2.1 Architecture Diagram
![Architecture Flow](https://picsum.photos/seed/diagram/800/400)
*Figure 1: The hybrid parsing pipeline.*

## 3. Results
Our tests show a 94% improvement in table structure retention and a 100% success rate in capturing diagram semantics compared to legacy OCR.

| Metric | Legacy OCR | VLM Hybrid |
|--------|------------|------------|
| Text Accuracy | 98% | 99% |
| Table Structure | 42% | 96% |
| Image Context | 0% | 92% |

## 4. Conclusion
The integration of VLMs into document parsing pipelines represents a significant leap forward for knowledge management systems.
`;

export const MOCK_MISSING_ITEMS = [
  { id: 1, page: 2, type: "text", reason: "Low contrast watermark text ignored." },
  { id: 2, page: 6, type: "diagram", reason: "Small legend text unreadable." },
  { id: 3, page: 11, type: "image", reason: "Decorative footer image skipped." }
];
