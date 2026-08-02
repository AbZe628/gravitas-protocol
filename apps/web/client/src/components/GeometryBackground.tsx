import React from 'react';
import { buildField, constructionLines } from '../design/geometry';

interface GeometryBackgroundProps {
  className?: string;
}

const GeometryBackground: React.FC<GeometryBackgroundProps> = ({ className = "" }) => {
  const cx = 500;
  const cy = 500;
  const R = 400;
  
  const layers = buildField({ cx, cy, R });
  const lines = constructionLines(cx, cy, R);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-20 ${className}`}>
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full text-gold/20 g-field-drift"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <path d={lines} strokeOpacity="0.1" />
        {layers.map((layer, i) => (
          <path
            key={i}
            d={layer.d}
            strokeOpacity={0.1 + layer.t * 0.4}
            fill="currentColor"
            fillOpacity={layer.t * 0.05}
          />
        ))}
      </svg>
    </div>
  );
};

export default GeometryBackground;
