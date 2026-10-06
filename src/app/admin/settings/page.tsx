"use client";

import React from "react";
import Link from "next/link";
import {
  Settings,
  Receipt,
  Activity,
  History,
  Shield,
  Palette,
  Server,
  ArrowRight,
} from "lucide-react";

export default function AdminSettingsHubPage() {
  const SETTING_MODULES = [
    {
      title: "Receipt & Fiscal Templates",
      description:
        "Configure platform invoice branding, color themes, watermarks, headers, and historical template versioning.",
      href: "/admin/settings/receipt",
      icon: Receipt,
      badge: "Invoicing",
    },
    {
      title: "System Health & Infrastructure",
      description:
        "Inspect PostgreSQL database latency, server uptime, Node.js runtime environment, and operational telemetry.",
      href: "/admin/health",
      icon: Activity,
      badge: "Diagnostics",
    },
    {
      title: "Governance & Audit Trail",
      description:
        "Inspect comprehensive administrator event logs, security actions, status transitions, and compliance history.",
      href: "/admin/audit-logs",
      icon: History,
      badge: "Security",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
          <Settings className="w-6 h-6 text-[#F43F5E]" />
          <span>Platform Settings & Governance</span>
        </h1>
        <p className="text-xs text-[#BBAE9F] mt-1">
          Authoritative configuration controls for platform branding, system telemetry, and administrative compliance.
        </p>
      </div>

      {/* Grid of settings options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {SETTING_MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="bg-[#211815] border border-[#3A2930] hover:border-[#E8D5B5]/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#1B101B] border border-[#3A2930] flex items-center justify-center text-[#FB7185] group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#1B101B] text-[#E8D5B5] border border-[#3A2930]">
                    {mod.badge}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base font-serif text-[#F7EFE2] group-hover:text-[#E8D5B5] transition-colors">
                    {mod.title}
                  </h2>
                  <p className="text-xs text-[#BBAE9F] leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#3A2930]/70 flex items-center justify-between text-xs text-[#E8D5B5] font-medium group-hover:text-white transition-colors">
                <span>Manage Configuration</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
