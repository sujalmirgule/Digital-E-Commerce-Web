"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "The marketplace feels less like browsing a store and more like discovering something genuinely useful.",
    author: "Elena Rostova",
    role: "Design Systems Architect",
  },
  {
    id: "t2",
    quote:
      "Having one studio to publish digital codebases, set prices, and receive direct 90% net earnings transformed my side projects into a real business.",
    author: "Sujal Verma",
    role: "Full-Stack Software Creator",
  },
  {
    id: "t3",
    quote:
      "Every product is curated with high craft. 15-minute expiring signed downloads give me complete peace of mind.",
    author: "Alex Morgan",
    role: "Product Engineer",
  },
  {
    id: "t4",
    quote:
      "The buyer library experience is unmatched. Everything I purchase is organized, permanent, and instantly accessible whenever I build.",
    author: "Sarah Khan",
    role: "Freelance Creative Lead",
  },
  {
    id: "t5",
    quote:
      "Fast, private, and mathematically exact. No subscriptions or hidden fees — just creator-first digital commerce.",
    author: "Devon Vance",
    role: "Independent Studio Founder",
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

  const current = testimonials[currentIndex];

  return (
    <div className="w-full max-w-4xl mx-auto text-center py-6">
      {/* Decorative Icon */}
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#211815] border border-[#3A2930] mb-8 text-[#E8D5B5]">
        <Quote className="w-5 h-5 text-[#F43F5E]" />
      </div>

      {/* Large Editorial Quote */}
      <div className="min-h-[160px] flex items-center justify-center px-4">
        <blockquote className="text-xl sm:text-2xl md:text-3xl font-editorial font-light text-[#F7EFE2] leading-relaxed transition-all duration-300">
          “{current.quote}”
        </blockquote>
      </div>

      {/* Author & Role */}
      <div className="mt-8 flex flex-col items-center">
        <span className="text-sm font-medium text-[#E8D5B5]">
          {current.author}
        </span>
        <span className="text-xs text-[#BBAE9F] tracking-wide mt-0.5">
          {current.role}
        </span>
      </div>

      {/* Editorial Counter & Arrows: ← 01 / 05 → */}
      <div className="flex items-center justify-center gap-6 mt-10">
        <button
          onClick={prev}
          aria-label="Previous testimonial"
          className="p-2.5 rounded-full border border-[#3A2930] bg-[#211815] text-[#BBAE9F] hover:text-[#F7EFE2] hover:border-[#E8D5B5]/60 hover:scale-105 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#BBAE9F]">
          <span className="text-[#F43F5E] font-bold">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <span>/</span>
          <span>{String(testimonials.length).padStart(2, "0")}</span>
        </div>

        <button
          onClick={next}
          aria-label="Next testimonial"
          className="p-2.5 rounded-full border border-[#3A2930] bg-[#211815] text-[#BBAE9F] hover:text-[#F7EFE2] hover:border-[#E8D5B5]/60 hover:scale-105 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
export default TestimonialSlider;

