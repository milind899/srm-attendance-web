import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

// S-curve data generation for a smooth look matching the reference image
// Projected (gray) - Steady S-curve growth
const PROJECTED_DATA = [30, 32, 36, 42, 52, 62, 72, 80, 86, 90, 92, 92];
// Actual (yellow) - Starts lower, slight plateau, then catch up
const ACTUAL_DATA =    [15, 18, 20, 22, 23, 28, 45, 58, 68, 72, 74, 75];

export const InteractiveGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  // targetX: Where the mouse is (or default position)
  // currentX: Where the graph is currently drawn (for smooth lerping)
  const width = 800; 
  const defaultX = width * 0.75;
  
  const [targetX, setTargetX] = useState<number>(defaultX);
  const [currentX, setCurrentX] = useState<number>(defaultX);
  const [isHovering, setIsHovering] = useState(false);

  const height = 300;
  const padding = 20;

  // Normalize data to SVG coordinates
  const processData = (data: number[]) => {
    const max = 100; // fixed Y-scale max
    const min = 0;
    
    return data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((val - min) / (max - min)) * (height - padding * 2) - padding,
    }));
  };

  const projectedPoints = useMemo(() => processData(PROJECTED_DATA), []);
  const actualPoints = useMemo(() => processData(ACTUAL_DATA), []);

  // Smooth Bezier curve generation
  const getControlPoint = (current: any, previous: any, next: any, reverse?: boolean) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.25; 
    
    const o = {
      x: n.x - p.x,
      y: n.y - p.y
    };
    
    const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
    const length = Math.sqrt(Math.pow(o.x, 2) + Math.pow(o.y, 2)) * smoothing;
    
    return {
      x: current.x + Math.cos(angle) * length,
      y: current.y + Math.sin(angle) * length
    };
  };

  const getSmoothPath = (points: {x: number, y: number}[]) => {
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
  // Close the area for gradient fill
  const areaPath = `${actualPath} L ${width},${height} L 0,${height} Z`;

  // Animation Loop for "Inertia" (Slowing down movement)
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      setCurrentX(prevX => {
        // Linear Interpolation (Lerp)
        // 0.08 is the speed factor (lower = slower/heavier, higher = snappier)
        const diff = targetX - prevX;
        
        // If close enough, snap to target to save resources
        if (Math.abs(diff) < 0.5) return targetX;
        
        return prevX + diff * 0.08; 
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetX]);

  // Mouse Handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsHovering(true);
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(width, (x / rect.width) * width));
    
    setTargetX(relativeX);
  }, []);

  const handleMouseLeave = () => {
     setIsHovering(false);
     setTargetX(defaultX); // Return to default position
  };

  // Helper to find Y on the curve at a specific X
  const getInterpolatedY = (targetX: number, points: {x: number, y: number}[]) => {
     for (let i = 0; i < points.length - 1; i++) {
        if (targetX >= points[i].x && targetX <= points[i+1].x) {
           const t = (targetX - points[i].x) / (points[i+1].x - points[i].x);
           return points[i].y + (points[i+1].y - points[i].y) * t;
        }
     }
     return points[points.length - 1].y;
  };

  const currentActualY = getInterpolatedY(currentX, actualPoints);
  const currentProjectedY = getInterpolatedY(currentX, projectedPoints);

  return (
    <div className="w-full relative group select-none">
      
      <div 
        ref={containerRef}
        className="w-full aspect-[21/9] bg-[#0B0C0E] rounded-xl border border-border/30 relative overflow-hidden cursor-crosshair shadow-2xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="none" 
          className="w-full h-full block"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5D90A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F5D90A" stopOpacity="0" />
            </linearGradient>
            
            {/* Mask for the reveal effect */}
            <mask id="revealMask">
               <rect x="0" y="0" width={currentX} height={height} fill="white" />
            </mask>
          </defs>

          {/* Grouping both lines to use the same mask so they reveal together */}
          <g mask="url(#revealMask)">
              {/* 1. PROJECTED LINE (Gray) */}
              <path 
                d={projectedPath} 
                fill="none" 
                stroke="#2E2F33" 
                strokeWidth="2" 
                strokeLinejoin="round" 
                strokeLinecap="round"
              />

              {/* 2. ACTUAL LINE (Yellow) */}
              {/* Gradient Fill */}
              <path d={areaPath} fill="url(#areaGradient)" />
              {/* Line Stroke */}
              <path 
                d={actualPath} 
                fill="none" 
                stroke="#F5D90A" 
                strokeWidth="2" 
                strokeLinejoin="round" 
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(245,217,10,0.4)]"
              />
          </g>

          {/* 3. INTERACTIVE DOTS - Only show on hover/interaction or always? 
              User requested minimalist, so we keep dots but maybe fade them if not hovering.
              For now, keeping them visible as they track the lines.
          */}
          
          {/* Gray Dot */}
          <g transform={`translate(${currentX}, ${currentProjectedY})`} className="transition-opacity duration-300">
             <circle r="3" fill="#2E2F33" />
          </g>

          {/* Yellow Dot */}
          <g transform={`translate(${currentX}, ${currentActualY})`}>
             <circle r="4" fill="#0B0C0E" stroke="#F5D90A" strokeWidth="2" />
             <circle r="8" fill="#F5D90A" fillOpacity="0.15" />
          </g>
          
        </svg>
      </div>
    </div>
  );
};
