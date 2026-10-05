"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is this platform?",
    answer:
      "Aura is a specialized digital product marketplace connecting software creators, designers, and authors with buyers looking for high-quality, verified digital tools, templates, audio, UI kits, and documents.",
  },
  {
    question: "What can I buy on the marketplace?",
    answer:
      "You can discover and purchase curated digital downloads including developer source code, component packages, UI design kits, digital templates, and audio assets directly from verified creators.",
  },
  {
    question: "How does purchasing work?",
    answer:
      "When you click 'Buy Now', a secure Razorpay checkout order is generated using the authoritative database price (in exact integer paise). You complete payment using UPI, Cards, or NetBanking, and our servers verify the cryptographic signature before provisioning your access.",
  },
  {
    question: "How do I become a seller?",
    answer:
      "Any registered user can apply to become a seller through the Seller Portal by providing their store name, bio, PAN, and bank payout information. Once submitted, our admin team reviews your application.",
  },
  {
    question: "How does product approval work?",
    answer:
      "After creating a draft product and uploading your digital zip/package via presigned URL, you submit it for moderation. Platform administrators review the product content, description, and file integrity before approving it to 'PUBLISHED' status.",
  },
  {
    question: "Where can I access my purchased products?",
    answer:
      "Once payment is captured, an atomic Entitlement is granted to your account. You can immediately access and download all your purchases from your Buyer Dashboard under the 'Digital Library' tab.",
  },
  {
    question: "How are payments processed?",
    answer:
      "Payments are securely processed through Razorpay using industry-standard TLS encryption. The platform operates on a strict integer paise ledger with an automated 10% platform fee and 90% net seller earnings settlement.",
  },
  {
    question: "How do secure downloads work?",
    answer:
      "Your digital files are stored in private object storage. When you request a download, our server verifies your active purchase entitlement and generates a signed URL with a strictly enforced 15-minute expiration window to protect creator assets.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`rounded-xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? "border-orange-500/40 bg-slate-900/60 shadow-lg shadow-black/40"
                : "border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80 hover:bg-slate-900/40"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-4"
              aria-expanded={isOpen}
            >
              <span className="text-sm sm:text-base font-medium text-slate-200 hover:text-orange-400 transition-colors">
                {faq.question}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-orange-400" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-6 pb-5 pt-1 border-t border-slate-800/40 text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
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
