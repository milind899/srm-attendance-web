'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA({ minimal = false }: { minimal?: boolean }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else if (isIOS) {
            alert("To install on iOS: Tap the Share button below and select 'Add to Home Screen'.");
        } else {
            alert("To install: Look for 'Add to Home Screen' in your browser menu.");
        }
    };

    // Show button if:
    // 1. We have a prompt (Android/Desktop)
    // 2. OR we are on iOS (Manual)
    const shouldShow = deferredPrompt || isIOS;

    if (!shouldShow || isInstalled) return null;

    if (minimal) {
        return (
            <button
                onClick={handleInstallClick}
                className="p-2 text-textMuted hover:text-white transition-colors"
                title="Install App"
            >
                <Download size={20} />
            </button>
        );
    }

    return (
        <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors border border-primary/20"
        >
            <Download size={16} />
            Install App
        </button>
    );
}
