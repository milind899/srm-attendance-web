import React, { useEffect, useState } from 'react';

export const Loader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading time
    const duration = 2200;
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400); // Slight delay at 100% before transition
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0C0E] transition-opacity duration-500">
      <div className="w-[300px] max-w-[80vw] flex flex-col gap-4">
         {/* Top labels */}
         <div className="flex justify-between items-end text-[10px] font-mono text-textMuted uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              Booting System
            </span>
            <span>{Math.floor(progress)}%</span>
         </div>

         {/* Progress Bar Container */}
         <div className="relative h-[2px] w-full bg-[#2E2F33] overflow-hidden rounded-full">
            {/* The filling bar */}
            <div 
              className="absolute left-0 top-0 h-full bg-[#EEEEF0] shadow-[0_0_15px_rgba(238,238,240,0.5)] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
            {/* Leading glow head */}
            <div 
               className="absolute top-0 h-full w-[20px] bg-gradient-to-r from-transparent to-white opacity-80"
               style={{ left: `${progress}%`, transform: 'translateX(-100%)' }}
            />
         </div>

         {/* Bottom status text that cycles */}
         <div className="h-4 overflow-hidden relative">
            <div className="text-[10px] text-[#4B4E56] font-mono text-center w-full absolute transition-all duration-300 transform" 
                 style={{ opacity: progress < 30 ? 1 : 0, transform: `translateY(${progress < 30 ? 0 : -10}px)` }}>
              Loading Modules...
            </div>
            <div className="text-[10px] text-[#4B4E56] font-mono text-center w-full absolute transition-all duration-300 transform" 
                 style={{ opacity: progress >= 30 && progress < 70 ? 1 : 0, transform: `translateY(${progress >= 30 && progress < 70 ? 0 : (progress < 30 ? 10 : -10)}px)` }}>
              Verifying Dependencies...
            </div>
            <div className="text-[10px] text-[#4B4E56] font-mono text-center w-full absolute transition-all duration-300 transform" 
                 style={{ opacity: progress >= 70 ? 1 : 0, transform: `translateY(${progress >= 70 ? 0 : 10}px)` }}>
              Establishing Uplink...
            </div>
         </div>
      </div>
    </div>
  );
};