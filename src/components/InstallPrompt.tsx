'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Check if already installed (standalone)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Check if dismissed recently (cooldown: 24h)
        const lastDismissal = localStorage.getItem('installPromptDismissed');
        if (lastDismissal && Date.now() - parseInt(lastDismissal) < 24 * 60 * 60 * 1000) {
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS, show instructions after a delay if not installed
        if (isIosDevice && !isStandalone && !lastDismissal) {
            setTimeout(() => setIsVisible(true), 3000);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('installPromptDismissed', Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="bg-[#09090b]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-0.5 shadow-lg">
                            <img src="/logo.png" alt="AttendX" className="w-full h-full object-cover rounded-[10px]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Install AttendX</h3>
                            <p className="text-xs text-textMuted leading-snug max-w-[200px]">
                                Add to Home Screen for the best experience.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-full hover:bg-white/10 text-white/40 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isIOS ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-textMuted bg-white/5 p-3 rounded-xl">
                            <Share className="w-5 h-5 text-blue-400" />
                            <span>1. Tap <span className="text-white font-medium">Share</span> in menu bar</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-textMuted bg-white/5 p-3 rounded-xl">
                            <span className="w-5 h-5 flex items-center justify-center font-bold text-white bg-white/20 rounded-md text-xs">+</span>
                            <span>2. Select <span className="text-white font-medium">Add to Home Screen</span></span>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2.5 text-sm font-medium text-textMuted hover:text-white transition-colors"
                        >
                            Maybe Later
                        </button>
                        <button
                            onClick={handleInstall}
                            className="flex-1 py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Download className="w-4 h-4" />
                            Install App
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
