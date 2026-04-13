import React from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';

interface WelcomeScreenProps {
  onNext: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  }
};

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)', transition: { duration: 0.4 } }}
      variants={containerVariants}
      className="flex flex-col items-center justify-center min-h-screen max-w-5xl mx-auto text-center px-4 relative"
    >
      {/* Animated Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
        <div className="absolute inset-0 bg-white/[0.02] rounded-full blur-3xl animate-float" />
        <div className="absolute inset-20 bg-white/[0.01] rounded-full blur-3xl animate-float-delayed" />
      </div>
      
      <motion.div variants={itemVariants} className="relative">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-zinc-300 mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <span className="w-2 h-2 rounded-full bg-white mr-2 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
          Next-Gen VLM Extraction
        </div>
      </motion.div>
      
      <motion.h1 
        variants={itemVariants}
        className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-white mb-6 leading-[1.1] relative"
      >
        Parse documents <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">with precision.</span>
      </motion.h1>
      
      <motion.p 
        variants={itemVariants}
        className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl font-light relative"
      >
        Transform static PDFs into structured, machine-readable Markdown using Vision-Language Models. No complex setup, just pure results.
      </motion.p>

      <motion.div variants={itemVariants} className="relative z-10">
        <Button size="lg" onClick={onNext} className="text-base px-10 h-14 rounded-full">
          Start Parsing
        </Button>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden max-w-4xl w-full backdrop-blur-xl relative group"
      >
        {/* Subtle hover glow effect behind cards */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
        
        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }} className="bg-[#050505] p-8 transition-colors duration-500">
          <h3 className="font-medium text-white mb-2">VLM Extraction</h3>
          <p className="text-sm text-zinc-500">Intelligently parses complex tables and multi-column layouts with near-perfect accuracy.</p>
        </motion.div>
        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }} className="bg-[#050505] p-8 transition-colors duration-500">
          <h3 className="font-medium text-white mb-2">Visual Detection</h3>
          <p className="text-sm text-zinc-500">Automatically identifies and describes diagrams, charts, and embedded images.</p>
        </motion.div>
        <motion.div whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }} className="bg-[#050505] p-8 transition-colors duration-500">
          <h3 className="font-medium text-white mb-2">QA Comparison</h3>
          <p className="text-sm text-zinc-500">Side-by-side verification with confidence scoring and missing content detection.</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
