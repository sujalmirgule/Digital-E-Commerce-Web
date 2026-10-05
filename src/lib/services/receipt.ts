import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import { UpdateReceiptTemplateInput } from "@/lib/validations/receipt";
import { createNotification } from "@/lib/services/notification";
import path from "path";
import fs from "fs/promises";

/**
 * Format integer paise into standard Indian Rupee string:
 * Examples:
 *   100 paise -> ₹1.00
 *   900 paise -> ₹9.00
 *   9900 paise -> ₹99.00
 *   79900 paise -> ₹799.00
 *   99900 paise -> ₹999.00
 *   123400 paise -> ₹1,234.00
 *   199900 paise -> ₹1,999.00
 *   1000000 paise -> ₹10,000.00
 */
export function formatPaiseToINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Default fallback receipt template
 */
export const DEFAULT_RECEIPT_TEMPLATE = {
  id: "default",
  name: "Standard Marketplace Receipt",
  version: 1,
  isDefault: true,
  platformName: "Digital Marketplace",
  receiptTitle: "PAYMENT RECEIPT",
  logoKey: null as string | null,
  primaryColor: "#4F46E5",
  secondaryColor: "#111827",
  textColor: "#1F2937",
  backgroundColor: "#FFFFFF",
  headerVisible: true,
  headerText: "Official Tax Receipt & Payment Proof",
  footerVisible: true,
  footerText:
    "Thank you for your business! All digital sales are governed by the license agreement.",
  backgroundImageKey: null as string | null,
  backgroundOpacity: 0.1,
  watermarkText: "PAID",
  watermarkOpacity: 0.08,
  supportEmail: "support@marketplace.com",
  supportPhone: "+91 98765 43210",
  companyAddress: "Digital Marketplace Inc., Bangalore, Karnataka, India",
  websiteUrl: "https://marketplace.com",
};

/**
 * Get active receipt template, seeding default if none exists
 */
export async function getActiveReceiptTemplate() {
  let template = await prisma.receiptTemplate.findFirst({
    where: { isDefault: true },
  });

  if (!template) {
    template = await prisma.receiptTemplate.upsert({
      where: { id: "default" },
      create: DEFAULT_RECEIPT_TEMPLATE,
      update: {},
    });
  }

  return template || DEFAULT_RECEIPT_TEMPLATE;
}

/**
 * Update active receipt template (Admin only)
 * Increments template version so historical receipts remain preserved.
 */
