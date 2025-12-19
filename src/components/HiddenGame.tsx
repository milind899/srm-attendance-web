'use client';

import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, Zap, Shield, Minimize2, Video } from 'lucide-react';

interface HiddenGameProps {
    onClose: () => void;
}

type PowerupType = 'GHOST' | 'SHRINK' | 'SLOW';

export function HiddenGame({ onClose }: HiddenGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scoreDisplay, setScoreDisplay] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOverDisplay, setGameOverDisplay] = useState(false);
    const [gameStartedDisplay, setGameStartedDisplay] = useState(false);
    const [activePowerupDisplay, setActivePowerupDisplay] = useState<{ type: PowerupType, timeLeft: number } | null>(null);
    const [resetCount, setResetCount] = useState(0);

    // Refs for mutable game state
    const gameState = useRef({
        score: 0,
        gameOver: false,
        gameStarted: false,
        frames: 0
    });

    const student = useRef({
        x: 50,
        y: 300,
        velocity: 0,
        radius: 20,
        rotation: 0
    });

    const activePowerup = useRef<{
        type: PowerupType;
        timeLeft: number; // Frames
    } | null>(null);

    const pipes = useRef<{ x: number; topHeight: number; passed: boolean }[]>([]);
    const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

    // Input lock
    const inputLocked = useRef(true);

    useEffect(() => {
        const stored = localStorage.getItem('flappyHighScore');
        if (stored) setHighScore(parseInt(stored));
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let unlockTimer: NodeJS.Timeout;

        // Reset
        gameState.current = { score: 0, gameOver: false, gameStarted: false, frames: 0 };
        pipes.current = [];
        particles.current = [];
        activePowerup.current = null;
        student.current.velocity = 0;
        setActivePowerupDisplay(null);

        inputLocked.current = true;
        unlockTimer = setTimeout(() => inputLocked.current = false, 500);

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (!gameState.current.gameStarted) {
                student.current.y = canvas.height / 2;
                student.current.x = canvas.width < 500 ? 50 : 100;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        // --- BALANCED PHYSICS ---
        const GRAVITY = 0.5;
        const JUMP = -8;
        const BASE_SPEED = 3.5;
        const SPAWN_RATE = 120;
        const GAP_SIZE = 220;

        const loop = () => {
            ctx.fillStyle = '#0B0C0E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const state = gameState.current;
            const stud = student.current;
            const pipeList = pipes.current;
            const parts = particles.current;
            const powerup = activePowerup.current;

            // Apply Powerup Effects
            let currentRecall = stud.radius;
            let currentSpeed = BASE_SPEED;
            let isGhost = false;

            if (powerup) {
                powerup.timeLeft--;
                if (powerup.timeLeft <= 0) {
                    activePowerup.current = null;
                    setActivePowerupDisplay(null);
                } else {
                    // Sync display every 60 frames (1s) to avoid excessive re-renders
                    if (powerup.timeLeft % 60 === 0) {
                        setActivePowerupDisplay({ type: powerup.type, timeLeft: Math.ceil(powerup.timeLeft / 60) });
                    }

                    if (powerup.type === 'SHRINK') currentRecall = 12; // Tiny!
                    if (powerup.type === 'SLOW') currentSpeed = 2;     // Matrix mode
                    if (powerup.type === 'GHOST') isGhost = true;      // Imposter
                }
            }

            // --- WAITING ---
            if (!state.gameStarted) {
                stud.y = canvas.height / 2 + Math.sin(state.frames * 0.05) * 10;
                drawScene(ctx, canvas, stud, pipeList, parts, 0, isGhost, currentRecall);
                state.frames++;
                if (!state.gameOver) animationFrameId = requestAnimationFrame(loop);
                return;
            }

            // --- GAME OVER ---
            if (state.gameOver) {
                drawScene(ctx, canvas, stud, pipeList, parts, Math.PI / 2, false, 20);
                return;
            }

            // --- PLAYING ---

            // Physics
            stud.velocity += GRAVITY;
            if (stud.velocity > 10) stud.velocity = 10;
            stud.y += stud.velocity;

            // Rotation
            stud.rotation = Math.min(Math.PI / 4, Math.max(-0.5, (stud.velocity * 0.1)));

            // Particles Trail
            if (state.frames % 5 === 0) {
                parts.push({
                    x: stud.x - 10,
                    y: stud.y,
                    vx: -2 - Math.random(),
                    vy: (Math.random() - 0.5) * 2,
                    life: 20,
                    color: powerup ? '#FCD34D' : '#fff' // Gold trail if powerup
                });
            }

            // Update Particles
            for (let i = parts.length - 1; i >= 0; i--) {
                parts[i].x += parts[i].vx;
                parts[i].y += parts[i].vy;
                parts[i].life--;
                if (parts[i].life <= 0) parts.splice(i, 1);
            }

            state.frames++;

            // Spawn Pipes
            // Adjust spawn rate based on speed so gaps are consistent
            const effectiveSpawnRate = powerup?.type === 'SLOW' ? 180 : SPAWN_RATE;

            if (state.frames > 100 && state.frames % effectiveSpawnRate === 0) {
                const minHeight = 100;
                const maxHeight = canvas.height - GAP_SIZE - minHeight;
                const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
                pipeList.push({ x: canvas.width, topHeight: height, passed: false });
            }

            // Move Pipes
            for (let i = pipeList.length - 1; i >= 0; i--) {
                const p = pipeList[i];
                p.x -= currentSpeed;

                // Score Logic
                if (!p.passed && p.x + 50 < stud.x) {
                    state.score++;
                    p.passed = true;
                    setScoreDisplay(state.score);

                    // POWERUP TRIGGER (Every 10 points)
                    if (state.score > 0 && state.score % 10 === 0) {
                        triggerPowerup();
                    }
                }

                if (p.x < -60) pipeList.splice(i, 1);

                // Collision
                if (!isGhost) {
                    const inPipeX = stud.x + currentRecall > p.x && stud.x - currentRecall < p.x + 50;
                    if (inPipeX) {
                        if ((stud.y - currentRecall < p.topHeight) || (stud.y + currentRecall > p.topHeight + GAP_SIZE)) {
                            triggerGameOver();
                        }
                    }
                }
            }

            // Floor/Ceiling
            if (stud.y + currentRecall > canvas.height || stud.y - currentRecall < 0) {
                triggerGameOver();
            }

            drawScene(ctx, canvas, stud, pipeList, parts, stud.rotation, isGhost, currentRecall);
            animationFrameId = requestAnimationFrame(loop);
        };

        const triggerPowerup = () => {
            const types: PowerupType[] = ['GHOST', 'SHRINK', 'SLOW'];
            const type = types[Math.floor(Math.random() * types.length)];
            const duration = 600; // 10 seconds @ 60fps

            activePowerup.current = { type, timeLeft: duration };
            setActivePowerupDisplay({ type, timeLeft: 10 });
        };

        const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, stud: any, pipes: any[], parts: any[], rot: number, isGhost: boolean, radius: number) => {
            // Particles
            parts.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 20;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // Pipes
            ctx.lineWidth = 3;
            pipes.forEach(p => {
                ctx.fillStyle = '#22C55E'; ctx.strokeStyle = '#14532d';
                ctx.fillRect(p.x, 0, 50, p.topHeight); ctx.strokeRect(p.x, 0, 50, p.topHeight);
                ctx.fillStyle = '#16a34a'; // Cap
                ctx.fillRect(p.x - 2, p.topHeight - 20, 54, 20); ctx.strokeRect(p.x - 2, p.topHeight - 20, 54, 20);

                const bottomY = p.topHeight + GAP_SIZE;
                ctx.fillStyle = '#22C55E';
                ctx.fillRect(p.x, bottomY, 50, canvas.height - bottomY); ctx.strokeRect(p.x, bottomY, 50, canvas.height - bottomY);
                ctx.fillStyle = '#16a34a'; // Cap
                ctx.fillRect(p.x - 2, bottomY, 54, 20); ctx.strokeRect(p.x - 2, bottomY, 54, 20);
            });

            // Active Powerup visual aura
            if (activePowerup.current) {
                ctx.save();
                ctx.translate(stud.x, stud.y);
                const type = activePowerup.current.type;
                ctx.fillStyle = type === 'GHOST' ? 'rgba(59, 130, 246, 0.3)' :
                    type === 'SHRINK' ? 'rgba(168, 85, 247, 0.3)' :
                        'rgba(34, 197, 94, 0.3)';
                ctx.beginPath();
                ctx.arc(0, 0, radius + 15 + Math.sin(gameState.current.frames * 0.2) * 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Student
            ctx.save();
            ctx.translate(stud.x, stud.y);
            ctx.rotate(rot);
            if (isGhost) ctx.globalAlpha = 0.5;

            // Adjust emoji size based on radius
            const fontSize = radius * 2;
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧑‍🎓', 0, 0);

            ctx.restore();
            ctx.globalAlpha = 1.0;

            // Ground
            ctx.fillStyle = '#333'; ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
        };

        const triggerGameOver = () => {
            // Screen shake effect could go here
            gameState.current.gameOver = true;
            setGameOverDisplay(true);
            setActivePowerupDisplay(null);
            activePowerup.current = null;

            setHighScore(prev => {
                const newHigh = Math.max(prev, gameState.current.score);
                localStorage.setItem('flappyHighScore', newHigh.toString());
                return newHigh;
            });
        };

        const handleInput = (e: Event) => {
            e.stopPropagation();
            if (e.type === 'keydown') e.preventDefault();
            if (inputLocked.current || gameState.current.gameOver) return;

            if (!gameState.current.gameStarted) {
                gameState.current.gameStarted = true;
                setGameStartedDisplay(true);
            }
            student.current.velocity = JUMP;

            // Spawn jump particles
            for (let i = 0; i < 5; i++) {
                particles.current.push({
                    x: student.current.x,
                    y: student.current.y + 10,
                    vx: (Math.random() - 0.5) * 4,
                    vy: 2 + Math.random() * 2,
                    life: 15,
                    color: '#fff'
                });
            }
        };

        const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') handleInput(e); };
        const onTouch = (e: TouchEvent) => {
            if (e.cancelable) e.preventDefault();
            if ((e.target as HTMLElement).closest('button')) return;
            handleInput(e);
        };
        const onClick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('button')) return;
            handleInput(e);
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('touchstart', onTouch, { passive: false });
        window.addEventListener('mousedown', onClick);

        loop();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('touchstart', onTouch);
            window.removeEventListener('mousedown', onClick);
            cancelAnimationFrame(animationFrameId);
            clearTimeout(unlockTimer);
        };
    }, [resetCount]); // Re-mount on reset

    const resetGame = () => {
        setScoreDisplay(0);
        setGameOverDisplay(false);
        setGameStartedDisplay(false);
        setActivePowerupDisplay(null);
        setResetCount(c => c + 1);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black select-none touch-none font-sans">
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* Top Bar */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-2">
                    <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white animate-fade-in-down">
                        <div className="text-3xl font-black font-mono">{scoreDisplay}</div>
                        <div className="text-xs text-white/50 uppercase tracking-wider">Score</div>
                    </div>
                </div>

                {/* Powerup Display */}
                {activePowerupDisplay && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 animate-bounce-in">
                        <div className={`p-3 rounded-full shadow-lg shadow-white/10 ${activePowerupDisplay.type === 'GHOST' ? 'bg-blue-500' :
                                activePowerupDisplay.type === 'SHRINK' ? 'bg-purple-500' :
                                    'bg-green-500'
                            }`}>
                            {activePowerupDisplay.type === 'GHOST' && <Shield size={24} className="text-white animate-pulse" />}
                            {activePowerupDisplay.type === 'SHRINK' && <Minimize2 size={24} className="text-white animate-pulse" />}
                            {activePowerupDisplay.type === 'SLOW' && <Video size={24} className="text-white animate-pulse" />}
                        </div>
                        <div className="bg-black/60 backdrop-blur text-white px-3 py-1 rounded-full font-bold text-sm">
                            {activePowerupDisplay.type} {activePowerupDisplay.timeLeft}s
                        </div>
                    </div>
                )}

                <div className="flex gap-2 pointer-events-auto">
                    <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white text-right">
                        <div className="text-lg font-bold text-accent-yellow">{highScore}</div>
                        <div className="text-xs text-white/50">BEST</div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-xl text-red-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {(!gameStartedDisplay && !gameOverDisplay) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center animate-bounce">
                        <div className="text-7xl mb-6 drop-shadow-2xl">👆</div>
                        <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md">TAP TO FLY</h2>
                        <p className="text-lg text-textMuted bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">Powerups every 10 points!</p>
                    </div>
                </div>
            )}

            {gameOverDisplay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 animate-fade-in">
                    <div className="text-center p-8 bg-[#1A1825] border border-white/10 rounded-3xl max-w-sm w-full mx-4 shadow-2xl transform transition-all animate-scale-in">
                        <div className="text-6xl mb-4">💥</div>
                        <h2 className="text-4xl font-black text-white mb-2">CRASHED!</h2>
                        <div className="text-xl text-textMuted mb-8">Score: <span className="text-white font-bold">{scoreDisplay}</span></div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); resetGame(); }}
                                className="col-span-2 py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <RefreshCw size={22} /> TRY AGAIN
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="col-span-2 py-3 bg-white/5 hover:bg-white/10 text-textMuted hover:text-white rounded-xl font-medium transition-colors"
                            >
                                Give Up
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
const canvasRef = useRef<HTMLCanvasElement>(null);
const [scoreDisplay, setScoreDisplay] = useState(0);
const [highScore, setHighScore] = useState(0);
const [gameOverDisplay, setGameOverDisplay] = useState(false);
const [gameStartedDisplay, setGameStartedDisplay] = useState(false);
const [resetCount, setResetCount] = useState(0);

