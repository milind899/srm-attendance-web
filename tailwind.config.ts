import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                background: '#0B0C0E',
                surface: '#141518',
                surfaceHighlight: '#1C1D21',
                border: '#2E2F33',
                primary: '#5E6AD2',
                primaryHover: '#4e5ac0',
                textMain: '#EEEEF0',
                textMuted: '#8A8F98',
                'accent-yellow': '#F5D90A',
            },
            backgroundImage: {
                'glow-gradient': 'radial-gradient(ellipse at center, rgba(94, 106, 210, 0.15) 0%, rgba(11, 12, 14, 0) 70%)',
                'feature-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
                'blur-in': 'blurIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'scale-in': 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'beam-descend': 'beamDescend 3s ease-out forwards',
                'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
                'smoke-rise': 'smokeRise 4s ease-in-out infinite',
                'smoke-rise-delayed': 'smokeRise 4s ease-in-out 2s infinite',
                'particle-rise': 'particleRise 2s linear infinite',
                'beam-pulse-heavy': 'beamPulseHeavy 3s ease-in-out infinite',
                'fly-out-left': 'flyOutLeft 2s ease-out infinite',
                'fly-out-right': 'flyOutRight 2s ease-out infinite',
                'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                blurIn: {
                    '0%': { opacity: '0', filter: 'blur(10px)', transform: 'translateY(10px) scale(0.98)' },
                    '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0) scale(1)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.98)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                beamDescend: {
                    '0%': { opacity: '0', transform: 'translateY(-100%) scaleY(0.5)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scaleY(1)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.4', transform: 'translate(-50%, -50%) scale(1)' },
                    '50%': { opacity: '0.8', transform: 'translate(-50%, -50%) scale(1.1)' },
                },
                smokeRise: {
                    '0%': { opacity: '0', transform: 'translate(-50%, 0) scale(1)' },
                    '30%': { opacity: '0.5' },
                    '100%': { opacity: '0', transform: 'translate(-50%, -100px) scale(1.5)' },
                },
                particleRise: {
                    '0%': { transform: 'translateY(0) scale(1)', opacity: '0' },
                    '20%': { opacity: '1' },
                    '100%': { transform: 'translateY(-200px) scale(0)', opacity: '0' },
                },
                beamPulseHeavy: {
                    '0%, 100%': { opacity: '0.6', width: '100%' },
                    '50%': { opacity: '1', width: '120%' },
                },
                flyOutLeft: {
                    '0%': { opacity: '1', transform: 'translate(0, 0)' },
                    '100%': { opacity: '0', transform: 'translate(-100px, -50px)' },
                },
                flyOutRight: {
                    '0%': { opacity: '1', transform: 'translate(0, 0)' },
                    '100%': { opacity: '0', transform: 'translate(100px, -50px)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
