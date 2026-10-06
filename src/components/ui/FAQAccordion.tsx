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
      "Folio is a curated digital marketplace for creators, developers, and designers. We connect independent creators with builders seeking verified digital tools, boilerplates, templates, Figma systems, and e-books.",
  },
  {
    question: "What types of products are available?",
    answer:
      "Explore developer boilerplates, UI design kits, Notion workspaces, business spreadsheets, AI prompt packs, and educational guides — all vetted for quality and hosted on secure infrastructure.",
  },
  {
    question: "How does purchasing and payment work?",
    answer:
      "Select any digital product and checkout instantly with Razorpay, supporting UPI (Google Pay, PhonePe, Paytm), Net Banking, and Credit/Debit cards. Calculations use exact integer paise with zero discrepancies.",
  },
  {
    question: "How do I become a seller?",
    answer:
      "Apply through the Seller Onboarding portal with your store details and payout banking information. Once approved by our team, you can publish products and keep 90% of all gross sales.",
  },
  {
    question: "How does the moderation and approval process work?",
    answer:
      "Every seller application and digital product undergoes verification by our administration team before going live. This guarantees genuine assets, accurate descriptions, and clean files for buyers.",
  },
  {
    question: "Where do I access my purchased digital files?",
    answer:
      "Purchases are immediately and permanently linked to your personal Buyer Library. You can log in at any time to re-download files, check version updates, and view invoices.",
  },
  {
    question: "How do secure file downloads work?",
    answer:
      "All digital files are stored in private encrypted storage. When you click download, our server verifies your purchase entitlement and generates a signed download URL valid for 15 minutes.",
  },
  {
    question: "How and when are seller earnings settled?",
    answer:
      "Earnings are recorded transparently in your seller ledger immediately upon sale. After standard clearance, available balances can be requested for direct payout to your verified bank account.",
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
            className={`rounded-xl border transition-all duration-200 overflow-hidden bg-[#FFFFFF] ${
              isOpen
                ? "border-[#3B2418] shadow-sm"
                : "border-[#E6DBD1] hover:border-[#D8BFA5]"
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full px-6 py-4.5 sm:py-5 flex items-center justify-between text-left gap-4 group"
              aria-expanded={isOpen}
            >
              <span
                className={`text-sm sm:text-base font-serif font-medium transition-colors ${
                  isOpen ? "text-[#111111]" : "text-[#3B2418] group-hover:text-[#111111]"
                }`}
              >
                {faq.question}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#6B4632] shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-[#B42318]" : "group-hover:text-[#111111]"
                }`}
              />
            </button>

            {/* Subtle warm accent line */}
            {isOpen && (
              <div className="h-0.5 w-full bg-[#B42318]/20" />
            )}

            {isOpen && (
              <div className="px-6 pb-5 pt-3 text-xs sm:text-sm text-[#6B4632] leading-relaxed font-light">
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
