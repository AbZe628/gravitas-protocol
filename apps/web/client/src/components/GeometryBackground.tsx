import React, { useMemo } from 'react';

interface GeometryBackgroundProps {
  variant?: 'complex' | 'simple';
  className?: string;
}

/**
 * Generates Islamic girih-inspired geometry programmatically.
 * Eight-fold symmetry with recursive subdivision.
 */
const GeometryBackground: React.FC<GeometryBackgroundProps> = ({ 
  variant = 'complex', 
  className = "" 
}) => {
  const paths = useMemo(() => {
    const cx = 500;
    const cy = 500;
    const R = 400;
    const n = 8;
    
    // Main star polygon construction
    const getPoints = (radius: number, sides: number, offset = 0) => {
      const pts = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + offset;
        pts.push({
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle)
        });
      }
      return pts;
    };

    const drawStar = (radius: number, step = 3) => {
      const pts = getPoints(radius, n, -Math.PI / 2);
      let d = "";
      for (let i = 0; i < n; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + step) % n];
        d += ` M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      }
      return d;
    };

    // Layered surfaces (Hadid influence)
    const layers = [];
    const count = variant === 'complex' ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const radius = R * (0.4 + (i / count) * 0.6);
      const opacity = 0.05 + (i / count) * 0.1;
      layers.push({ d: drawStar(radius, 3), opacity });
    }

    return layers;
  }, [variant]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none ${className}`}>
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full text-gold/20 opacity-40"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        {paths.map((layer, i) => (
          <path
            key={i}
            d={layer.d}
            strokeOpacity={layer.opacity}
            className="transition-all duration-1000 ease-in-out"
          />
        ))}
        {/* Subtle drift animation per instructions */}
        <style>{`
          @keyframes girih-drift {
            from { transform: rotate(0deg) scale(1); }
            to { transform: rotate(360deg) scale(1.1); }
          }
          .girih-animate {
            transform-origin: center;
            animation: girih-drift 120s linear infinite;
          }
        `}</style>
        <g className="girih-animate">
           {/* Recursive subdivision would go here for complex variant */}
        </g>
      </svg>
    </div>
  );
};

export default GeometryBackground;