// Refs for mutable game state
const gameState = useRef({
    score: 0,
    gameOver: false,
    gameStarted: false,
    frames: 0
});

const student = useRef({
    x: 50,
    y: 300,
    velocity: 0,
    radius: 20
});

const pipes = useRef<{ x: number; topHeight: number; passed: boolean }[]>([]);

// Input lock ref
const inputLocked = useRef(true);

// Load High Score
useEffect(() => {
    const stored = localStorage.getItem('flappyHighScore');
    if (stored) setHighScore(parseInt(stored));
}, []);

// Game Logic
useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let unlockTimer: NodeJS.Timeout;

    // Reset state
    gameState.current = { score: 0, gameOver: false, gameStarted: false, frames: 0 };
    pipes.current = [];
    student.current.velocity = 0;

    // Initial Input Lock
    inputLocked.current = true;
    unlockTimer = setTimeout(() => {
        inputLocked.current = false;
    }, 500);

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (!gameState.current.gameStarted) {
            student.current.y = canvas.height / 2;
            student.current.x = canvas.width < 500 ? 50 : 100;
        }
    };
    window.addEventListener('resize', resize);
    resize();

    // --- SUPER EASY MODE ---
    const GRAVITY = 0.35;        // Feather-light
    const JUMP = -9;             // Strong lift
    const PIPE_SPEED = 2.2;      // Slow
    const PIPE_SPAWN_RATE = 150; // Spaced out
    const GAP_SIZE = 260;        // Huge gaps

    const loop = () => {
        ctx.fillStyle = '#0B0C0E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const state = gameState.current;
        const stud = student.current;
        const pipeList = pipes.current;

        // WAITING
        if (!state.gameStarted) {
            stud.y = canvas.height / 2 + Math.sin(state.frames * 0.05) * 10;
            // No rotation
            drawScene(ctx, canvas, stud, pipeList, 0);
            state.frames++;
            if (!state.gameOver) animationFrameId = requestAnimationFrame(loop);
            return;
        }

        // GAME OVER
        if (state.gameOver) {
            // Faceplant rotation
            drawScene(ctx, canvas, stud, pipeList, Math.PI / 2);
            return;
        }

        // PLAYING
        stud.velocity += GRAVITY;

        // Soft Cap velocity (prevent rock-fall)
        if (stud.velocity > 8) stud.velocity = 8;

        stud.y += stud.velocity;
        state.frames++;

        // Spawn
        if (state.frames > 150 && state.frames % PIPE_SPAWN_RATE === 0) {
            const minHeight = 100;
            const maxHeight = canvas.height - GAP_SIZE - minHeight;
            const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
            pipeList.push({ x: canvas.width, topHeight: height, passed: false });
        }

        // Move
        for (let i = pipeList.length - 1; i >= 0; i--) {
            const p = pipeList[i];
            p.x -= PIPE_SPEED;

            if (!p.passed && p.x + 50 < stud.x) {
                state.score++;
                p.passed = true;
                setScoreDisplay(state.score);
            }

            if (p.x < -60) pipeList.splice(i, 1);

            // Collision
            const inPipeX = stud.x + stud.radius > p.x && stud.x - stud.radius < p.x + 50;
            if (inPipeX) {
                if ((stud.y - stud.radius < p.topHeight) || (stud.y + stud.radius > p.topHeight + GAP_SIZE)) {
                    triggerGameOver();
                }
            }
        }

        if (stud.y + stud.radius > canvas.height || stud.y - stud.radius < 0) {
            triggerGameOver();
        }

        // Rotation Logic
        let rotation = Math.min(Math.PI / 3, Math.max(-0.5, (stud.velocity * 0.1)));

        drawScene(ctx, canvas, stud, pipeList, rotation);
        animationFrameId = requestAnimationFrame(loop);
    };

    const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, stud: any, pipeList: any[], rotation: number) => {
        // Pipes
        ctx.lineWidth = 3;
        pipeList.forEach(p => {
            ctx.fillStyle = '#22C55E'; ctx.strokeStyle = '#14532d';
            ctx.fillRect(p.x, 0, 50, p.topHeight); ctx.strokeRect(p.x, 0, 50, p.topHeight);
            ctx.fillStyle = '#16a34a'; // Cap
            ctx.fillRect(p.x - 2, p.topHeight - 20, 54, 20); ctx.strokeRect(p.x - 2, p.topHeight - 20, 54, 20);

            const bottomY = p.topHeight + GAP_SIZE;
            ctx.fillStyle = '#22C55E';
            ctx.fillRect(p.x, bottomY, 50, canvas.height - bottomY); ctx.strokeRect(p.x, bottomY, 50, canvas.height - bottomY);
            ctx.fillStyle = '#16a34a'; // Cap
            ctx.fillRect(p.x - 2, bottomY, 54, 20); ctx.strokeRect(p.x - 2, bottomY, 54, 20);
        });

        // Student with Rotation
        ctx.save();
        ctx.translate(stud.x, stud.y);
        ctx.rotate(rotation);
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧑‍🎓', 0, 0);
        ctx.restore();

        // Ground
        ctx.fillStyle = '#333'; ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
    };

    const triggerGameOver = () => {
        gameState.current.gameOver = true;
        setGameOverDisplay(true);
        setHighScore(prev => {
            const newHigh = Math.max(prev, gameState.current.score);
            localStorage.setItem('flappyHighScore', newHigh.toString());
            return newHigh;
        });
    };

    const handleInput = (e: Event) => {
        e.stopPropagation();
        if (e.type === 'keydown') e.preventDefault();

        if (inputLocked.current) return;

        const state = gameState.current;
        if (state.gameOver) return;

        if (!state.gameStarted) {
            state.gameStarted = true;
            setGameStartedDisplay(true);
        }
        student.current.velocity = JUMP;
    };

    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') handleInput(e); };
    const onTouch = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        if ((e.target as HTMLElement).closest('button')) return;
        handleInput(e);
    };
    const onClick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        handleInput(e);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouch, { passive: false });
    window.addEventListener('mousedown', onClick);

    loop();

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('touchstart', onTouch);
        window.removeEventListener('mousedown', onClick);
        cancelAnimationFrame(animationFrameId);
        clearTimeout(unlockTimer);
    };
}, [resetCount]);

