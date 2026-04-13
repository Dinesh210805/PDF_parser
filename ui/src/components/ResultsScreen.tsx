import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Download, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, LayoutTemplate, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';
import {
  buildApiUrl,
  buildMarkdownDownloadUrl,
  buildPdfDownloadUrl,
  fetchPageImages,
  type ParseJobStats,
} from '../lib/api';

interface ResultsScreenProps {
  onRestart: () => void;
  jobId: string;
  sourceFileName: string;
  markdown: string;
  stats: ParseJobStats | null;
  selectedPageNumbers: number[];
}

interface MissingItem {
  id: number;
  page: number;
  type: 'text' | 'diagram' | 'image';
  reason: string;
}

interface MarkdownPageSection {
  pageNumber: number;
  content: string;
}

const MISSING_ITEMS: MissingItem[] = [];

function extractMarkdownPageSections(markdown: string): MarkdownPageSection[] {
  const sections: MarkdownPageSection[] = [];
  const pattern = /<a id="page-(\d+)"><\/a>\s*\n### [^\n]*\n([\s\S]*?)(?=\n<a id="page-\d+"><\/a>\s*\n### |\n---\n\n## 💡|$)/g;

  let match: RegExpExecArray | null = pattern.exec(markdown);
  while (match) {
    const pageNumber = Number.parseInt(match[1], 10);
    const content = match[2]?.trim() ?? '';
    if (!Number.isNaN(pageNumber)) {
      sections.push({ pageNumber, content: content || '*No content extracted for this page.*' });
    }
    match = pattern.exec(markdown);
  }

  return sections;
}

