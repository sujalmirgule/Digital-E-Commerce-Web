"use client";

import React from "react";

interface SpatialBackgroundProps {
  children?: React.ReactNode;
  showGlow?: boolean;
  showRipples?: boolean;
  className?: string;
}

/**
 * Editorial Page Background Wrapper
 * 
 * High performance warm editorial canvas (#FAF7F2) with subtle structural grid lines.
 * Free of heavy JS event listeners, continuous particle loops, and neon effects.
 */
export function SpatialBackground({
  children,
  className = "",
}: SpatialBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen w-full bg-[#FAF7F2] text-[#151311] flex flex-col ${className}`}
    >
      {/* Editorial Structural Background Texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-35"
        style={{
          backgroundImage: `radial-gradient(#C8AA91 0.75px, transparent 0.75px)`,
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />

      {/* Main Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">{children}</div>
    </div>
  );
}

export default SpatialBackground;