const resetGame = () => {
    setScoreDisplay(0);
    setGameOverDisplay(false);
    setGameStartedDisplay(false);
    setResetCount(c => c + 1);
};

return (
    <div className="fixed inset-0 z-[100] bg-black select-none touch-none">
        <canvas ref={canvasRef} className="block w-full h-full" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white">
                <div className="text-3xl font-black font-mono">{scoreDisplay}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Score</div>
            </div>

            <div className="flex gap-2 pointer-events-auto">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white text-right">
                    <div className="text-lg font-bold text-accent-yellow">{highScore}</div>
                    <div className="text-xs text-white/50">BEST</div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-xl text-red-200 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>
        </div>

        {(!gameStartedDisplay && !gameOverDisplay) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center animate-bounce">
                    <div className="text-7xl mb-6 drop-shadow-2xl">👆</div>
                    <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md">TAP TO FLY</h2>
                    <p className="text-lg text-textMuted bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">Help the student graduate!</p>
                </div>
            </div>
        )}

        {gameOverDisplay && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 animate-fade-in">
                <div className="text-center p-8 bg-[#1A1825] border border-white/10 rounded-3xl max-w-sm w-full mx-4 shadow-2xl transform transition-all animate-scale-in">
                    <div className="text-6xl mb-4">💥</div>
                    <h2 className="text-4xl font-black text-white mb-2">CRASHED!</h2>
                    <div className="text-xl text-textMuted mb-8">Score: <span className="text-white font-bold">{scoreDisplay}</span></div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); resetGame(); }}
                            className="col-span-2 py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <RefreshCw size={22} /> TRY AGAIN
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="col-span-2 py-3 bg-white/5 hover:bg-white/10 text-textMuted hover:text-white rounded-xl font-medium transition-colors"
                        >
                            Give Up
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}
