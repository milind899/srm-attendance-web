'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

// S-curve data - smooth attendance progression over time
const PROJECTED_DATA = [75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75]; // 75% threshold line
const ACTUAL_DATA = [68, 70, 72, 71, 73, 76, 78, 80, 82, 85, 87, 88]; // Actual trajectory

export const InteractiveGraph: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const width = 800;
    const height = 280;
    const padding = { top: 30, right: 50, bottom: 40, left: 50 };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const defaultX = padding.left + graphWidth * 0.85;
    const [targetX, setTargetX] = useState<number>(defaultX);
    const [currentX, setCurrentX] = useState<number>(defaultX);

    // Normalize data to SVG coordinates
    const processData = (data: number[]) => {
        return data.map((val, i) => ({
            x: padding.left + (i / (data.length - 1)) * graphWidth,
            y: padding.top + graphHeight - ((val - 50) / 50) * graphHeight, // Scale 50-100 range
        }));
    };

    const projectedPoints = useMemo(() => processData(PROJECTED_DATA), []);
    const actualPoints = useMemo(() => processData(ACTUAL_DATA), []);

    // Smooth Bezier curve generation
    const getControlPoint = (current: { x: number, y: number }, previous: { x: number, y: number } | undefined, next: { x: number, y: number } | undefined, reverse?: boolean) => {
        const p = previous || current;
        const n = next || current;
        const smoothing = 0.2;

        const o = { x: n.x - p.x, y: n.y - p.y };
        const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
        const length = Math.sqrt(o.x ** 2 + o.y ** 2) * smoothing;

        return {
            x: current.x + Math.cos(angle) * length,
            y: current.y + Math.sin(angle) * length
        };
    };

    const getSmoothPath = (points: { x: number, y: number }[]) => {
        if (points.length === 0) return "";
        return points.reduce((acc, point, i, a) => {
            if (i === 0) return `M ${point.x},${point.y}`;
            const cp1 = getControlPoint(a[i - 1], a[i - 2], point);
            const cp2 = getControlPoint(point, a[i - 1], a[i + 1], true);
            return `${acc} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${point.x},${point.y}`;
        }, "");
    };

    const projectedPath = useMemo(() => getSmoothPath(projectedPoints), [projectedPoints]);
    const actualPath = useMemo(() => getSmoothPath(actualPoints), [actualPoints]);
    const areaPath = `${actualPath} L ${actualPoints[actualPoints.length - 1].x},${padding.top + graphHeight} L ${actualPoints[0].x},${padding.top + graphHeight} Z`;

    // Animation Loop
    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            setCurrentX(prevX => {
                const diff = targetX - prevX;
                if (Math.abs(diff) < 0.5) return targetX;
                return prevX + diff * 0.08;
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetX]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const relativeX = Math.max(padding.left, Math.min(padding.left + graphWidth, (x / rect.width) * width));
        setTargetX(relativeX);
    }, []);

    const handleMouseLeave = () => setTargetX(defaultX);

    const getInterpolatedY = (targetX: number, points: { x: number, y: number }[]) => {
        for (let i = 0; i < points.length - 1; i++) {
            if (targetX >= points[i].x && targetX <= points[i + 1].x) {
                const t = (targetX - points[i].x) / (points[i + 1].x - points[i].x);
                return points[i].y + (points[i + 1].y - points[i].y) * t;
            }
        }
        return points[points.length - 1].y;
    };

    const yToPercentage = (y: number) => {
        return Math.round(100 - ((y - padding.top) / graphHeight) * 50);
    };

    const currentActualY = getInterpolatedY(currentX, actualPoints);
    const currentProjectedY = getInterpolatedY(currentX, projectedPoints);
    const currentPct = yToPercentage(currentActualY);

    // Months for X-axis
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="w-full relative select-none">
            <div
                ref={containerRef}
                className="w-full aspect-[21/9] bg-gradient-to-b from-[#0B0C0E] to-[#0D0E10] rounded-xl border border-border/50 relative overflow-hidden cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full block">
                    <defs>
                        <linearGradient id="homeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                        <filter id="homeGlow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <mask id="homeRevealMask">
                            <rect x="0" y="0" width={currentX} height={height} fill="white" />
                        </mask>
                    </defs>

                    {/* Subtle grid */}
                    {[75, 85, 95].map(pct => {
                        const y = padding.top + graphHeight - ((pct - 50) / 50) * graphHeight;
                        return (
                            <g key={pct}>
                                <line x1={padding.left} y1={y} x2={padding.left + graphWidth} y2={y} stroke="#2E2F33" strokeOpacity="0.3" strokeDasharray="4 6" />
                                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-[#4B4E56] text-[9px]">{pct}%</text>
                            </g>
                        );
                    })}

                    {/* X-axis labels (every 3 months) */}
                    {[0, 3, 6, 9, 11].map(i => (
                        <text key={i} x={padding.left + (i / 11) * graphWidth} y={height - 12} textAnchor="middle" className="fill-[#4B4E56] text-[9px]">
                            {months[i]}
                        </text>
                    ))}

                    {/* 75% Threshold line (always visible) */}
                    <line
                        x1={padding.left}
                        y1={padding.top + graphHeight - ((75 - 50) / 50) * graphHeight}
                        x2={padding.left + graphWidth}
                        y2={padding.top + graphHeight - ((75 - 50) / 50) * graphHeight}
                        stroke="#EF4444"
                        strokeWidth="1.5"
                        strokeDasharray="8 6"
                        strokeOpacity="0.6"
                    />
                    <text
                        x={padding.left + graphWidth + 8}
                        y={padding.top + graphHeight - ((75 - 50) / 50) * graphHeight + 4}
                        className="fill-red-400 text-[10px] font-medium"
                    >
                        75%
                    </text>

                    {/* Masked content (reveals on hover) */}
                    <g mask="url(#homeRevealMask)">
                        {/* Area fill */}
                        <path d={areaPath} fill="url(#homeAreaGradient)" />

                        {/* Main line */}
                        <path
                            d={actualPath}
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            filter="url(#homeGlow)"
                        />
                    </g>

                    {/* Vertical cursor line */}
                    <line x1={currentX} y1={padding.top} x2={currentX} y2={padding.top + graphHeight} stroke="#4B4E56" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

                    {/* Cursor dot with glow */}
                    <g transform={`translate(${currentX}, ${currentActualY})`}>
                        <circle r="16" fill="#10B981" fillOpacity="0.15" />
                        <circle r="8" fill="#10B981" fillOpacity="0.3" />
                        <circle r="5" fill="#0B0C0E" stroke="#10B981" strokeWidth="2.5" />
                    </g>

                    {/* Tooltip */}
                    <g transform={`translate(${Math.min(currentX + 15, width - 80)}, ${Math.max(currentActualY - 35, padding.top + 5)})`}>
                        <rect x="0" y="0" width="65" height="28" rx="6" fill="#1C1D21" fillOpacity="0.95" stroke="#2E2F33" strokeWidth="0.5" />
                        <text x="10" y="18" className={`text-[14px] font-bold ${currentPct >= 75 ? 'fill-green-400' : 'fill-red-400'}`}>
                            {currentPct}%
                        </text>
                        <text x="44" y="18" className="fill-[#4B4E56] text-[10px]">
                            {currentPct >= 75 ? '✓' : '!'}
                        </text>
                    </g>
                </svg>
            </div>
        </div>
    );
};
