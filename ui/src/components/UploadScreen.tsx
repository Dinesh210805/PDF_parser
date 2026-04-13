import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, File, X, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

interface UploadScreenProps {
  onStart: (file: File) => Promise<void>;
  apiKey: string;
  openSettings: () => void;
  isStarting: boolean;
  errorMessage: string | null;
}

export function UploadScreen({ onStart, apiKey, openSettings, isStarting, errorMessage }: UploadScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPdfFile = (candidate: File) => {
    if (candidate.type === 'application/pdf') {
      return true;
    }
    return candidate.name.toLowerCase().endsWith('.pdf');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (isPdfFile(droppedFile)) {
        setFile(droppedFile);
        setLocalError(null);
      } else {
        setLocalError('Please upload a valid PDF file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (!isPdfFile(selected)) {
        setLocalError('Please upload a valid PDF file.');
        e.target.value = '';
        return;
      }
      setFile(selected);
      setLocalError(null);
      // Allow selecting the same file again if needed.
      e.target.value = '';
    }
  };

  const openFilePicker = () => {
    if (isStarting) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleParseClick = async () => {
    if (!file || isStarting) {
      return;
    }
    if (!apiKey.trim()) {
      setLocalError('Set your API key in Settings before parsing.');
      openSettings();
      return;
    }
    await onStart(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto pt-32 px-4 relative"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="text-center mb-12 relative z-10">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-3xl font-semibold tracking-tight text-white mb-3"
        >
          Upload Document
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-zinc-400 font-light"
        >
          Select a PDF file to begin the extraction process.
        </motion.p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10">
        <Card 
          className="overflow-hidden border border-white/10 transition-all duration-500 relative group" 
          style={{ 
            borderColor: isDragging ? 'rgba(255,255,255,0.4)' : undefined, 
            backgroundColor: isDragging ? 'rgba(255,255,255,0.08)' : undefined,
            transform: isDragging ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          {/* Animated dashed border effect on hover/drag */}
          <div className={`absolute inset-0 border-2 border-dashed rounded-3xl pointer-events-none transition-opacity duration-300 ${isDragging ? 'border-white/30 opacity-100' : 'border-white/10 opacity-0 group-hover:opacity-100'}`} />

          <CardContent className="p-0 relative z-10">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload-zone"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-24 px-6 cursor-pointer"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openFilePicker();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <motion.div 
                    animate={{ y: isDragging ? -10 : 0, scale: isDragging ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  >
                    <UploadCloud className="w-6 h-6 text-white" />
                  </motion.div>
                  <p className="text-base font-medium text-white mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-zinc-500">PDF files only (max 50MB)</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="p-8"
                >
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <File className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                        <p className="text-sm text-zinc-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • Est. 12 pages
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
          </CardContent>
        </Card>
      </motion.div>

      <div className="mt-8 flex flex-col items-end space-y-4 relative z-10">
        <AnimatePresence>
          {localError && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-center text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.1)]"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {localError}
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {errorMessage}
              {!apiKey && (
                <button onClick={openSettings} className="ml-1 underline hover:text-red-300">Set API key</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="w-full sm:w-auto">
          <Button
            size="lg"
            disabled={!file || isStarting}
            onClick={handleParseClick}
            className="w-full sm:w-auto group"
          >
            {isStarting ? 'Starting...' : 'Parse Document'}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
