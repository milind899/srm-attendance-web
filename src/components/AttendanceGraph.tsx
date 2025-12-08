'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

interface AttendanceGraphProps {
    projected: number[];
    actual: number[];
}

export const AttendanceGraph: React.FC<AttendanceGraphProps> = ({ projected, actual }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const width = 800;
    const height = 300;
    const padding = 40;

    const defaultX = width * 0.85;
    const [targetX, setTargetX] = useState<number>(defaultX);
    const [currentX, setCurrentX] = useState<number>(defaultX);

    // Normalize data to SVG coordinates
    const processData = (data: number[]) => {
        const max = 100;
        const min = 0;
        return data.map((val, i) => ({
            x: padding + (i / (data.length - 1)) * (width - padding * 2),
            y: height - padding - ((val - min) / (max - min)) * (height - padding * 2),
        }));
    };

    const projectedPoints = useMemo(() => processData(projected), [projected]);
    const actualPoints = useMemo(() => processData(actual), [actual]);

    // 75% threshold line Y position
    const threshold75Y = height - padding - (75 / 100) * (height - padding * 2);

    // Smooth Bezier curve generation
    const getControlPoint = (current: any, previous: any, next: any, reverse?: boolean) => {
        const p = previous || current;
        const n = next || current;
        const smoothing = 0.2;

        const o = { x: n.x - p.x, y: n.y - p.y };
        const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
        const length = Math.sqrt(Math.pow(o.x, 2) + Math.pow(o.y, 2)) * smoothing;

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
    const areaPath = actualPoints.length > 0
        ? `${actualPath} L ${actualPoints[actualPoints.length - 1].x},${height - padding} L ${actualPoints[0].x},${height - padding} Z`
        : '';

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
        const relativeX = Math.max(padding, Math.min(width - padding, (x / rect.width) * width));
        setTargetX(relativeX);
    }, []);

    const handleMouseLeave = () => {
        setTargetX(defaultX);
    };

    const getInterpolatedY = (targetX: number, points: { x: number, y: number }[]) => {
        for (let i = 0; i < points.length - 1; i++) {
            if (targetX >= points[i].x && targetX <= points[i + 1].x) {
                const t = (targetX - points[i].x) / (points[i + 1].x - points[i].x);
                return points[i].y + (points[i + 1].y - points[i].y) * t;
            }
        }
        return points[points.length - 1]?.y || height - padding;
    };

    // Convert Y position back to percentage
    const yToPercentage = (y: number) => {
        return Math.round(100 - ((y - padding) / (height - padding * 2)) * 100);
    };

    const currentActualY = getInterpolatedY(currentX, actualPoints);
    const currentProjectedY = getInterpolatedY(currentX, projectedPoints);
    const currentActualPct = yToPercentage(currentActualY);
    const currentProjectedPct = yToPercentage(currentProjectedY);

    return (
        <div className="w-full h-full relative select-none" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="thresholdGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity="0" />
                        <stop offset="50%" stopColor="#EF4444" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Y-axis labels */}
                <text x={padding - 8} y={height - padding} textAnchor="end" className="fill-[#8A8F98] text-[10px]">0%</text>
                <text x={padding - 8} y={height - padding - (50 / 100) * (height - padding * 2)} textAnchor="end" className="fill-[#8A8F98] text-[10px]">50%</text>
                <text x={padding - 8} y={padding} textAnchor="end" className="fill-[#8A8F98] text-[10px]">100%</text>

                {/* Horizontal grid lines */}
                <line x1={padding} y1={height - padding - (25 / 100) * (height - padding * 2)} x2={width - padding} y2={height - padding - (25 / 100) * (height - padding * 2)} stroke="#2E2F33" strokeOpacity="0.3" strokeDasharray="4 4" />
                <line x1={padding} y1={height - padding - (50 / 100) * (height - padding * 2)} x2={width - padding} y2={height - padding - (50 / 100) * (height - padding * 2)} stroke="#2E2F33" strokeOpacity="0.3" strokeDasharray="4 4" />

                {/* 75% Threshold Line - Important! */}
                <line x1={padding} y1={threshold75Y} x2={width - padding} y2={threshold75Y} stroke="url(#thresholdGradient)" strokeWidth="2" strokeDasharray="8 4" />
                <text x={width - padding + 5} y={threshold75Y + 4} className="fill-red-400 text-[10px] font-semibold">75%</text>

                {/* Axes */}
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#2E2F33" strokeWidth="1" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2E2F33" strokeWidth="1" />

                {/* Projected (gray baseline) */}
                <path d={projectedPath} fill="none" stroke="#4B4E56" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" opacity="0.6" />

                {/* Actual Attendance Area & Line */}
                <path d={areaPath} fill="url(#areaGradient)" />
                <path d={actualPath} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />

                {/* Vertical cursor line */}
                <line x1={currentX} y1={padding} x2={currentX} y2={height - padding} stroke="#4B4E56" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

                {/* Interactive Dots */}
                <g transform={`translate(${currentX}, ${currentProjectedY})`}>
                    <circle r="4" fill="#1C1D21" stroke="#4B4E56" strokeWidth="2" />
                </g>

                <g transform={`translate(${currentX}, ${currentActualY})`}>
                    <circle r="12" fill="#10B981" fillOpacity="0.2" />
                    <circle r="6" fill="#0B0C0E" stroke="#10B981" strokeWidth="3" />
                </g>

                {/* Tooltip */}
                <g transform={`translate(${Math.min(currentX + 10, width - 100)}, ${Math.max(currentActualY - 50, padding + 10)})`}>
                    <rect x="0" y="0" width="90" height="45" rx="6" fill="#1C1D21" stroke="#2E2F33" />
                    <text x="10" y="18" className="fill-[#8A8F98] text-[10px]">Actual</text>
                    <text x="70" y="18" textAnchor="end" className={`text-[12px] font-bold ${currentActualPct >= 75 ? 'fill-green-400' : 'fill-red-400'}`}>{currentActualPct}%</text>
                    <text x="10" y="36" className="fill-[#8A8F98] text-[10px]">Target</text>
                    <text x="70" y="36" textAnchor="end" className="fill-[#8A8F98] text-[12px] font-bold">{currentProjectedPct}%</text>
                </g>
            </svg>
        </div>
    );
};
