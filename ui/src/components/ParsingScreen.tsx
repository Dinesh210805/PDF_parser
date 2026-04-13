import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Pause, Play, Square, CheckCircle2, FileText, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Progress } from './ui/Progress';
import type { ParseJobResponse } from '../lib/api';

interface ParsingScreenProps {
  jobStatus: ParseJobResponse | null;
}

export function ParsingScreen({ jobStatus }: ParsingScreenProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [frozenStatus, setFrozenStatus] = useState<ParseJobResponse | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused) {
      setFrozenStatus(jobStatus);
    }
  }, [jobStatus, isPaused]);

  const visibleStatus = isPaused && frozenStatus ? frozenStatus : jobStatus;
  const progress = visibleStatus?.progress ?? 0;
  const logs = visibleStatus?.logs ?? [];
  const stats = visibleStatus?.stats ?? {
    totalPages: 0,
    textPages: 0,
    imagePages: 0,
    mixedPages: 0,
  };
  const isComplete = visibleStatus?.status === 'completed';
  const isFailed = visibleStatus?.status === 'failed';

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-4xl mx-auto pt-32 px-4"
    >
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center">
            {isComplete ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <CheckCircle2 className="w-6 h-6 mr-3 text-white" />
              </motion.div>
            ) : (
              <Loader2 className="w-6 h-6 mr-3 text-white animate-spin" />
            )}
            {isComplete ? 'Parsing Complete' : isFailed ? 'Parsing Failed' : 'Processing Document'}
          </h2>
          <p className="text-zinc-400 mt-2 text-sm font-light">
            {visibleStatus?.message || 'Waiting for parser worker...'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)} disabled={isComplete}>
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon" disabled>
            <Square className="w-4 h-4 fill-current" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<FileText className="w-5 h-5 text-zinc-400" />} title="Text Pages" value={stats.textPages} delay={0.1} />
        <StatCard icon={<ImageIcon className="w-5 h-5 text-zinc-400" />} title="Image/Scanned" value={stats.imagePages} delay={0.2} />
        <StatCard icon={<LayoutTemplate className="w-5 h-5 text-zinc-400" />} title="Mixed/Diagrams" value={stats.mixedPages} delay={0.3} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="mb-8 relative overflow-hidden group">
          <CardContent className="p-8 relative z-10">
            <div className="flex justify-between text-sm font-medium mb-4">
              <span className="text-zinc-400">Overall Progress</span>
              <motion.span 
                key={Math.floor(progress)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white"
              >
                {Math.floor(progress)}%
              </motion.span>
            </div>
            <Progress value={progress} />
            
            <div className="flex gap-2 mt-8 overflow-x-auto pb-2 scrollbar-hide">
              <StatusChip active={progress > 0} done={progress > 20} label="Analyzing PDF" />
              <StatusChip active={progress > 20} done={progress > 55} label="Rasterizing" />
              <StatusChip active={progress > 55} done={progress > 85} label="VLM Extraction" />
              <StatusChip active={progress > 85} done={progress >= 100} label="Building Markdown" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="bg-[#050505] border-white/5 text-zinc-400 font-mono text-sm overflow-hidden">
          <div className="flex items-center px-6 py-4 bg-white/[0.02] border-b border-white/5">
            <div className="flex space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            </div>
            <span className="ml-4 text-xs text-zinc-500 font-medium tracking-wide">parser.log</span>
          </div>
          <CardContent className="p-6 h-64 overflow-y-auto relative">
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  key={i} 
                  className="mb-2 flex items-start"
                >
                  <span className="text-zinc-600 mr-4 shrink-0">[{new Date().toISOString().split('T')[1].substring(0,8)}]</span>
                  <span className={log.includes('Error') ? 'text-red-400' : log.includes('completed') ? 'text-white' : 'text-zinc-300'}>
                    {log}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon, title, value, delay }: { icon: React.ReactNode, title: string, value: number, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
      className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center space-x-4 backdrop-blur-xl transition-colors cursor-default"
    >
      <div className="p-3 bg-white/5 rounded-2xl border border-white/5">{icon}</div>
      <div>
        <p className="text-xs text-zinc-500 font-medium">{title}</p>
        <motion.p 
          key={value}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring" }}
          className="text-2xl font-semibold text-white"
        >
          {value}
        </motion.p>
      </div>
    </motion.div>
  );
}

function StatusChip({ active, done, label }: { active: boolean, done: boolean, label: string }) {
  return (
    <motion.div 
      layout
      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-500 border ${
        done ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' :
        active ? 'bg-white/10 text-white border-white/30' :
        'bg-transparent text-zinc-600 border-white/5'
      }`}
    >
      {label}
    </motion.div>
  );
}
