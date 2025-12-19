'use client';

import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface HiddenGameProps {
    onClose: () => void;
}

export function HiddenGame({ onClose }: HiddenGameProps) {
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

    // Input lock ref to prevent accidental starts
    const inputLocked = useRef(true);

    // Load High Score
    useEffect(() => {
        const stored = localStorage.getItem('flappyHighScore');
        if (stored) setHighScore(parseInt(stored));
    }, []);

    // Game Logic Effect - Depends on resetCount to "restart" the loop cleanly
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let unlockTimer: NodeJS.Timeout;

        // Reset state on mount/reset
        gameState.current = { score: 0, gameOver: false, gameStarted: false, frames: 0 };
        pipes.current = [];
        student.current.velocity = 0;

        // Initial Input Lock (500ms safety buffer)
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

        // Constants
        const GRAVITY = 0.5;
        const JUMP = -8;
        const PIPE_SPEED = 3;
        const PIPE_SPAWN_RATE = 120;
        const GAP_SIZE = 220;

        const loop = () => {
            ctx.fillStyle = '#0B0C0E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const state = gameState.current;
            const stud = student.current;
            const pipeList = pipes.current;

            // WAITING
            if (!state.gameStarted) {
                stud.y = canvas.height / 2 + Math.sin(state.frames * 0.05) * 10;
                drawScene(ctx, canvas, stud, pipeList);
                state.frames++;
                if (!state.gameOver) animationFrameId = requestAnimationFrame(loop);
                return;
            }

            // GAME OVER
            if (state.gameOver) {
                drawScene(ctx, canvas, stud, pipeList);
                return;
            }

            // PLAYING
            stud.velocity += GRAVITY;
            stud.y += stud.velocity;
            state.frames++;

            // Spawn Pipes (DELAYED START: Wait 200 frames -> ~3.5s buffer)
            if (state.frames > 200 && state.frames % PIPE_SPAWN_RATE === 0) {
                const minHeight = 100;
                const maxHeight = canvas.height - GAP_SIZE - minHeight;
                const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
                pipeList.push({ x: canvas.width, topHeight: height, passed: false });
            }

            // Move & Collide
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

            drawScene(ctx, canvas, stud, pipeList);
            animationFrameId = requestAnimationFrame(loop);
        };

        const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, stud: any, pipeList: any[]) => {
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

            // Student
            ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🧑‍🎓', stud.x, stud.y);

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

            if (inputLocked.current) return; // IGNORE INPUT IF LOCKED

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
        setResetCount(c => c + 1); // Trigger effect to restart
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
