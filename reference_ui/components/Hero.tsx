import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { ButtonVariant } from '../types';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-16 px-6 overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-glow-gradient opacity-50 pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Announcement Badge */}
        <div className="opacity-0 animate-blur-in">
            <a href="#" className="mb-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-textMuted transition-colors hover:border-[#4B4E56] hover:text-textMain backdrop-blur-sm">
            <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Academia 2.0 is now available
            </span>
            <ChevronRight size={12} />
            </a>
        </div>

        {/* Headline */}
        <h1 className="opacity-0 animate-blur-in delay-100 text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#EEEEF0] via-[#EEEEF0] to-[#EEEEF0]/60 mb-8 leading-[1] md:leading-[0.92]">
          The new standard for <br className="hidden md:block" />
          modern research.
        </h1>

        {/* Subheadline */}
        <p className="opacity-0 animate-blur-in delay-200 text-lg md:text-xl text-textMuted max-w-2xl mb-12 leading-relaxed tracking-tight">
          Academia is a purpose-built workflow tool for high-performance labs. 
          Manage grants, citations, and experiments without the friction.
        </p>

        {/* CTA Buttons */}
        <div className="opacity-0 animate-blur-in delay-300 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Button variant={ButtonVariant.PRIMARY} className="w-full sm:w-auto h-12 px-8 text-base" icon={<ArrowRight size={16} />}>
            Start researching
          </Button>
          <Button variant={ButtonVariant.SECONDARY} className="w-full sm:w-auto h-12 px-8 text-base">
            Introduction video
          </Button>
        </div>

        {/* Hero Image / Product Shot */}
        <div className="opacity-0 animate-blur-in delay-500 mt-20 relative w-full max-w-6xl rounded-lg border border-border/40 bg-surfaceHighlight/30 p-2 shadow-2xl backdrop-blur-sm transform-gpu">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
          <img 
            src="https://picsum.photos/1400/900" 
            alt="App Interface" 
            className="rounded-md w-full h-auto opacity-90 grayscale-[20%] hover:grayscale-0 transition-all duration-700 block"
          />
           {/* Floating elements to simulate depth */}
           <div className="absolute -right-8 top-12 hidden lg:block p-4 bg-[#1C1D21] border border-[#2E2F33] rounded-lg shadow-2xl max-w-xs animate-pulse-slow">
             <div className="flex items-center gap-3 mb-2">
               <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
               <span className="text-xs text-textMuted font-medium">Grant Approved</span>
             </div>
             <div className="h-2 w-32 bg-border/80 rounded mb-1"></div>
             <div className="h-2 w-20 bg-border/50 rounded"></div>
           </div>
        </div>

      </div>
    </section>
  );
};
