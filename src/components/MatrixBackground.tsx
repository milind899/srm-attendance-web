'use client';

import { useEffect, useRef } from 'react';

interface MatrixBackgroundProps {
    className?: string;
}

export const MatrixBackground: React.FC<MatrixBackgroundProps> = ({ className = '' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Matrix characters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
        const fontSize = 14;
        const columns = Math.floor(canvas.width / fontSize);

        // Array to track y position of each column
        const drops: number[] = Array(columns).fill(1);

        // Drawing function
        const draw = () => {
            // Semi-transparent black to create fade effect
            ctx.fillStyle = 'rgba(11, 12, 14, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Green text
            ctx.fillStyle = 'rgba(94, 106, 210, 0.3)'; // Using primary color
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                // Random character
                const char = chars[Math.floor(Math.random() * chars.length)];

                // Draw character
                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                // Reset drop to top randomly after it reaches bottom
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
            style={{ opacity: 0.6 }}
        />
    );
};
