"use client";

import React, { useState, useEffect } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface SpatialBackgroundProps {
  children?: React.ReactNode;
  showGlow?: boolean;
  showRipples?: boolean;
  className?: string;
}

export function SpatialBackground({
  children,
  showGlow = true,
  showRipples = true,
  className = "",
}: SpatialBackgroundProps) {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000, opacity: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    if (!showGlow) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY,
        opacity: 1,
      });
    };

    const handleMouseLeave = () => {
      setMousePos((prev) => ({ ...prev, opacity: 0 }));
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [showGlow]);

  useEffect(() => {
    if (!showRipples) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select")
      ) {
        return;
      }

      const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY };
      setRipples((prev) => [...prev.slice(-4), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 1000);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [showRipples]);

  return (
    <div
      className={`relative min-h-screen w-full bg-[#120A12] text-[#F7EFE2] overflow-hidden ${className}`}
    >
      {/* Background SVG Subtle Luxury Grid & Coordinates */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="velvetGridPattern"
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 72 0 L 0 0 0 72"
              fill="none"
              stroke="#3A2930"
              strokeWidth="0.65"
              strokeOpacity="0.45"
            />
          </pattern>
          <radialGradient id="velvetAmbientGlow" cx="50%" cy="15%" r="60%">
            <stop offset="0%" stopColor="rgba(244, 63, 94, 0.06)" />
            <stop offset="50%" stopColor="rgba(33, 24, 21, 0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#velvetGridPattern)" />
        <rect width="100%" height="100%" fill="url(#velvetAmbientGlow)" />

        {/* Spatial Axis Lines */}
        <line
          x1="0"
          y1="14%"
          x2="100%"
          y2="14%"
          stroke="#3A2930"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
        <line
          x1="0"
          y1="86%"
          x2="100%"
          y2="86%"
          stroke="#3A2930"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
        <line
          x1="12%"
          y1="0"
          x2="12%"
          y2="100%"
          stroke="#3A2930"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />
        <line
          x1="88%"
          y1="0"
          x2="88%"
          y2="100%"
          stroke="#3A2930"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        />

        {/* Intersection Dots in Cream */}
        <circle cx="12%" cy="14%" r="1.5" fill="#E8D5B5" fillOpacity="0.4" />
        <circle cx="88%" cy="14%" r="1.5" fill="#E8D5B5" fillOpacity="0.4" />
        <circle cx="12%" cy="86%" r="1.5" fill="#E8D5B5" fillOpacity="0.4" />
        <circle cx="88%" cy="86%" r="1.5" fill="#E8D5B5" fillOpacity="0.4" />
      </svg>

      {/* Floating Micro-Particles */}
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "18%", left: "10%", animationDelay: "0.5s" }}
      />
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "62%", left: "85%", animationDelay: "1.2s" }}
      />
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "35%", left: "90%", animationDelay: "1.8s" }}
      />
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "80%", left: "18%", animationDelay: "2.3s" }}
      />

      {/* Mouse Follow Ambient Glow */}
      {showGlow && (
        <div
          className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl z-0 transition-opacity duration-300"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            opacity: mousePos.opacity,
            width: "480px",
            height: "480px",
            background:
              "radial-gradient(circle, rgba(244, 63, 94, 0.05) 0%, rgba(232, 213, 181, 0.02) 40%, transparent 70%)",
            willChange: "left, top, opacity",
          }}
        />
      )}

      {/* Click Ripples in Soft Rose */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none rounded-full border border-rose-500/40 z-50 animate-ping"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: "8px",
            height: "8px",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Actual Content Container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">{children}</div>
    </div>
  );
}
export default SpatialBackground;

