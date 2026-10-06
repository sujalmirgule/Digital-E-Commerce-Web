"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HelpCircle, MessageSquare, BookOpen, Send, CheckCircle2 } from "lucide-react";

const FAQS = [
  {
    q: "How do I download my purchased files?",
    a: "Navigate to 'Library' or 'Downloads' in your dashboard sidebar. Click 'Download Asset' on any active item to generate a secure, temporary cryptographic download link.",
  },
  {
    q: "Are my digital downloads permanently accessible?",
    a: "Yes. Once an order is verified and paid, your active entitlement remains attached to your account for ongoing access, future updates, and version releases.",
  },
  {
    q: "Where can I find tax invoices and receipts?",
    a: "Official PDF payment receipts are automatically generated upon payment capture. You can view and download them in the 'Receipts' section anytime.",
  },
  {
    q: "How can I contact a seller directly?",
    a: "Product details and seller store names are listed on your order detail page. You can also submit a verified review with your feedback and rating.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support UPI, credit/debit cards, and net banking processed securely via Razorpay in Indian Rupees (INR).",
  },
];

export default function BuyerSupportPage() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    setTicketSent(true);
    setTicketSubject("");
    setTicketMessage("");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-[#3A2930]">
        <h1 className="text-3xl font-serif font-normal text-[#F7EFE2] tracking-tight">
          Buyer Help & Support
        </h1>
        <p className="text-[#BBAE9F] text-xs mt-1">
          Frequently asked questions, download assistance, and marketplace inquiry submissions.
        </p>
      </div>

      {/* Frequently Asked Questions */}
      <section className="space-y-4">
        <h2 className="text-base font-serif font-medium text-[#F7EFE2] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#F43F5E]" />
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#211815] border border-[#3A2930] space-y-1.5"
            >
              <h3 className="font-medium text-[#F7EFE2] text-sm">{faq.q}</h3>
              <p className="text-xs text-[#BBAE9F] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submit an Inquiry */}
      <section className="p-6 rounded-2xl bg-[#211815] border border-[#3A2930] space-y-4">
        <div>
          <h2 className="text-base font-serif font-medium text-[#F7EFE2] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#F43F5E]" />
            <span>Submit a Support Inquiry</span>
          </h2>
          <p className="text-xs text-[#BBAE9F] mt-1">
            Need help with an order, file corruptions, or download errors? Send a message to our support desk.
          </p>
        </div>

        {ticketSent ? (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Your support request has been logged. Our operations team typically responds within 24 hours.</span>
            </div>
            <button
              onClick={() => setTicketSent(false)}
              className="ml-3 underline hover:text-white"
            >
              Send Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#BBAE9F] font-medium mb-1.5">Subject</label>
              <input
                type="text"
                placeholder="e.g. Trouble accessing download link for Order ORD-20261005-..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120A12] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
              />
            </div>

            <div>
              <label className="block text-[#BBAE9F] font-medium mb-1.5">Description of Issue</label>
              <textarea
                rows={4}
                placeholder="Provide detailed description of the error, browser used, or steps to reproduce..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#120A12] border border-[#3A2930] text-[#F7EFE2] placeholder-[#BBAE9F]/40 focus:outline-none focus:border-[#E8D5B5]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#BBAE9F]/70">
                Direct email: <span className="text-[#E8D5B5]">support@marketify.io</span>
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white font-medium flex items-center gap-2 shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Inquiry</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Quick Navigation Footer */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#211815]/60 border border-[#3A2930] text-xs">
        <span className="text-[#BBAE9F]">Need to check order status or view receipts?</span>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders" className="text-[#E8D5B5] hover:text-white underline">
            Orders
          </Link>
          <span className="text-[#3A2930]">·</span>
          <Link href="/dashboard/receipts" className="text-[#E8D5B5] hover:text-white underline">
            Receipts
          </Link>
          <span className="text-[#3A2930]">·</span>
          <Link href="/dashboard/library" className="text-[#E8D5B5] hover:text-white underline">
            Library
          </Link>
        </div>
      </div>
    </div>
  );
}
