import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, RefreshCw, Settings2, ShieldCheck, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { fetchGroqModels, type GroqModelInfo } from '../lib/api';

export type PageRangePreset = 'all' | 'first5' | 'first10' | 'custom';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  visionModel: string;
  setVisionModel: (model: string) => void;
  dpi: number;
  setDpi: (dpi: number) => void;
  pageRangePreset: PageRangePreset;
  setPageRangePreset: (preset: PageRangePreset) => void;
  customPageRange: string;
  setCustomPageRange: (value: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  visionModel,
  setVisionModel,
  dpi,
  setDpi,
  pageRangePreset,
  setPageRangePreset,
  customPageRange,
  setCustomPageRange,
}: SettingsModalProps) {
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<GroqModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [multimodalFallback, setMultimodalFallback] = useState(false);
  const lastLoadedApiKeyRef = useRef('');
  const latestModelRequestIdRef = useRef(0);

  const modelOptions = useMemo(() => {
    const deduped = new Map<string, GroqModelInfo>();
    availableModels.forEach((model) => {
      deduped.set(model.id, model);
    });
    if (visionModel && !deduped.has(visionModel)) {
      deduped.set(visionModel, {
        id: visionModel,
        ownedBy: null,
        contextWindow: null,
        active: true,
        isMultimodal: true,
      });
    }
    return Array.from(deduped.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [availableModels, visionModel]);

  const loadModels = async (isConnectionTest = false) => {
    const requestId = latestModelRequestIdRef.current + 1;
    latestModelRequestIdRef.current = requestId;

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setModelError('Enter API key to load available models.');
      if (isConnectionTest) {
        setTestResult('error');
        setTestMessage('API key is required.');
      }
      return;
    }

    setIsLoadingModels(true);
    setModelError(null);
    if (isConnectionTest) {
      setIsTesting(true);
      setTestResult('idle');
      setTestMessage('');
    }

    try {
      const response = await fetchGroqModels(trimmedKey, true);
      if (requestId !== latestModelRequestIdRef.current) {
        return;
      }

      setAvailableModels(response.models);
      setMultimodalFallback(response.multimodalFallback);
      if (isConnectionTest) {
        setTestResult('success');
        setTestMessage('Connection successful');
      }
      lastLoadedApiKeyRef.current = trimmedKey;
    } catch (error) {
      if (requestId !== latestModelRequestIdRef.current) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to load models from Groq.';
      setModelError(message);
      if (isConnectionTest) {
        setTestResult('error');
        setTestMessage(message);
      }
    } finally {
      if (requestId === latestModelRequestIdRef.current) {
        setIsLoadingModels(false);
        if (isConnectionTest) {
          setIsTesting(false);
        }
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setAvailableModels([]);
      setModelError('Enter API key to load available models.');
      setMultimodalFallback(false);
      lastLoadedApiKeyRef.current = '';
      return;
    }

    if (trimmedKey === lastLoadedApiKeyRef.current) {
      return;
    }

    const debounceId = window.setTimeout(() => {
      void loadModels(false);
    }, 350);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [isOpen, apiKey]);

  const handleTest = async () => {
    await loadModels(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 px-4"
          >
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-xl font-semibold text-white tracking-tight">Settings</h2>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center text-sm font-medium text-white">
                    <Key className="w-4 h-4 mr-2 text-zinc-400" />
                    Groq API Key
                  </div>
                  <div className="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder="gsk_..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-20 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      {showKey ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-zinc-500">
                      <ShieldCheck className="w-4 h-4 mr-1 text-zinc-400" />
                      Session only (cleared on refresh).
                    </div>
                    <Button
                      variant="outline" 
                      size="sm" 
                      onClick={handleTest}
                      disabled={!apiKey || isTesting}
                    >
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                  
                  {testResult === 'success' && (
                    <p className="text-sm text-white font-medium mt-2 flex items-center"><span className="w-2 h-2 rounded-full bg-white mr-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]" /> {testMessage || 'Connection successful'}</p>
                  )}
                  {testResult === 'error' && (
                    <p className="text-sm text-red-400 font-medium mt-2 flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2" /> {testMessage || 'Connection failed'}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-sm font-medium text-white">
                    <Settings2 className="w-4 h-4 mr-2 text-zinc-400" />
                    Model Preferences
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400">Vision Model (multimodal)</label>
                        <button
                          type="button"
                          onClick={() => void loadModels(false)}
                          disabled={isLoadingModels || !apiKey.trim()}
                          className="inline-flex items-center text-xs text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingModels ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                      <select
                        value={visionModel}
                        onChange={(event) => setVisionModel(event.target.value)}
                        className="settings-select"
                        disabled={isLoadingModels || modelOptions.length === 0}
                      >
                        {modelOptions.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.id}
                          </option>
                        ))}
                      </select>
                      {modelError && <p className="text-xs text-amber-300">{modelError}</p>}
                      {multimodalFallback && (
                        <p className="text-xs text-zinc-500">
                          Multimodal filter was unavailable, showing all models returned by Groq.
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">DPI (Rasterization)</label>
                        <select
                          value={String(dpi)}
                          onChange={(event) => setDpi(Number.parseInt(event.target.value, 10))}
                          className="settings-select"
                        >
                          <option value="150">150 (Fast)</option>
                          <option value="180">180 (Balanced)</option>
                          <option value="300">300 (High Quality)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Page Range</label>
                        <select
                          value={pageRangePreset}
                          onChange={(event) => setPageRangePreset(event.target.value as PageRangePreset)}
                          className="settings-select"
                        >
                          <option value="all">All pages</option>
                          <option value="first5">First 5 pages</option>
                          <option value="first10">First 10 pages</option>
                          <option value="custom">Custom range</option>
                        </select>
                      </div>
                    </div>
                    {pageRangePreset === 'custom' && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Custom Range Expression</label>
                        <Input
                          placeholder="e.g. 1-5, 8, 12-14"
                          value={customPageRange}
                          onChange={(event) => setCustomPageRange(event.target.value)}
                          className="h-10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/5 flex justify-end">
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
