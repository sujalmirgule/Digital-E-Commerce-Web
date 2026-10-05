"use client";

import React, { useState } from "react";
import Link from "next/link";

const FAQS = [
  {
    q: "How do I download my purchased files?",
    a: "Navigate to 'My Library' or 'Downloads' in your dashboard sidebar. Click 'Download File' on any active item to generate a secure, temporary signed download link.",
  },
  {
    q: "Are my digital downloads permanently accessible?",
    a: "Yes. Once an order is verified and paid, your active entitlement remains attached to your account for ongoing access and updates.",
  },
  {
    q: "Where can I find tax invoices and receipts?",
    a: "Official PDF payment receipts are automatically generated upon payment capture. You can view and download them in the 'Receipts' section anytime.",
  },
  {
    q: "How can I contact a seller directly?",
    a: "Product details and seller store names are listed on your order detail page. You can also write a verified review with your feedback.",
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
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">Buyer Help & Support</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Frequently asked questions, download assistance, and marketplace inquiry submissions.
        </p>
      </div>

      {/* Frequently Asked Questions */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>💡</span> Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
            >
              <h3 className="font-semibold text-white text-sm">{faq.q}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Submit an Inquiry */}
      <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>💬</span> Submit a Support Inquiry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Need help with an order, file corruptions, or download errors? Send a message to our support desk.
          </p>
        </div>

        {ticketSent ? (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium flex items-center justify-between">
            <span>✅ Your support request has been logged. Our operations team typically responds within 24 hours.</span>
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
              <label className="block text-slate-300 font-medium mb-1">Subject</label>
              <input
                type="text"
                placeholder="e.g. Trouble accessing download link for Order ORD-20261005-..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Detailed Description</label>
              <textarea
                rows={4}
                placeholder="Please describe the issue in detail, including any relevant order IDs or file names..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Submit Inquiry
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Quick links */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
        <Link href="/dashboard/orders" className="hover:text-slate-300">
          Order History →
        </Link>
        <Link href="/dashboard/receipts" className="hover:text-slate-300">
          Receipts Archive →
        </Link>
        <Link href="/dashboard/library" className="hover:text-slate-300">
          My Digital Library →
        </Link>
      </div>
    </div>
  );
}