export function ResultsScreen({
  onRestart,
  jobId,
  sourceFileName,
  markdown,
  stats,
  selectedPageNumbers,
}: ResultsScreenProps) {
  const [showMissing, setShowMissing] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(selectedPageNumbers[0] ?? 1);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [pageLoadError, setPageLoadError] = useState<string | null>(null);

  const pdfScrollRef = useRef<HTMLDivElement | null>(null);
  const markdownScrollRef = useRef<HTMLDivElement | null>(null);
  const pdfPageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const markdownPageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const syncLockRef = useRef(false);
  const navSyncUnlockTimerRef = useRef<number | null>(null);
  const pendingMirrorEventRef = useRef<{ source: 'pdf' | 'markdown'; pageNumber: number } | null>(null);

  const markdownSections = useMemo(() => extractMarkdownPageSections(markdown), [markdown]);
  const markdownByPage = useMemo(() => {
    const map = new Map<number, string>();
    markdownSections.forEach((section) => {
      map.set(section.pageNumber, section.content);
    });
    return map;
  }, [markdownSections]);

  const pagesInOrder = useMemo(() => {
    if (selectedPageNumbers.length > 0) {
      return [...selectedPageNumbers].sort((a, b) => a - b);
    }
    if (markdownSections.length > 0) {
      return markdownSections.map((section) => section.pageNumber).sort((a, b) => a - b);
    }
    const fallbackTotal = Math.max(stats?.totalPages ?? 1, 1);
    return Array.from({ length: fallbackTotal }, (_, index) => index + 1);
  }, [selectedPageNumbers, markdownSections, stats]);

  const totalPages = pagesInOrder.length;
  const currentIndex = Math.max(0, pagesInOrder.indexOf(currentPage));

  useEffect(() => {
    if (!pagesInOrder.includes(currentPage)) {
      setCurrentPage(pagesInOrder[0] ?? 1);
    }
  }, [currentPage, pagesInOrder]);

  useEffect(() => {
    let isCancelled = false;

    const loadPageImages = async () => {
      setIsLoadingPages(true);
      setPageLoadError(null);

      try {
        const response = await fetchPageImages(jobId);
        if (isCancelled) {
          return;
        }

        const nextImages: Record<number, string> = {};
        response.pages.forEach((page) => {
          nextImages[page.pageNumber] = buildApiUrl(page.imageUrl);
        });
        setPageImages(nextImages);
      } catch (error) {
        if (!isCancelled) {
          setPageLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load PDF preview pages.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPages(false);
        }
      }
    };

    loadPageImages();

    return () => {
      isCancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    const pageForElement = (target: Element, refs: Record<number, HTMLDivElement | null>): number | null => {
      for (const pageNumber of pagesInOrder) {
        if (refs[pageNumber] === target) {
          return pageNumber;
        }
      }
      return null;
    };

    const releaseSyncLockSoon = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          syncLockRef.current = false;
        });
      });
    };

    const syncToPage = (source: 'pdf' | 'markdown', pageNumber: number) => {
      if (syncLockRef.current) {
        return;
      }

      setCurrentPage(pageNumber);
      const targetRefs = source === 'pdf' ? markdownPageRefs.current : pdfPageRefs.current;
      const targetElement = targetRefs[pageNumber];
      if (!targetElement) {
        return;
      }

      syncLockRef.current = true;
      pendingMirrorEventRef.current = {
        source: source === 'pdf' ? 'markdown' : 'pdf',
        pageNumber,
      };
      targetElement.scrollIntoView({ behavior: 'auto', block: 'start' });
      releaseSyncLockSoon();
    };

    const createObserver = (
      container: HTMLDivElement | null,
      refs: Record<number, HTMLDivElement | null>,
      source: 'pdf' | 'markdown'
    ) => {
      if (!container) {
        return null;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (syncLockRef.current) {
            return;
          }
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));

          const top = visible[0];
          if (!top) {
            return;
          }

          const pageNumber = pageForElement(top.target, refs);
          if (pageNumber === null) {
            return;
          }

          const pending = pendingMirrorEventRef.current;
          if (pending && pending.source === source && pending.pageNumber === pageNumber) {
            pendingMirrorEventRef.current = null;
            return;
          }

          syncToPage(source, pageNumber);
        },
        {
          root: container,
          threshold: [0, 0.1, 0.25],
          rootMargin: '-45% 0px -45% 0px',
        }
      );

      pagesInOrder.forEach((pageNumber) => {
        const element = refs[pageNumber];
        if (element) {
          observer.observe(element);
        }
      });

      return observer;
    };

    const pdfObserver = createObserver(pdfScrollRef.current, pdfPageRefs.current, 'pdf');
    const markdownObserver = createObserver(markdownScrollRef.current, markdownPageRefs.current, 'markdown');

    return () => {
      if (pdfObserver) {
        pdfObserver.disconnect();
      }
      if (markdownObserver) {
        markdownObserver.disconnect();
      }
      syncLockRef.current = false;
    };
  }, [pagesInOrder, pageImages, markdownByPage]);

  const scrollToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const pdfElement = pdfPageRefs.current[pageNumber];
    const markdownElement = markdownPageRefs.current[pageNumber];
    if (!pdfElement || !markdownElement) {
      return;
    }

    syncLockRef.current = true;
    pendingMirrorEventRef.current = null;
    pdfElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    markdownElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (navSyncUnlockTimerRef.current !== null) {
      window.clearTimeout(navSyncUnlockTimerRef.current);
    }
    navSyncUnlockTimerRef.current = window.setTimeout(() => {
      syncLockRef.current = false;
    }, 700);
  };

  const handlePrevPage = () => {
    if (currentIndex <= 0) {
      return;
    }
    scrollToPage(pagesInOrder[currentIndex - 1]);
  };

  const handleNextPage = () => {
    if (currentIndex >= totalPages - 1) {
      return;
    }
    scrollToPage(pagesInOrder[currentIndex + 1]);
  };

  const handleDownloadMarkdown = () => {
    window.open(buildMarkdownDownloadUrl(jobId), '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPdf = () => {
    window.open(buildPdfDownloadUrl(jobId), '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQaReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      sourceFileName,
      totalPages,
      stats,
      missingItems: MISSING_ITEMS,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sourceFileName.replace(/\.pdf$/i, '')}_qa_report.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex flex-col bg-[#000000] text-white overflow-hidden"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="h-16 bg-[#050505] border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-10"
      >
        <div className="flex items-center space-x-4">
          <h1 className="text-sm font-medium text-white">{sourceFileName}</h1>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center space-x-2 text-xs font-medium">
            <span className="flex items-center text-white bg-white/10 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Completed
            </span>
            <button
              onClick={() => setShowMissing(!showMissing)}
              className={`flex items-center px-2.5 py-1 rounded-full transition-all duration-300 ${showMissing ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> {MISSING_ITEMS.length} Missing Items
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleDownloadQaReport} className="rounded-full">
            <Download className="w-3.5 h-3.5 mr-2" /> QA Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="rounded-full">
            <Download className="w-3.5 h-3.5 mr-2" /> PDF
          </Button>
          <Button size="sm" onClick={handleDownloadMarkdown} className="rounded-full">
            <Download className="w-3.5 h-3.5 mr-2" /> Markdown
          </Button>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <Button variant="ghost" size="sm" onClick={onRestart} className="text-zinc-400 hover:text-white rounded-full">
            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Parse Another
          </Button>
        </div>
      </motion.header>

      <div className="flex-1 flex overflow-hidden relative">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
          className="w-1/2 border-r border-white/10 bg-[#050505] flex flex-col relative"
        >
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full flex items-center space-x-4 z-10 shadow-2xl">
            <button
              onClick={handlePrevPage}
              disabled={currentIndex <= 0}
              className="p-1 hover:bg-white/10 rounded-full disabled:opacity-50 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-white">
              Page {currentPage} ({currentIndex + 1}/{Math.max(totalPages, 1)})
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentIndex >= totalPages - 1}
              className="p-1 hover:bg-white/10 rounded-full disabled:opacity-50 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div ref={pdfScrollRef} className="flex-1 overflow-auto p-8 pt-24 space-y-8">
            {isLoadingPages && (
              <div className="text-zinc-400 text-sm">Loading PDF pages...</div>
            )}

            {pageLoadError && (
              <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
                {pageLoadError}
              </div>
            )}

            {pagesInOrder.map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(element) => {
                  pdfPageRefs.current[pageNumber] = element;
                }}
                className={`mx-auto w-full max-w-[640px] rounded-2xl border transition-all ${currentPage === pageNumber ? 'border-white/30 shadow-[0_0_24px_rgba(255,255,255,0.08)]' : 'border-white/10'}`}
              >
                <div className="px-4 py-2 border-b border-white/10 text-xs text-zinc-400">
                  Original PDF • Page {pageNumber}
                </div>
                {pageImages[pageNumber] ? (
                  <img
                    src={pageImages[pageNumber]}
                    alt={`PDF page ${pageNumber}`}
                    className="w-full h-auto bg-white rounded-b-2xl"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="aspect-[1/1.414] rounded-b-2xl bg-white/5 flex items-center justify-center text-zinc-500 text-sm">
                    Rendering preview for page {pageNumber}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
          className="w-1/2 bg-[#000000] flex flex-col relative"
        >
          <div className="h-12 bg-[#050505] border-b border-white/10 flex items-center px-6 text-xs font-medium text-zinc-500 shrink-0">
            Markdown Preview (synced with PDF pages)
          </div>
          <div ref={markdownScrollRef} className="flex-1 overflow-auto p-8 space-y-8">
            {pagesInOrder.map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(element) => {
                  markdownPageRefs.current[pageNumber] = element;
                }}
                className={`rounded-2xl border p-6 transition-all ${currentPage === pageNumber ? 'border-white/30 bg-white/[0.03]' : 'border-white/10 bg-transparent'}`}
              >
                <h3 className="text-sm font-medium text-white mb-4">Markdown • Page {pageNumber}</h3>
                <div className="prose prose-invert prose-zinc max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-a:text-white prose-code:text-zinc-300 prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl">
                  <Markdown>
                    {markdownByPage.get(pageNumber) ?? '*No markdown section found for this page.*'}
                  </Markdown>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {showMissing && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 bottom-0 w-96 bg-[#0a0a0a] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-medium text-white flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 mr-2 text-zinc-400" /> Missing Content
                </h3>
                <button onClick={() => setShowMissing(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {MISSING_ITEMS.map((item, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: -4 }}
                    key={item.id}
                    className="p-5 border border-white/10 bg-white/5 rounded-2xl transition-transform"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium px-2.5 py-1 bg-white/10 rounded-full text-white">Page {item.page}</span>
                      {item.type === 'text' && <FileText className="w-4 h-4 text-zinc-500" />}
                      {item.type === 'diagram' && <LayoutTemplate className="w-4 h-4 text-zinc-500" />}
                      {item.type === 'image' && <ImageIcon className="w-4 h-4 text-zinc-500" />}
                    </div>
                    <p className="text-sm text-zinc-300 mb-5 leading-relaxed">{item.reason}</p>
                    <Button variant="outline" size="sm" className="w-full text-xs rounded-full">
                      Queue Fix
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
