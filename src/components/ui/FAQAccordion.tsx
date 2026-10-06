"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is this marketplace?",
    answer:
      "Marketify is an editorial digital marketplace designed for creators and builders. We connect independent developers, designers, and authors with buyers looking for high-quality, verified digital tools, templates, UI kits, codebases, and audio resources.",
  },
  {
    question: "What can I buy on the marketplace?",
    answer:
      "You can discover and purchase digital tools, SaaS boilerplates, Notion workspaces, developer UI kits, icon systems, e-books, and creative assets — all verified for quality and hosted securely.",
  },
  {
    question: "How does purchasing work?",
    answer:
      "Select any digital product and click 'Buy Now'. Payment is processed with 256-bit TLS encryption using Razorpay (supporting UPI, Cards, and NetBanking). The system operates on exact integer paise calculations with zero floating-point discrepancies.",
  },
  {
    question: "How do I become a seller?",
    answer:
      "Apply through the Creator Studio with your store details and payout information. Once approved by our moderation team, you can immediately publish products and retain 90% of all gross sales.",
  },
  {
    question: "How does product approval work?",
    answer:
      "Every product submitted by creators undergoes thorough administrative review to verify file integrity, descriptions, licensing terms, and asset quality before being published to the public marketplace.",
  },
  {
    question: "Where can I access my purchased products?",
    answer:
      "Upon payment confirmation, lifetime access is instantly granted to your account. You can view, organize, and download all your assets in your Buyer Dashboard under 'Digital Library'.",
  },
  {
    question: "How do secure downloads work?",
    answer:
      "Your purchased assets are stored in private cloud storage. When you initiate a download, our server authenticates your purchase entitlement and generates a signed URL with a strict 15-minute expiration window to protect creator intellectual property.",
  },
  {
    question: "How are creator payments processed?",
    answer:
      "Creator earnings are credited automatically to your studio ledger after the standard 10% platform fee. Available balances can be settled directly to your verified bank account.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-[#211815] ${
              isOpen
                ? "border-[#E8D5B5]/60 shadow-lg shadow-black/50"
                : "border-[#3A2930] hover:border-[#523B44]"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-4 group"
              aria-expanded={isOpen}
            >
              <span
                className={`text-sm sm:text-base font-medium transition-colors ${
                  isOpen ? "text-[#F7EFE2]" : "text-[#E8D5B5] group-hover:text-[#F7EFE2]"
                }`}
              >
                {faq.question}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#BBAE9F] shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-[#F43F5E]" : "group-hover:text-[#E8D5B5]"
                }`}
              />
            </button>

            {/* Rose accent line that expands beneath the question */}
            {isOpen && (
              <div className="h-0.5 w-full bg-gradient-to-r from-[#F43F5E] via-[#FB7185]/60 to-transparent" />
            )}

            {isOpen && (
              <div className="px-6 pb-5 pt-3 text-xs sm:text-sm text-[#BBAE9F] leading-relaxed font-light">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
export default FAQAccordion;

