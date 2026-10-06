"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../AdminAuthContext";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
  Palette,
  Eye,
  Mail,
  Phone,
  Building,
  Upload,
  Sliders,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Stamp,
  Check,
} from "lucide-react";

interface ReceiptTemplateConfig {
  id: string;
  name?: string;
  version: number;
  platformName: string;
  receiptTitle: string;
  logoKey?: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  headerVisible: boolean;
  headerText: string;
  footerVisible: boolean;
  footerText: string;
  backgroundImageKey?: string | null;
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local object URLs for live preview of uploaded files
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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
      const t = data.data.template || data.data;
      setTemplate({
        ...t,
        primaryColor: t.primaryColor || "#3B261C",
        secondaryColor: t.secondaryColor || "#684332",
        textColor: t.textColor || "#151311",
        backgroundColor: t.backgroundColor || "#FFFFFF",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTemplate();
    }
  }, [token]);

  const handleChange = (field: keyof ReceiptTemplateConfig, value: unknown) => {
    setTemplate((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "background"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (type === "logo") {
      setUploadingLogo(true);
      setLogoPreviewUrl(URL.createObjectURL(file));
    } else {
      setUploadingBg(true);
    }
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/v1/admin/receipts/template/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to upload asset");
      }

      const storageKey = data.data.storageKey;
      if (type === "logo") {
        handleChange("logoKey", storageKey);
        setSuccess("Branding logo uploaded successfully and attached to template.");
      } else {
        handleChange("backgroundImageKey", storageKey);
        setSuccess("Background image asset uploaded successfully.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingBg(false);
    }
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
        logoKey: template.logoKey || null,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        textColor: template.textColor,
        backgroundColor: template.backgroundColor,
        headerVisible: template.headerVisible,
        headerText: template.headerText,
        footerVisible: template.footerVisible,
        footerText: template.footerText,
        backgroundImageKey: template.backgroundImageKey || null,
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
        throw new Error(data.error?.message || "Failed to save template changes");
      }

      setSuccess(`Receipt template updated successfully! New version: v${data.data.version}`);
      setTemplate(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-[#8A6048]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#A94432]" />
        <p className="text-xs font-semibold">Loading receipt template customizer...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-600 dark:text-rose-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <h3 className="font-bold text-base">Failed to Load Template</h3>
        <p className="text-xs mt-1">{error || "Could not retrieve default receipt template configuration."}</p>
        <button
          onClick={fetchTemplate}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-[#3B261C] text-[#FAF7F2] rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3B261C]/20 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/receipts"
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[#3B261C] dark:text-[#FAF7F2] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[#151311] dark:text-[#FAF7F2]">
              Receipt Customizer & Live Studio
            </h1>
            <p className="text-xs text-[#8A6048] dark:text-[#C8AA91] mt-0.5">
              Current active template: <strong className="text-[#151311] dark:text-[#FAF7F2]">v{template.version}</strong> • Historical invoices remain immutably preserved.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchTemplate}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-stone-800 text-[#3B261C] dark:text-[#FAF7F2] border border-stone-200 dark:border-stone-700 rounded-xl transition"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#A94432] hover:bg-[#8A3626] text-white rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save & Publish Version
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Studio Grid: 7 cols Form, 5 cols Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Settings Form (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Branding & Logo */}
          <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-serif font-bold uppercase text-[#3B261C] dark:text-[#FAF7F2] tracking-wider border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#A94432]" /> Marketplace Branding & Logo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Marketplace Platform Name
                </label>
                <input
                  type="text"
                  value={template.platformName}
                  onChange={(e) => handleChange("platformName", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Document Heading Title
                </label>
                <input
                  type="text"
                  value={template.receiptTitle}
                  onChange={(e) => handleChange("receiptTitle", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
              <label className="block text-[11px] font-bold text-[#8A6048] mb-1.5">
                Marketplace Logo Asset (PNG, JPG, WebP)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileUpload(e, "logo")}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="px-3.5 py-2 text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[#3B261C] dark:text-[#FAF7F2] border border-stone-300 dark:border-stone-700 rounded-xl transition inline-flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5 text-[#A94432]" />
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </button>
                <span className="text-[11px] text-[#8A6048]">
                  {template.logoKey ? "✓ Custom logo active" : "Using standard typography header"}
                </span>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-serif font-bold uppercase text-[#3B261C] dark:text-[#FAF7F2] tracking-wider border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#A94432]" /> Color Architecture
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Primary Accent
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
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Secondary Shade
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
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Body Text
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
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Paper Background
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
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Watermark & Background Art */}
          <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-serif font-bold uppercase text-[#3B261C] dark:text-[#FAF7F2] tracking-wider border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#A94432]" /> Security Watermark & Background
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Watermark Stamp Text
                </label>
                <input
                  type="text"
                  value={template.watermarkText}
                  onChange={(e) => handleChange("watermarkText", e.target.value)}
                  placeholder="PAID / OFFICIAL"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Watermark Opacity ({template.watermarkOpacity})
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.4"
                  step="0.01"
                  value={template.watermarkOpacity}
                  onChange={(e) => handleChange("watermarkOpacity", parseFloat(e.target.value))}
                  className="w-full mt-2 accent-[#A94432]"
                />
              </div>
            </div>

            {/* Background image upload */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048]">
                  Optional Background Pattern / Watermark Image
                </label>
                <span className="text-[10px] text-[#8A6048]">
                  {template.backgroundImageKey ? "Custom background asset configured" : "No background image"}
                </span>
              </div>
              <input
                type="file"
                ref={bgInputRef}
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFileUpload(e, "background")}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                disabled={uploadingBg}
                className="px-3.5 py-1.5 text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[#3B261C] dark:text-[#FAF7F2] border border-stone-300 dark:border-stone-700 rounded-xl transition"
              >
                {uploadingBg ? "Uploading..." : "Upload Pattern"}
              </button>
            </div>
          </div>

          {/* Header & Footer Copy */}
          <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-serif font-bold uppercase text-[#3B261C] dark:text-[#FAF7F2] tracking-wider border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#A94432]" /> Header & Legal Footer Copy
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Header Subtitle / Tax Reference
                </label>
                <input
                  type="text"
                  value={template.headerText}
                  onChange={(e) => handleChange("headerText", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Footer Legal Terms / Guarantee
                </label>
                <textarea
                  rows={2}
                  value={template.footerText}
                  onChange={(e) => handleChange("footerText", e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
            </div>
          </div>

          {/* Issuer Details */}
          <div className="bg-white dark:bg-[#211D1A] border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-serif font-bold uppercase text-[#3B261C] dark:text-[#FAF7F2] tracking-wider border-b border-stone-200 dark:border-stone-800 pb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#A94432]" /> Issuer Support & Legal Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={template.supportEmail}
                  onChange={(e) => handleChange("supportEmail", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Support Phone / Hotline
                </label>
                <input
                  type="text"
                  value={template.supportPhone}
                  onChange={(e) => handleChange("supportPhone", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#8A6048] mb-1">
                  Company Legal Entity Address
                </label>
                <input
                  type="text"
                  value={template.companyAddress}
                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-[#151311] dark:text-[#FAF7F2] focus:outline-none focus:border-[#3B261C]"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Right Live Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#3B261C] dark:text-[#FAF7F2]">
            <span className="flex items-center gap-1.5 font-bold">
              <Eye className="w-4 h-4 text-[#A94432]" /> Authoritative Live Preview
            </span>
            <span className="text-[11px] text-[#8A6048]">Draft v{template.version + 1}</span>
          </div>

          {/* Printable Preview Card */}
          <div
            className="rounded-3xl p-6 shadow-xl relative overflow-hidden border border-stone-300 transition-colors"
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
              {/* Top Accent Line */}
              <div
                className="h-1 rounded-full w-full"
                style={{ backgroundColor: template.primaryColor }}
              />

              {/* Receipt Header */}
              <div
                className="flex items-start justify-between border-b pb-4"
                style={{ borderColor: `${template.textColor}25` }}
              >
                <div className="flex items-center gap-3">
                  {logoPreviewUrl ? (
                    <img
                      src={logoPreviewUrl}
                      alt="Logo"
                      className="w-10 h-10 object-contain rounded-lg"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                      style={{ backgroundColor: template.primaryColor }}
                    >
                      {template.platformName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3
                      className="font-serif text-lg font-bold"
                      style={{ color: template.primaryColor }}
                    >
                      {template.platformName}
                    </h3>
                    <p className="text-[10px] opacity-75">{template.headerText}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-[11px] font-mono font-bold block"
                    style={{ color: template.secondaryColor }}
                  >
                    {template.receiptTitle}
                  </span>
                  <span className="text-[10px] font-mono opacity-60">
                    RCP-2026-DEMO
                  </span>
                </div>
              </div>

              {/* Customer & Order Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[10px] opacity-80 pb-2">
                <div>
                  <span className="block font-semibold">Billed To:</span>
                  <span>Rohan Sharma</span>
                  <span className="block font-mono text-[9px]">rohan@example.com</span>
                </div>
                <div className="text-right">
                  <span className="block font-semibold">Payment Reference:</span>
                  <span className="font-mono">pay_DEMO123456</span>
                  <span className="block">UPI • Standard</span>
                </div>
              </div>

              {/* Sample Line Item */}
              <div className="space-y-2 py-2">
                <div className="text-[10px] font-mono uppercase opacity-75 flex justify-between">
                  <span>Deliverable Product</span>
                  <span>Amount</span>
                </div>
                <div
                  className="p-3 rounded-xl flex items-center justify-between text-xs"
                  style={{ backgroundColor: `${template.secondaryColor}12` }}
                >
                  <div>
                    <div className="font-bold">Next.js SaaS Enterprise Kit</div>
                    <div className="text-[10px] opacity-70">
                      Standard Commercial License
                    </div>
                  </div>
                  <div className="font-mono font-bold">₹1,499.00</div>
                </div>
              </div>

              {/* Total Settlement */}
              <div
                className="flex items-center justify-between pt-3 border-t text-sm font-bold"
                style={{ borderColor: `${template.textColor}25` }}
              >
                <span>Total Amount Paid</span>
                <span
                  className="font-mono text-base"
                  style={{ color: template.primaryColor }}
                >
                  ₹1,499.00
                </span>
              </div>

              {/* Footer Legal Copy */}
              <div
                className="pt-4 border-t text-[9px] opacity-70 leading-relaxed text-center"
                style={{ borderColor: `${template.textColor}25` }}
              >
                <p>{template.footerText}</p>
                <p className="mt-1 font-mono">
                  {template.supportEmail} • {template.companyAddress}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
