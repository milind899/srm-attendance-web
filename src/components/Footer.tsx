
import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full py-8 text-center animate-fade-in mt-12 mb-20 md:mb-8">
            <div className="container mx-auto px-4 flex flex-col items-center gap-2 group cursor-default">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase transition-all duration-300 group-hover:text-primary/80 group-hover:tracking-[0.3em]">
                    Disclaimer
                </span>
                <p className="text-white/30 text-xs leading-relaxed max-w-xl mx-auto transition-all duration-300 group-hover:text-white/90 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                    This site is under active development. Attendance and marks data may not be 100% accurate or up-to-date. Please verify on the official portal.
                </p>
            </div>

            <div className="mt-6 flex justify-center gap-4 text-[10px] text-white/10 font-mono">
                <span>AttendX v0.1.0</span>
                <span>•</span>
                <span>Built for SRMites</span>
            </div>
        </footer>
    );
};

export default Footer;
