import { useEffect, useState } from 'react';
import { DecryptText } from './DecryptText';
import { Loader2, ShieldCheck, Terminal, Wifi } from 'lucide-react';

const LOADING_MESSAGES = [
    "Connecting to SRM Academia...",
    "Authenticating credentials...",
    "Navigating to secured portal...",
    "Accessing attendance records...",
    "Analyzing course data...",
    "Calculating attendance percentages...",
    "Extracting internal marks...",
    "Finalizing data synchronization...",
    "Almost there..."
];

export default function LoginLoader() {
    const [progress, setProgress] = useState(0);
    const [messageDisplay, setMessageDisplay] = useState(LOADING_MESSAGES[0]);
    const [msgIndex, setMsgIndex] = useState(0);

    // Progress bar animation (approx 40s total)
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return prev; // Hold at 95% until done
                // Accelerate at start, slow down at end
                const increment = prev < 30 ? 2 : prev < 70 ? 0.8 : 0.3;
                return Math.min(prev + increment, 99);
            });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Message cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex(prev => {
                const next = (prev + 1) % LOADING_MESSAGES.length;
                setMessageDisplay(LOADING_MESSAGES[next]);
                return next;
            });
        }, 3000); // Change message every 3s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-sm animate-in fade-in zoom-in duration-500">
            {/* Cyber Icon */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                <div className="relative w-20 h-20 bg-[#0B0C0E] border border-primary/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(94,106,210,0.2)]">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <div className="absolute bottom-1 right-1">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                    </div>
                </div>
            </div>

            {/* Status Text */}
            <div className="h-8 mb-2 flex items-center gap-2 text-sm font-mono text-primary/80">
                <Terminal className="w-4 h-4" />
                <span className="typing-cursor">
                    {messageDisplay}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-surfaceHighlight rounded-full overflow-hidden border border-white/5 relative">
                <div
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-blue-500 transition-all duration-300 ease-out relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                </div>
            </div>

            <div className="w-full flex justify-between mt-2 text-[10px] text-textMuted font-mono uppercase tracking-widest">
                <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-green-500" />
                    Link Stable
                </span>
                <span>{Math.round(progress)}% Processed</span>
            </div>

            {/* Hacker decoration */}
            <div className="mt-8 grid grid-cols-4 gap-2 w-full opacity-30">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-1 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
            </div>
        </div>
    );
}

// Add shimmer animation to global css or inline here
const styles = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
`;
