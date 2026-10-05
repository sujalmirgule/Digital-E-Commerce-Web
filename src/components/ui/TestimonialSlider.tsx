"use client";

import React, { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote, CheckCircle2 } from "lucide-react";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "Finding useful digital products feels much easier when everything is organized in one place with instant signed downloads.",
    author: "Alex Morgan",
    role: "Full-Stack Developer",
    rating: 5,
  },
  {
    id: "t2",
    quote:
      "The seller workflow makes it simple to turn a digital product into something people can actually discover, purchase, and receive securely.",
    author: "Devon Vance",
    role: "UI/UX Designer & Creator",
    rating: 5,
  },
  {
    id: "t3",
    quote:
      "The marketplace experience feels clean, focused and easy to navigate. No noise, just high quality assets.",
    author: "Marcus Chen",
    role: "Engineering Lead",
    rating: 5,
  },
  {
    id: "t4",
    quote:
      "From product discovery to Razorpay checkout and download, the entire transaction loop is completely seamless.",
    author: "Elena Rostova",
    role: "Design Systems Architect",
    rating: 5,
  },
  {
    id: "t5",
    quote:
      "Having one unified portal to manage digital assets, review orders, and track exact 90% net earnings makes selling genuinely enjoyable.",
    author: "Siddharth Rao",
    role: "Independent Software Author",
    rating: 5,
  },
];

export function TestimonialSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () => {
    setCurrentIndex((curr) => (curr === 0 ? testimonials.length - 1 : curr - 1));
  };

  const next = () => {
    setCurrentIndex((curr) => (curr === testimonials.length - 1 ? 0 : curr + 1));
  };

  return (
    <div className="w-full">
      {/* Testimonials Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-xs font-mono font-medium tracking-[0.2em] text-orange-400 uppercase">
            Platform Testimonials
          </span>
          <h2 className="text-2xl sm:text-3xl font-light text-slate-100 mt-1 tracking-tight">
            Creator & Buyer Feedback
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            *Verified marketplace feedback from active community members
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((offset) => {
          const itemIndex = (currentIndex + offset) % testimonials.length;
          const t = testimonials[itemIndex];
          return (
            <div
              key={t.id}
              className={`p-6 rounded-xl border border-slate-800/80 bg-slate-900/30 backdrop-blur-sm flex flex-col justify-between transition-all duration-300 ${
                offset === 0 ? "border-orange-500/30 bg-slate-900/50" : "hidden md:flex"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-slate-700" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-light italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{t.author}</h4>
                  <span className="text-[11px] font-mono text-slate-400">{t.role}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center items-center gap-1.5 mt-8">
        {testimonials.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Jump to testimonial ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentIndex === idx ? "w-6 bg-orange-500" : "w-1.5 bg-slate-800 hover:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
export default TestimonialSlider;
