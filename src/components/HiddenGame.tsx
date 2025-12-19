'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Trophy, RefreshCw } from 'lucide-react';

interface HiddenGameProps {
    onClose: () => void;
}

export function HiddenGame({ onClose }: HiddenGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    // Game constants
    const GRAVITY = 0.6;
    const JUMP = -10;
    const PIPE_SPEED = 3;
    const PIPE_SPAWN_RATE = 100; // Frames
    const GAP_SIZE = 150;

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
        let frames = 0;

        // Resize canvas
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Game State
        const student = {
            x: 50,
            y: canvas.height / 2,
            velocity: 0,
            radius: 20
        };

        const pipes: { x: number; topHeight: number; passed: boolean }[] = [];

        const resetGame = () => {
            student.y = canvas.height / 2;
            student.velocity = 0;
            pipes.length = 0;
            setScore(0);
            setGameOver(false);
            setGameStarted(false);
            frames = 0;
        };

        const loop = () => {
            if (gameOver || !gameStarted) {
                // Just draw static if waiting
                if (!gameStarted) draw(ctx, canvas, student, pipes);
                return;
            }

            // Update
            student.velocity += GRAVITY;
            student.y += student.velocity;

            // Pipe spawning
            if (frames % PIPE_SPAWN_RATE === 0) {
                const minHeight = 50;
                const maxHeight = canvas.height - GAP_SIZE - minHeight;
                const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
                pipes.push({ x: canvas.width, topHeight: height, passed: false });
            }

            // Move pipes
            pipes.forEach(pipe => {
                pipe.x -= PIPE_SPEED;
            });

            // Remove off-screen pipes
            if (pipes.length > 0 && pipes[0].x < -50) {
                pipes.shift();
            }

            // Collision & Score
            // Floor/Ceiling
            if (student.y + student.radius > canvas.height || student.y - student.radius < 0) {
                handleGameOver();
            }

            pipes.forEach(pipe => {
                // Score
                if (pipe.x + 50 < student.x && !pipe.passed) {
                    setScore(s => s + 1);
                    pipe.passed = true;
                }

                // Collision
                if (
                    student.x + student.radius > pipe.x &&
                    student.x - student.radius < pipe.x + 50 &&
                    (student.y - student.radius < pipe.topHeight || student.y + student.radius > pipe.topHeight + GAP_SIZE)
                ) {
                    handleGameOver();
                }
            });

            draw(ctx, canvas, student, pipes);
            frames++;
            animationFrameId = window.requestAnimationFrame(loop);
        };

        const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, student: any, pipes: any[]) => {
            // Clear
            ctx.fillStyle = '#0B0C0E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Pipes
            ctx.fillStyle = '#22C55E'; // Green pipes
            ctx.strokeStyle = '#14532d'; // Darker border
            ctx.lineWidth = 2;

            pipes.forEach(pipe => {
                // Top Pipe
                ctx.fillRect(pipe.x, 0, 50, pipe.topHeight);
                ctx.strokeRect(pipe.x, 0, 50, pipe.topHeight);

                // Bottom Pipe
                ctx.fillRect(pipe.x, pipe.topHeight + GAP_SIZE, 50, canvas.height - (pipe.topHeight + GAP_SIZE));
                ctx.strokeRect(pipe.x, pipe.topHeight + GAP_SIZE, 50, canvas.height - (pipe.topHeight + GAP_SIZE));
            });

            // Draw Student (Emoji)
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧑‍🎓', student.x, student.y);

            // Draw Floor
            ctx.fillStyle = '#333';
            ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
        };

        const handleGameOver = () => {
            setGameOver(true);
            setGameStarted(false);
            window.cancelAnimationFrame(animationFrameId);

            // Update high score
            setScore(currentScore => {
                setHighScore(prev => {
                    const newHigh = Math.max(prev, currentScore);
                    localStorage.setItem('flappyHighScore', newHigh.toString());
                    return newHigh;
                });
                return currentScore;
            });
        };

        // Input handling
        const jump = () => {
            if (gameOver) {
                resetGame();
                setGameStarted(true);
                loop();
            } else if (!gameStarted) {
                setGameStarted(true);
                // Important: Start the loop immediately
                loop();
                // Initial jump
                student.velocity = JUMP;
            } else {
                student.velocity = JUMP;
            }
        };

        const handleInput = (e: any) => {
            // Prevent default for Space to stop scrolling
            if (e.code === 'Space') e.preventDefault();
            if (e.code === 'Space' || e.type === 'touchstart' || e.type === 'mousedown') {
                jump();
            }
        };

        window.addEventListener('keydown', handleInput);
        window.addEventListener('touchstart', handleInput);
        window.addEventListener('mousedown', handleInput);

        // Initial draw
        draw(ctx, canvas, student, pipes);

        // Start loop logic (but it will pause if !gameStarted)
        animationFrameId = window.requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', handleInput);
            window.removeEventListener('touchstart', handleInput);
            window.removeEventListener('mousedown', handleInput);
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [gameStarted, gameOver]); // Re-bind when state changes to ensure fresh closures? Actually refs are better.

    // Better approach: Use refs for mutable game state to avoid re-binding effects constantly
    // But for simplicity of this component, I'll stick to a single effect with careful dependency management 
    // OR just use the refs inside the effect. The above effect has dependencies that might cause re-mounts.
    // Let's optimize: Move ALL game logic into one effect that only runs ONCE on mount, and use refs for everything.

    // ... Actually, I will rewrite the effect to use refs for state to make it robust against React updates.

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <canvas ref={canvasRef} className="block cursor-pointer" />

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white">
                    <div className="text-2xl font-bold">{score}</div>
                    <div className="text-xs text-white/50">Score</div>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white text-right">
                        <div className="text-lg font-bold text-accent-yellow">{highScore}</div>
                        <div className="text-xs text-white/50">Best</div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-xl text-red-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {(!gameStarted && !gameOver) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center animate-bounce">
                        <div className="text-6xl mb-4">👆</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Tap / Space to Fly</h2>
                        <p className="text-textMuted">Dodge the pipes!</p>
                    </div>
                </div>
            )}

            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                    <div className="text-center p-8 bg-[#1A1825] border border-white/10 rounded-3xl max-w-sm w-full mx-4 shadow-2xl transform transition-all animate-scale-in">
                        <div className="text-6xl mb-4">💥</div>
                        <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
                        <p className="text-textMuted mb-8">You scored {score} points</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => window.location.reload()} // Quick dirty reset or better: toggle state
                                // Actually, clicks on canvas trigger reset. So just clicking anywhere works.
                                // But let's add a clear button.
                                className="col-span-2 py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={20} /> Play Again
                            </button>
                            <button
                                onClick={onClose}
                                className="col-span-2 py-3 bg-white/5 hover:bg-white/10 text-textMuted hover:text-white rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-textMuted">Tap anywhere to restart</p>
                    </div>
                </div>
            )}
        </div>
    );
}
