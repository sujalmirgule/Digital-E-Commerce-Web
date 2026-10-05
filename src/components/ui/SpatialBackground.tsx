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
      // Avoid creating ripples on interactive buttons/inputs
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
      className={`relative min-h-screen w-full bg-[#06080d] text-slate-100 overflow-hidden ${className}`}
    >
      {/* Background SVG Grid & Spatial Coordinates */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="spatialGridPattern"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="rgba(148, 163, 184, 0.04)"
              strokeWidth="0.75"
            />
          </pattern>
          <radialGradient id="spatialGlowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(249, 115, 22, 0.08)" />
            <stop offset="40%" stopColor="rgba(148, 163, 184, 0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#spatialGridPattern)" />

        {/* Spatial Axis Lines */}
        <line
          x1="0"
          y1="16%"
          x2="100%"
          y2="16%"
          className="grid-line"
          style={{ animationDelay: "0.3s" }}
        />
        <line
          x1="0"
          y1="84%"
          x2="100%"
          y2="84%"
          className="grid-line"
          style={{ animationDelay: "0.8s" }}
        />
        <line
          x1="14%"
          y1="0"
          x2="14%"
          y2="100%"
          className="grid-line"
          style={{ animationDelay: "1.2s" }}
        />
        <line
          x1="86%"
          y1="0"
          x2="86%"
          y2="100%"
          className="grid-line"
          style={{ animationDelay: "1.6s" }}
        />

        {/* Intersection Dots */}
        <circle cx="14%" cy="16%" r="2" className="detail-dot" style={{ animationDelay: "1.8s" }} />
        <circle cx="86%" cy="16%" r="2" className="detail-dot" style={{ animationDelay: "2.1s" }} />
        <circle cx="14%" cy="84%" r="2" className="detail-dot" style={{ animationDelay: "2.4s" }} />
        <circle cx="86%" cy="84%" r="2" className="detail-dot" style={{ animationDelay: "2.7s" }} />
        <circle cx="50%" cy="50%" r="1.5" className="detail-dot" style={{ animationDelay: "3s" }} />
      </svg>

      {/* Floating Micro-Particles */}
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "18%", left: "12%", animationDelay: "0.5s" }}
      />
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "65%", left: "82%", animationDelay: "1.2s" }}
      />
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "35%", left: "88%", animationDelay: "1.8s" }}
      />
      <div
        className="floating-element-animate pointer-events-none fixed"
        style={{ top: "78%", left: "22%", animationDelay: "2.3s" }}
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
              "radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, rgba(100, 116, 139, 0.03) 40%, transparent 70%)",
            willChange: "left, top, opacity",
          }}
        />
      )}

      {/* Click Ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none rounded-full border border-orange-500/30 z-50 animate-ping"
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