export async function updateActiveReceiptTemplate(
  data: UpdateReceiptTemplateInput
) {
  const current = await getActiveReceiptTemplate();

  const updated = await prisma.receiptTemplate.update({
    where: { id: current.id },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  return updated;
}

interface ReceiptOrderData {
  orderId: string;
  receiptId: string;
  invoiceNumber: string;
  buyerName: string;
  buyerEmail: string;
  amountPaidPaise: number;
  subtotalPaise: number;
  discountPaise: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  paidAt: Date;
  items: Array<{
    productTitle: string;
    licenseType: string;
    pricePaise: number;
  }>;
}

/**
 * Generate a PDF Buffer from order data and template configuration.
 */
export async function generateReceiptPDFBuffer(
  order: ReceiptOrderData,
  template: any
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        info: {
          Title: `${template.receiptTitle || "Receipt"} - ${order.receiptId}`,
          Author: template.platformName || "Digital Marketplace",
          Subject: `Receipt for Order ${order.orderId}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const primaryColor = template.primaryColor || "#4F46E5";
      const secondaryColor = template.secondaryColor || "#111827";
      const textColor = template.textColor || "#1F2937";
      const backgroundColor = template.backgroundColor || "#FFFFFF";

      // 1. Background Color
      if (backgroundColor.toUpperCase() !== "#FFFFFF") {
        doc.save();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(backgroundColor);
        doc.restore();
      }

      // 2. Background Image (if configured in private storage)
      if (template.backgroundImageKey) {
        try {
          const bgPath = path.resolve(
            process.cwd(),
            "storage",
            "private",
            template.backgroundImageKey.replace(/\\/g, "/").replace(/^\/+/, "")
          );
          const bgBuffer = await fs.readFile(bgPath);
          doc.save();
          doc.opacity(Math.max(0, Math.min(1, template.backgroundOpacity ?? 0.1)));
          doc.image(bgBuffer, 40, 40, {
            width: doc.page.width - 80,
            height: doc.page.height - 80,
          });
          doc.restore();
        } catch {
          // Ignore missing background image
        }
      }

      // 3. Watermark (e.g. "PAID")
      if (template.watermarkText) {
        doc.save();
        const watermarkOpacity = Math.max(
          0,
          Math.min(1, template.watermarkOpacity ?? 0.08)
        );
        doc.opacity(watermarkOpacity);
        doc.fillColor(primaryColor);
        doc.fontSize(60);
        doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.text(
          template.watermarkText.toUpperCase(),
          doc.page.width / 2 - 150,
          doc.page.height / 2 - 30,
          { width: 300, align: "center" }
        );
        doc.restore();
      }

      // 4. Header Bar & Branding
      let y = 40;

      // Decorative top line
      doc
        .rect(40, y, doc.page.width - 80, 4)
        .fill(primaryColor);
      y += 15;

      // Logo (if configured)
      let logoDrawn = false;
      if (template.logoKey) {
        try {
          const logoPath = path.resolve(
            process.cwd(),
            "storage",
            "private",
            template.logoKey.replace(/\\/g, "/").replace(/^\/+/, "")
          );
          const logoBuffer = await fs.readFile(logoPath);
          doc.image(logoBuffer, 40, y, { width: 50, height: 50 });
          logoDrawn = true;
        } catch {
          // Ignore missing logo
        }
      }

      const textX = logoDrawn ? 100 : 40;

      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(template.platformName || "Digital Marketplace", textX, y);

      if (template.headerVisible && template.headerText) {
        doc
          .fillColor("#6B7280")
          .fontSize(9)
          .font("Helvetica")
          .text(template.headerText, textX, y + 24);
      }

      // Receipt Title & Badge on Right
      doc
        .fillColor(secondaryColor)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(template.receiptTitle || "PAYMENT RECEIPT", 350, y, {
          align: "right",
          width: doc.page.width - 390,
        });

      doc
        .fillColor("#10B981")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("PAID & VERIFIED", 350, y + 20, {
          align: "right",
          width: doc.page.width - 390,
        });

      y += 60;

      // 5. Divider
      doc
        .strokeColor("#E5E7EB")
        .lineWidth(1)
        .moveTo(40, y)
        .lineTo(doc.page.width - 40, y)
        .stroke();
      y += 15;

      // 6. Meta Information (2 columns: Bill To & Order Info)
      const col1X = 40;
      const col2X = 320;

      // Left Column: Bill To
      doc
        .fillColor("#6B7280")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("BILLED TO:", col1X, y);

      doc
        .fillColor(textColor)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(order.buyerName || "Customer", col1X, y + 14);

      doc
        .fillColor("#4B5563")
        .fontSize(9)
        .font("Helvetica")
        .text(order.buyerEmail, col1X, y + 28);

      // Right Column: Order Details
      doc
        .fillColor("#6B7280")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("RECEIPT DETAILS:", col2X, y);

      const formattedPaidAt = new Date(order.paidAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      doc
        .fillColor(textColor)
        .fontSize(9)
        .font("Helvetica")
        .text(`Receipt No: ${order.receiptId}`, col2X, y + 14)
        .text(`Invoice No: ${order.invoiceNumber}`, col2X, y + 26)
        .text(`Order ID: ${order.orderId}`, col2X, y + 38)
        .text(`Payment ID: ${order.paymentId}`, col2X, y + 50)
        .text(`Payment Method: ${order.paymentMethod}`, col2X, y + 62)
        .text(`Date: ${formattedPaidAt}`, col2X, y + 74);

      y += 95;

      // 7. Items Table Header
      doc
        .rect(40, y, doc.page.width - 80, 24)
        .fill("#F3F4F6");

      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("ITEM DESCRIPTION", 50, y + 7)
        .text("LICENSE", 300, y + 7)
        .text("QTY", 400, y + 7, { width: 40, align: "center" })
        .text("AMOUNT", 450, y + 7, {
          width: doc.page.width - 490,
          align: "right",
        });

      y += 28;

      // 8. Items Rows
      for (const item of order.items) {
        doc
          .fillColor(textColor)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(item.productTitle, 50, y, { width: 240 });

        doc
          .fillColor("#6B7280")
          .fontSize(8)
          .font("Helvetica")
          .text(item.licenseType || "COMMERCIAL", 300, y);

        doc
          .fillColor(textColor)
          .fontSize(9)
          .font("Helvetica")
          .text("1", 400, y, { width: 40, align: "center" });

        doc
          .fillColor(textColor)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(formatPaiseToINR(item.pricePaise), 450, y, {
            width: doc.page.width - 490,
            align: "right",
          });

        y += 20;

        // Subtle row line
        doc
          .strokeColor("#F3F4F6")
          .lineWidth(0.5)
          .moveTo(40, y)
          .lineTo(doc.page.width - 40, y)
          .stroke();

        y += 6;
      }

      y += 10;

      // 9. Financial Summary (Right aligned)
      const sumX = 350;
      const sumWidth = doc.page.width - 390;

      doc
        .strokeColor("#E5E7EB")
        .lineWidth(1)
        .moveTo(sumX, y)
        .lineTo(doc.page.width - 40, y)
        .stroke();
      y += 8;

      // Subtotal
      doc
        .fillColor("#4B5563")
        .fontSize(9)
        .font("Helvetica")
        .text("Subtotal:", sumX, y)
        .text(formatPaiseToINR(order.subtotalPaise), sumX, y, {
          align: "right",
          width: sumWidth,
        });
      y += 16;

      // Discount (if present)
      if (order.discountPaise > 0) {
        doc
          .fillColor("#10B981")
          .fontSize(9)
          .font("Helvetica")
          .text("Discount:", sumX, y)
          .text(`-${formatPaiseToINR(order.discountPaise)}`, sumX, y, {
            align: "right",
            width: sumWidth,
          });
        y += 16;
      }

      // Total Paid
      doc
        .rect(sumX - 10, y - 4, sumWidth + 20, 24)
        .fill("#EEF2FF");

      doc
        .fillColor(primaryColor)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Total Paid:", sumX, y + 2)
        .text(formatPaiseToINR(order.amountPaidPaise), sumX, y + 2, {
          align: "right",
          width: sumWidth,
        });

      y += 40;

      // 10. Footer Section
      if (template.footerVisible) {
        const footerY = doc.page.height - 85;

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .moveTo(40, footerY)
          .lineTo(doc.page.width - 40, footerY)
          .stroke();

        if (template.footerText) {
          doc
            .fillColor("#4B5563")
            .fontSize(8)
            .font("Helvetica")
            .text(template.footerText, 40, footerY + 8, {
              align: "center",
              width: doc.page.width - 80,
            });
        }

        const contactParts: string[] = [];
        if (template.supportEmail) contactParts.push(`Email: ${template.supportEmail}`);
        if (template.supportPhone) contactParts.push(`Phone: ${template.supportPhone}`);
        if (template.websiteUrl) contactParts.push(`Website: ${template.websiteUrl}`);

        if (contactParts.length > 0) {
          doc
            .fillColor("#6B7280")
            .fontSize(7.5)
            .font("Helvetica")
            .text(contactParts.join("  •  "), 40, footerY + 22, {
              align: "center",
              width: doc.page.width - 80,
            });
        }

        if (template.companyAddress) {
          doc
            .fillColor("#9CA3AF")
            .fontSize(7)
            .font("Helvetica")
            .text(template.companyAddress, 40, footerY + 34, {
              align: "center",
              width: doc.page.width - 80,
            });
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate Receipt for Order (Authoritative, Idempotent)
 *
 * Invariants:
 *  - Order must be in status PAID.
 *  - Order must have at least one CAPTURED Payment.
 *  - Idempotent: Repeated calls return the existing Receipt record.
 *  - Snapshots current template into templateSnapshot for historical reproducibility.
 *  - Stores generated PDF privately in storage.
 */
export async function generateReceiptForOrder(orderId: string) {
  // 1. Idempotency check: Does receipt already exist?
  const existingReceipt = await prisma.receipt.findUnique({
    where: { orderId },
  });

  if (existingReceipt) {
    return {
      success: true,
      receipt: existingReceipt,
      idempotent: true,
    };
  }

  // 2. Fetch Order with items and payments
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!order) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      error: `Order '${orderId}' does not exist`,
      status: 404,
    };
  }

  // 3. Gate check: Order must be PAID
  if (order.status !== OrderStatus.PAID) {
    return {
      success: false,
      code: "ORDER_NOT_PAID",
      error: `Cannot generate receipt for order in status '${order.status}'. Must be PAID.`,
      status: 400,
    };
  }

  // 4. Gate check: Must have a CAPTURED payment
  const capturedPayment = order.payments.find(
    (p) => p.status === PaymentStatus.CAPTURED
  );

  if (!capturedPayment) {
    return {
      success: false,
      code: "NO_CAPTURED_PAYMENT",
      error: "Order has no CAPTURED payment record. Receipt cannot be issued.",
      status: 400,
    };
  }

  // 5. Generate collision-safe, deterministic receipt ID & invoice number
  // Format: REC-YYYYMMDD-XXXX and INV-YYYYMMDD-XXXX matching order suffix
  const orderSuffix = order.id.replace(/^ORD-/, "");
  const receiptId = `REC-${orderSuffix}`;
  const invoiceNumber = `INV-${orderSuffix}`;

  // 6. Fetch active template & snapshot it
  const template = await getActiveReceiptTemplate();
  const templateSnapshot = JSON.parse(JSON.stringify(template));

  // 7. Build PDF buffer
  const pdfBuffer = await generateReceiptPDFBuffer(
    {
      orderId: order.id,
      receiptId,
      invoiceNumber,
      buyerName: order.buyerNameSnapshot,
      buyerEmail: order.buyerEmailSnapshot,
      amountPaidPaise: order.totalAmountPaise,
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      currency: order.currency,
      paymentMethod: capturedPayment.method,
      paymentId: capturedPayment.razorpayPaymentId,
      paidAt: order.paidAt || new Date(),
      items: order.items.map((i) => ({
        productTitle: i.productTitle,
        licenseType: i.licenseType,
        pricePaise: i.pricePaise,
      })),
    },
    template
  );

  // 8. Store PDF privately in storage
  const pdfStorageKey = `receipts/${receiptId}.pdf`;
  const storage = getStorageProvider();
  await storage.putObject(pdfStorageKey, pdfBuffer, "application/pdf");

  // 9. Persist Receipt record (Concurrency/Unique race safe)
  let receipt;
  try {
    receipt = await prisma.receipt.upsert({
      where: { orderId: order.id },
      create: {
        id: receiptId,
        orderId: order.id,
        invoiceNumber,
        pdfStorageKey,
        buyerName: order.buyerNameSnapshot,
        buyerEmail: order.buyerEmailSnapshot,
        amountPaidPaise: order.totalAmountPaise,
        currency: order.currency,
        paymentMethod: capturedPayment.method,
        paymentId: capturedPayment.razorpayPaymentId,
        templateVersion: template.version,
        templateSnapshot,
      },
      update: {},
    });
  } catch (err: any) {
    const existing = await prisma.receipt.findUnique({
      where: { orderId: order.id },
    });
    if (existing) {
      receipt = existing;
    } else {
      throw err;
    }
  }

  // 10. Notify buyer that receipt is ready (async, non-blocking, idempotent)
  createNotification({
    userId: order.buyerId,
    type: "RECEIPT_GENERATED",
    title: "Your Receipt is Ready",
    message: `Receipt ${receiptId} for your order has been generated and is available for download.`,
    linkUrl: `/buyer/orders/${order.id}/receipt`,
    dedupKey: `receipt_generated_${receiptId}`,
    metadata: { receiptId, invoiceNumber },
  }).catch((err) => console.error("[RECEIPT_NOTIFICATION_ERROR]", err));

  return {
    success: true,
    receipt,
    idempotent: false,
  };
}

/**
 * Regenerate Receipt PDF (Admin only)
 * Rebuilds the PDF file while preserving historical financial data.
 */
export async function regenerateReceiptPDF(receiptId: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      order: {
        include: {
          items: true,
          payments: true,
        },
      },
    },
  });

  if (!receipt || !receipt.order) {
    return {
      success: false,
      code: "RECEIPT_NOT_FOUND",
      error: `Receipt '${receiptId}' not found`,
      status: 404,
    };
  }

  // Use the historical template snapshot if available, otherwise current template
  const template = receipt.templateSnapshot || (await getActiveReceiptTemplate());

  const pdfBuffer = await generateReceiptPDFBuffer(
    {
      orderId: receipt.order.id,
      receiptId: receipt.id,
      invoiceNumber: receipt.invoiceNumber,
      buyerName: receipt.buyerName,
      buyerEmail: receipt.buyerEmail,
      amountPaidPaise: receipt.amountPaidPaise,
      subtotalPaise: receipt.order.subtotalPaise,
      discountPaise: receipt.order.discountPaise,
      currency: receipt.currency,
      paymentMethod: receipt.paymentMethod,
      paymentId: receipt.paymentId,
      paidAt: receipt.order.paidAt || receipt.issuedAt,
      items: receipt.order.items.map((i) => ({
        productTitle: i.productTitle,
        licenseType: i.licenseType,
        pricePaise: i.pricePaise,
      })),
    },
    template
  );

  const storageKey = receipt.pdfStorageKey || `receipts/${receipt.id}.pdf`;
  const storage = getStorageProvider();
  await storage.putObject(storageKey, pdfBuffer, "application/pdf");

  return {
    success: true,
    receipt,
    pdfStorageKey: storageKey,
  };
}

/**
 * Preview Receipt Template (Admin only)
 * Renders sample PDF without creating any DB records.
 */
export async function previewReceiptTemplate(
  overrides?: Partial<UpdateReceiptTemplateInput>
) {
  const current = await getActiveReceiptTemplate();
  const mergedTemplate = {
    ...current,
    ...(overrides || {}),
  };

  const sampleOrder: ReceiptOrderData = {
    orderId: "ORD-20261005-SAMPLE",
    receiptId: "REC-20261005-SAMPLE",
    invoiceNumber: "INV-20261005-SAMPLE",
    buyerName: "Alex Developer",
    buyerEmail: "alex@example.com",
    amountPaidPaise: 79900,
    subtotalPaise: 79900,
    discountPaise: 0,
    currency: "INR",
    paymentMethod: "UPI",
    paymentId: "pay_sample123456",
    paidAt: new Date(),
    items: [
      {
        productTitle: "Next.js SaaS Starter Kit Pro",
        licenseType: "COMMERCIAL",
        pricePaise: 79900,
      },
    ],
  };

  const pdfBuffer = await generateReceiptPDFBuffer(sampleOrder, mergedTemplate);

  return {
    pdfBuffer,
    template: mergedTemplate,
  };
}
