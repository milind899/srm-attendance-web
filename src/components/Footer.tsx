
import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full py-8 text-center animate-fade-in mt-12 mb-20 md:mb-8">
            <div className="container mx-auto px-4 flex flex-col items-center gap-2 group cursor-default">
                {/* Disclaimer removed as per user request */}
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
