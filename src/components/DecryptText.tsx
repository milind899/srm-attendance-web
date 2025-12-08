'use client';

import { useState, useEffect, useCallback } from 'react';

interface DecryptTextProps {
    text: string;
    className?: string;
    speed?: number; // ms per character
    delay?: number; // initial delay
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export const DecryptText: React.FC<DecryptTextProps> = ({
    text,
    className = '',
    speed = 50,
    delay = 0
}) => {
    const [displayText, setDisplayText] = useState(text);
    const [isDecrypting, setIsDecrypting] = useState(false);

    const decrypt = useCallback(() => {
        setIsDecrypting(true);
        let iteration = 0;
        const maxIterations = text.length;

        const interval = setInterval(() => {
            setDisplayText(
                text
                    .split('')
                    .map((char, index) => {
                        if (char === ' ') return ' ';
                        if (index < iteration) return text[index];
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join('')
            );

            iteration += 1 / 3;

            if (iteration >= maxIterations) {
                clearInterval(interval);
                setDisplayText(text);
                setIsDecrypting(false);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    useEffect(() => {
        const timeout = setTimeout(decrypt, delay);
        return () => clearTimeout(timeout);
    }, [decrypt, delay]);

    return (
        <span className={`font-mono ${className}`}>
            {displayText.split('').map((char, i) => (
                <span
                    key={i}
                    className={char !== text[i] ? 'text-primary' : ''}
                >
                    {char}
                </span>
            ))}
        </span>
    );
};
