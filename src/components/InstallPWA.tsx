'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA({ minimal = false }: { minimal?: boolean }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    if (!deferredPrompt || isInstalled) return null;

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
