import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { UploadScreen } from './components/UploadScreen';
import { ParsingScreen } from './components/ParsingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { SettingsModal } from './components/SettingsModal';
import {
  fetchParseJob,
  fetchParseResult,
  startParseJob,
  type ParseJobResponse,
  type ParseJobResult,
} from './lib/api';

type Step = 'welcome' | 'upload' | 'parsing' | 'results';
const LEGACY_API_KEY_STORAGE_KEY = 'pdf_parser_api_key';

export default function App() {
  const [step, setStep] = useState<Step>('welcome');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ParseJobResponse | null>(null);
  const [parseResult, setParseResult] = useState<ParseJobResult | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isPollingRef = useRef(false);
  const resultLoadedForJobRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      // Clear any previously persisted key from older app versions.
      window.localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  const handleStartParsing = async (file: File) => {
    setIsStarting(true);
    setUploadError(null);
    setParseResult(null);
    resultLoadedForJobRef.current = null;

    try {
      const createdJob = await startParseJob({
        file,
        apiKey: apiKey || undefined,
      });
      setActiveJobId(createdJob.jobId);
      setJobStatus(createdJob);
      setStep('parsing');
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Failed to start parse job.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleRestart = () => {
    setStep('welcome');
    setActiveJobId(null);
    setJobStatus(null);
    setParseResult(null);
    setUploadError(null);
    resultLoadedForJobRef.current = null;
  };

  useEffect(() => {
    if (step !== 'parsing' || !activeJobId) {
      return;
    }

    let isCancelled = false;

    const pollJob = async () => {
      if (isCancelled || isPollingRef.current) {
        return;
      }

      isPollingRef.current = true;
      try {
        const latestStatus = await fetchParseJob(activeJobId);
        if (isCancelled) {
          return;
        }

        setJobStatus(latestStatus);

        if (latestStatus.status === 'completed' && resultLoadedForJobRef.current !== activeJobId) {
          try {
            resultLoadedForJobRef.current = activeJobId;
            const result = await fetchParseResult(activeJobId);
            if (isCancelled) {
              return;
            }
            setParseResult(result);
            setStep('results');
            return;
          } catch (error) {
            // Keep polling when result retrieval fails transiently.
            resultLoadedForJobRef.current = null;
            setJobStatus((prev) => {
              if (!prev) {
                return prev;
              }
              const retryMessage =
                error instanceof Error
                  ? `Waiting for result: ${error.message}`
                  : 'Waiting for result...';
              const nextLogs =
                prev.logs[prev.logs.length - 1] === retryMessage
                  ? prev.logs
                  : [...prev.logs, retryMessage].slice(-200);
              return {
                ...prev,
                message: retryMessage,
                logs: nextLogs,
              };
            });
          }
        }

        if (latestStatus.status === 'failed') {
          setUploadError(latestStatus.error || 'Parsing failed. Please try again.');
          setStep('upload');
        }
      } catch (error) {
        if (!isCancelled) {
          setJobStatus((prev) => {
            if (!prev) {
              return prev;
            }
            const warning =
              error instanceof Error
                ? `Connection issue: ${error.message}`
                : 'Connection issue. Retrying...';
            const nextLogs =
              prev.logs[prev.logs.length - 1] === warning
                ? prev.logs
                : [...prev.logs, warning].slice(-200);
            return {
              ...prev,
              message: warning,
              logs: nextLogs,
            };
          });
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    pollJob();
    const timerId = window.setInterval(pollJob, 1500);

    return () => {
      isCancelled = true;
      window.clearInterval(timerId);
    };
  }, [activeJobId, step]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 selection:text-white overflow-x-hidden">
      
      {/* Minimal Header */}
      {step !== 'results' && step !== 'welcome' && (
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 w-full h-20 flex items-center justify-between px-8 z-40 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm"
        >
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setStep('welcome')}>
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <div className="w-2 h-2 rounded-full bg-black" />
            </div>
            <span className="font-medium tracking-tight text-sm">Knowledge Parser</span>
          </div>
          
          {/* Stepper indicator */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-4 text-xs font-medium text-zinc-500">
            <span className={`transition-colors duration-500 ${step === 'upload' ? 'text-white' : ''}`}>Upload</span>
            <span className="w-4 h-[1px] bg-white/10" />
            <span className={`transition-colors duration-500 ${step === 'parsing' ? 'text-white' : ''}`}>Parse</span>
          </div>

          <div className="relative group">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            </button>
            <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              Set API Key here
              <div className="absolute -top-1 right-3 w-2 h-2 bg-white rotate-45" />
            </div>
          </div>
        </motion.header>
      )}

      {/* Settings Icon for Welcome Screen */}
      {step === 'welcome' && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="fixed top-8 right-8 z-50 relative group"
        >
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all backdrop-blur-md"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          </button>
          <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            Set API Key here
            <div className="absolute -top-1 right-4 w-2 h-2 bg-white rotate-45" />
          </div>
        </motion.div>
      )}

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {step === 'welcome' && <WelcomeScreen key="welcome" onNext={() => setStep('upload')} />}
          {step === 'upload' && (
            <UploadScreen 
              key="upload" 
              onStart={handleStartParsing}
              apiKey={apiKey}
              openSettings={() => setIsSettingsOpen(true)}
              isStarting={isStarting}
              errorMessage={uploadError}
            />
          )}
          {step === 'parsing' && <ParsingScreen key="parsing" jobStatus={jobStatus} />}
          {step === 'results' && parseResult && activeJobId && (
            <ResultsScreen
              key="results"
              onRestart={handleRestart}
              jobId={activeJobId}
              sourceFileName={parseResult.sourceFileName}
              markdown={parseResult.markdown}
              stats={jobStatus?.stats ?? null}
              selectedPageNumbers={parseResult.selectedPageNumbers ?? jobStatus?.selectedPageNumbers ?? []}
            />
          )}
        </AnimatePresence>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={apiKey}
        setApiKey={setApiKey}
      />
    </div>
  );
}
