import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Settings2, ShieldCheck, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export function SettingsModal({ isOpen, onClose, apiKey, setApiKey }: SettingsModalProps) {
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTest = () => {
    setIsTesting(true);
    setTestResult('idle');
    setTimeout(() => {
      setIsTesting(false);
      setTestResult(apiKey.length > 10 ? 'success' : 'error');
    }, 1500);
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
                    <p className="text-sm text-white font-medium mt-2 flex items-center"><span className="w-2 h-2 rounded-full bg-white mr-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]" /> Connection successful</p>
                  )}
                  {testResult === 'error' && (
                    <p className="text-sm text-red-400 font-medium mt-2 flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2" /> Invalid API key format</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center text-sm font-medium text-white">
                    <Settings2 className="w-4 h-4 mr-2 text-zinc-400" />
                    Model Preferences
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">Vision Model</label>
                      <select className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:border-white/30 transition-all appearance-none">
                        <option value="llama-3.2-90b-vision-preview">llama-3.2-90b-vision-preview</option>
                        <option value="llama-3.2-11b-vision-preview">llama-3.2-11b-vision-preview</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">DPI (Rasterization)</label>
                        <select className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:border-white/30 transition-all appearance-none">
                          <option>150 (Fast)</option>
                          <option selected>300 (Balanced)</option>
                          <option>600 (High Quality)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-400">Page Range</label>
                        <Input placeholder="e.g. 1-5, 8" defaultValue="All" className="h-10" />
                      </div>
                    </div>
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
