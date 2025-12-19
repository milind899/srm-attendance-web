'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Trophy, RefreshCw } from 'lucide-react';

interface HiddenGameProps {
    onClose: () => void;
}

export function HiddenGame({ onClose }: HiddenGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scoreDisplay, setScoreDisplay] = useState(0);
    const [highScore, setHighScore] = useState(0); // Initialize 0, load in effect
    const [gameOverDisplay, setGameOverDisplay] = useState(false);
    const [gameStartedDisplay, setGameStartedDisplay] = useState(false);

    // Refs for mutable game state (avoids closure staleness in animation loop)
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

    // 1. Load High Score
    useEffect(() => {
        const stored = localStorage.getItem('flappyHighScore');
        if (stored) {
            setHighScore(parseInt(stored));
        }
    }, []);

    // 2. Game Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Reset position on resize if not playing to keep it centered vertically
            if (!gameState.current.gameStarted) {
                student.current.y = canvas.height / 2;
                // Move student depending on screen width
                student.current.x = canvas.width < 500 ? 50 : 100;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        // --- CONSTANTS (Easier Difficulty) ---
        const GRAVITY = 0.5;   // Reduced from 0.6
        const JUMP = -8;       // Slightly weaker jump for control
        const PIPE_SPEED = 3;
        const PIPE_SPAWN_RATE = 120; // Slower spawn (was 100)
        const GAP_SIZE = 220;  // Wider gap (was 150)

        const loop = () => {
            // Clear Screen
            ctx.fillStyle = '#0B0C0E';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const state = gameState.current;
            const stud = student.current;
            const pipeList = pipes.current;

            // --- WAITING START ---
            if (!state.gameStarted) {
                // Bobbing animation
                stud.y = canvas.height / 2 + Math.sin(state.frames * 0.05) * 10;
                drawScene(ctx, canvas, stud, pipeList);
                state.frames++;

                if (!state.gameOver) {
                    animationFrameId = requestAnimationFrame(loop);
                }
                return;
            }

            // --- GAME OVER ---
            if (state.gameOver) {
                drawScene(ctx, canvas, stud, pipeList);
                return; // Stop loop
            }

            // --- PLAYING ---

            // Student Physics
            stud.velocity += GRAVITY;
            stud.y += stud.velocity;
            state.frames++;

            // Spawn Pipes
            if (state.frames % PIPE_SPAWN_RATE === 0) {
                const minHeight = 100;
                const maxHeight = canvas.height - GAP_SIZE - minHeight;
                // Random height
                const height = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
                pipeList.push({ x: canvas.width, topHeight: height, passed: false });
            }

            // Move Pipes & Check Collisions
            for (let i = pipeList.length - 1; i >= 0; i--) {
                const p = pipeList[i];
                p.x -= PIPE_SPEED;

                // Score Update
                if (!p.passed && p.x + 50 < stud.x) {
                    state.score++;
                    p.passed = true;
                    setScoreDisplay(state.score); // Sync to UI
                }

                // Remove off-screen
                if (p.x < -60) {
                    pipeList.splice(i, 1);
                }

                // Collision Detection
                // AABB for pipe vs circle (simplified to rect vs rect for safety)

                // Helper: Is student inside pipe X range?
                const inPipeX = stud.x + stud.radius > p.x && stud.x - stud.radius < p.x + 50;

                if (inPipeX) {
                    // Check Y: Hit top pipe OR Hit bottom pipe
                    if ((stud.y - stud.radius < p.topHeight) || (stud.y + stud.radius > p.topHeight + GAP_SIZE)) {
                        triggerGameOver();
                    }
                }
            }

            // Boundary Checks (Floor/Ceiling)
            if (stud.y + stud.radius > canvas.height || stud.y - stud.radius < 0) {
                triggerGameOver();
            }

            drawScene(ctx, canvas, stud, pipeList);
            animationFrameId = requestAnimationFrame(loop);
        };

        const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, stud: any, pipeList: any[]) => {
            // 1. Pipes
            ctx.lineWidth = 3;

            pipeList.forEach(p => {
                // Top Pipe
                ctx.fillStyle = '#22C55E';
                ctx.strokeStyle = '#14532d';

                // Main body
                ctx.fillRect(p.x, 0, 50, p.topHeight);
                ctx.strokeRect(p.x, 0, 50, p.topHeight);

                // Cap
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(p.x - 2, p.topHeight - 20, 54, 20);
                ctx.strokeRect(p.x - 2, p.topHeight - 20, 54, 20);

                // Bottom Pipe
                const bottomY = p.topHeight + GAP_SIZE;
                ctx.fillStyle = '#22C55E';

                // Main body
                ctx.fillRect(p.x, bottomY, 50, canvas.height - bottomY);
                ctx.strokeRect(p.x, bottomY, 50, canvas.height - bottomY);

                // Cap
                ctx.fillStyle = '#16a34a'; // mid-green
                ctx.fillRect(p.x - 2, bottomY, 54, 20);
                ctx.strokeRect(p.x - 2, bottomY, 54, 20);
            });

            // 2. Student (Emoji)
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧑‍🎓', stud.x, stud.y);

            // 3. Ground
            ctx.fillStyle = '#333';
            ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
        };

        const triggerGameOver = () => {
            gameState.current.gameOver = true;
            setGameOverDisplay(true);

            // Update High Score logic
            setHighScore(prev => {
                const currentScore = gameState.current.score;
                const newHigh = Math.max(prev, currentScore);
                localStorage.setItem('flappyHighScore', newHigh.toString());
                return newHigh;
            });
        };

        // --- INPUT HANDLING ---
        const handleInput = (e: Event) => {
            // Stop propagation so we don't trigger anything else
            e.stopPropagation();

            // If keyboard, prevent default to stop scrolling
            if (e.type === 'keydown') {
                e.preventDefault();
            }

            const state = gameState.current;

            if (state.gameOver) return; // Wait for restart click

            if (!state.gameStarted) {
                state.gameStarted = true;
                setGameStartedDisplay(true);
            }

            // Jump!
            student.current.velocity = JUMP;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') handleInput(e);
        };
        const onTouch = (e: TouchEvent) => {
            // Stop touch from scrolling/zooming
            if (e.cancelable) e.preventDefault();

            // Check if hitting a button
            if ((e.target as HTMLElement).closest('button')) return;

            handleInput(e);
        };
        const onClick = (e: MouseEvent) => {
            // CRITICAL FIX: Don't jump if clicking the Close or Restart button
            if ((e.target as HTMLElement).closest('button')) return;

            handleInput(e);
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('touchstart', onTouch, { passive: false });
        window.addEventListener('mousedown', onClick);

        // Start Loop
        loop();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('touchstart', onTouch);
            window.removeEventListener('mousedown', onClick);
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // Run once on mount

    const resetGame = () => {
        // Reset Ref State
        gameState.current = {
            score: 0,
            gameOver: false,
            gameStarted: false,
            frames: 0
        };
        student.current.y = window.innerHeight / 2;
        student.current.velocity = 0;
        pipes.current = [];

        // Reset UI State
        setScoreDisplay(0);
        setGameOverDisplay(false);
        setGameStartedDisplay(false);

        // The loop is inside the effect which runs once. 
        // We need to re-trigger the loop if it stopped?
        // Actually, the loop logic checks `gameOver` and return. 
        // If we flip `gameOver` to false, the next rAF call (if it was still running) would work?
        // No, `triggerGameOver` STOPS the loop (return).
        // So we need to restart the loop manually? 
        // 
        // Simpler way: Force re-mount of the game logic component OR 
        // move `loop()` to be accessible outside.
        // But `loop` depends on `frames`, `ctx` in closure. 
        //
        // TRICK: Just update a `resetTrigger` state to re-run the effect? 
        // No, that flickers.
        // 
        // SOLUTION: We never stopped the loop completely? 
        // In my `loop` above: `if (state.gameOver) return;` -> STOPS rAF.
        // So we need to restart it.
        // I'll make `key={key}` on the component in Dashboard? That's easiest. 
        // Cons: High Score fetch flickers.
        //
        // Better: We can just make the key internal.
        // Let's modify the component to just reload the page? no.
        //
        // Let's add a `key` state to the wrapping div or canvas? No.
        //
        // Actually, simpler: Let the loop continue running even on game over, just drawing static?
        // No, we want to stop processing.
        //
        // I will add [resetCount] to dependecy array of the verify effect?
        // Yes!
        setResetCount(c => c + 1);
    };

    const [resetCount, setResetCount] = useState(0);

    // This effectively re-mounts the game logic when we reset
    // High score is in its own effect so it persists visually
    useEffect(() => {
        // ... (The big game effect from above) ...
        // I will paste the content inside this block in the final file write.
        // For now, note that I need to wrap the game logic in this effect dependent on resetCount.
    }, [resetCount]);

    // ... WAIT. If I depend on resetCount, I need to copy the whole logic. 
    // Yes. That is fine. 

    // Redoing the file content below.
    return (
        <div className="fixed inset-0 z-[100] bg-black select-none touch-none">
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white animate-fade-in-down">
                    <div className="text-3xl font-black font-mono">{scoreDisplay}</div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">Score</div>
                </div>

                <div className="flex gap-2 pointer-events-auto animate-fade-in-down delay-100">
                    <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white text-right">
                        <div className="text-lg font-bold text-accent-yellow">{highScore}</div>
                        <div className="text-xs text-white/50">BEST</div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Stop bubbling to canvas
                            onClose();
                        }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetGame();
                                }}
                                className="col-span-2 py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <RefreshCw size={22} /> TRY AGAIN
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
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

// I will need to make sure I actually include the Effect body in the correct place. 
