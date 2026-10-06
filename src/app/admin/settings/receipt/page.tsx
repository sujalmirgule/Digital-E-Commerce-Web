"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  Receipt,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
  Palette,
  Eye,
  Building,
  Mail,
  Phone,
  Globe,
  FileText,
} from "lucide-react";

interface ReceiptTemplateConfig {
  id: string;
  name?: string;
  version: number;
  platformName: string;
  receiptTitle: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  headerVisible: boolean;
  headerText: string;
  footerVisible: boolean;
  footerText: string;
  backgroundOpacity: number;
  watermarkText: string;
  watermarkOpacity: number;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
  websiteUrl: string;
}

export default function AdminReceiptTemplateSettingsPage() {
  const { token } = useAdminAuth();

  const [template, setTemplate] = useState<ReceiptTemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTemplate = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/admin/settings/receipt", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to load receipt template");
      }
      setTemplate(data.data.template || data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTemplate();
    }
  }, [token]);

  const handleChange = (field: keyof ReceiptTemplateConfig, value: any) => {
    setTemplate((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !template) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        platformName: template.platformName,
        receiptTitle: template.receiptTitle,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        textColor: template.textColor,
        backgroundColor: template.backgroundColor,
        headerVisible: template.headerVisible,
        headerText: template.headerText,
        footerVisible: template.footerVisible,
        footerText: template.footerText,
        backgroundOpacity: Number(template.backgroundOpacity),
        watermarkText: template.watermarkText,
        watermarkOpacity: Number(template.watermarkOpacity),
        supportEmail: template.supportEmail,
        supportPhone: template.supportPhone,
        companyAddress: template.companyAddress,
        websiteUrl: template.websiteUrl,
      };

      const res = await fetch("/api/v1/admin/settings/receipt", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save receipt template");
      }

      const updated = data.data.template || data.data;
      setTemplate(updated);
      setSuccess(`Receipt template updated successfully! Active version is now v${updated.version}. Historical receipts remain preserved under their respective issuance versions.`);
    } catch (err: any) {
      setError(err.message || "Failed to save receipt template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[#BBAE9F]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F43F5E] mb-3" />
        <p className="text-xs font-mono">Retrieving active receipt template configuration...</p>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-xs text-[#BBAE9F] hover:text-[#E8D5B5] transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Platform Settings
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-[#F7EFE2] flex items-center gap-3">
              <Receipt className="w-6 h-6 text-[#F43F5E]" />
              <span>Receipt Template Management</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1B101B] text-[#E8D5B5] border border-[#3A2930]">
                v{template.version}
              </span>
            </h1>
            <p className="text-xs text-[#BBAE9F] mt-1">
              Customize invoice branding, palette, typography, headers, and watermarks for all new transactions.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-medium bg-[#F43F5E] hover:bg-[#FB7185] text-white flex items-center gap-2 shadow-lg shadow-rose-900/25 transition shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Template Changes"}</span>
          </button>
        </div>
      </div>

      {/* Historical Integrity Guarantee Banner */}
      <div className="p-4 bg-[#211815] border border-[#3A2930] rounded-2xl flex items-start gap-3 text-xs text-[#BBAE9F]">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-[#F7EFE2] font-medium block">
            Historical Financial Integrity Guaranteed
          </span>
          <p className="leading-relaxed">
            When you save modifications here, the platform automatically increments the template version to{" "}
            <span className="font-mono text-[#E8D5B5]">v{template.version + 1}</span>. Past receipts already issued to customers retain their original design and snapshot forever.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Form (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Brand & Titles */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#FB7185]" /> Platform Branding
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Brand / Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={template.platformName}
                  onChange={(e) => handleChange("platformName", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Receipt Document Title
                </label>
                <input
                  type="text"
                  required
                  value={template.receiptTitle}
                  onChange={(e) => handleChange("receiptTitle", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#FB7185]" /> Visual Theme & Palette
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={template.primaryColor}
                    onChange={(e) => handleChange("primaryColor", e.target.value)}
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={template.secondaryColor}
                    onChange={(e) => handleChange("secondaryColor", e.target.value)}
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.textColor}
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={template.textColor}
                    onChange={(e) => handleChange("textColor", e.target.value)}
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.backgroundColor}
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={template.backgroundColor}
                    onChange={(e) => handleChange("backgroundColor", e.target.value)}
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Watermark & Background Opacity */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#FB7185]" /> Watermark & Opacity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={template.watermarkText}
                  onChange={(e) => handleChange("watermarkText", e.target.value)}
                  placeholder="PAID / OFFICIAL"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Watermark Opacity ({template.watermarkOpacity})
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={template.watermarkOpacity}
                  onChange={(e) => handleChange("watermarkOpacity", parseFloat(e.target.value))}
                  className="w-full mt-2 accent-[#F43F5E]"
                />
              </div>
            </div>
          </div>

          {/* Header & Footer Text */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FB7185]" /> Header & Footer Copy
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Header Text
                </label>
                <input
                  type="text"
                  value={template.headerText}
                  onChange={(e) => handleChange("headerText", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Footer Legal Notice / Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={template.footerText}
                  onChange={(e) => handleChange("footerText", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-[#211815] border border-[#3A2930] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase text-[#E8D5B5] tracking-wider border-b border-[#3A2930] pb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FB7185]" /> Contact & Issuer Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={template.supportEmail}
                  onChange={(e) => handleChange("supportEmail", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Support Phone
                </label>
                <input
                  type="text"
                  value={template.supportPhone}
                  onChange={(e) => handleChange("supportPhone", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase text-[#BBAE9F] mb-1">
                  Company Legal Address
                </label>
                <input
                  type="text"
                  value={template.companyAddress}
                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#1B101B] border border-[#3A2930] text-[#F7EFE2] focus:outline-none focus:border-[#E8D5B5] transition"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Live Visual Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#E8D5B5]">
            <span className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-[#FB7185]" /> Live Receipt Preview
            </span>
            <span className="text-[10px] text-[#BBAE9F]">Simulated v{template.version + 1}</span>
          </div>

          {/* Preview Card */}
          <div
            className="rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-[#3A2930]"
            style={{
              backgroundColor: template.backgroundColor,
              color: template.textColor,
            }}
          >
            {/* Watermark in background */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-bold text-6xl tracking-widest uppercase rotate-[-25deg]"
              style={{
                color: template.primaryColor,
                opacity: template.watermarkOpacity,
              }}
            >
              {template.watermarkText}
            </div>

            <div className="relative z-10 space-y-5">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: `${template.textColor}20` }}>
                <div>
                  <h3 className="font-serif text-lg font-bold" style={{ color: template.primaryColor }}>
                    {template.platformName}
                  </h3>
                  <p className="text-[10px] opacity-75">{template.headerText}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold block" style={{ color: template.secondaryColor }}>
                    {template.receiptTitle}
                  </span>
                  <span className="text-[10px] font-mono opacity-60">INV-2026-DEMO</span>
                </div>
              </div>

              {/* Sample Line Item */}
              <div className="space-y-2 py-2">
                <div className="text-[11px] font-mono uppercase opacity-75 flex justify-between">
                  <span>Product / License</span>
                  <span>Amount</span>
                </div>
                <div className="p-2.5 rounded-xl flex items-center justify-between text-xs" style={{ backgroundColor: `${template.secondaryColor}10` }}>
                  <div>
                    <div className="font-medium">Modern UI Design System</div>
                    <div className="text-[10px] opacity-70">Commercial License</div>
                  </div>
                  <div className="font-bold">₹1,999.00</div>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-3 border-t text-sm font-bold" style={{ borderColor: `${template.textColor}20` }}>
                <span>Total Paid</span>
                <span style={{ color: template.primaryColor }}>₹1,999.00</span>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t text-[10px] opacity-70 leading-relaxed text-center" style={{ borderColor: `${template.textColor}20` }}>
                <p>{template.footerText}</p>
                <p className="mt-1 font-mono">{template.supportEmail} • {template.companyAddress}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
