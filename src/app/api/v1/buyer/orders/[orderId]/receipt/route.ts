import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  generateReceiptForOrder,
  formatPaiseToINR,
} from "@/lib/services/receipt";
import { getStorageProvider } from "@/lib/storage/local-storage-provider";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    orderId: string;
  };
}

/**
 * GET /api/v1/buyer/orders/[orderId]/receipt
 *
 * Buyer receipt access endpoint.
 *
 * Rules:
 *   - Authenticated user must own the order or be an ADMIN.
 *   - Order must be in status PAID with a CAPTURED payment.
 *   - Generates or retrieves the authoritative Receipt record.
 *   - IDOR protected (Buyer A cannot access Buyer B's receipt).
 *   - If format=pdf or download=true or Accept: application/pdf, streams the PDF directly.
 *   - Otherwise returns receipt JSON metadata + temporary signed downloadUrl.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return apiError(
        auth.error?.code || "UNAUTHORIZED",
        auth.error?.message || "Authentication is required",
        auth.status || 401
      );
    }
    const authUser = auth.user;

    const { orderId } = params;
    if (!orderId || !orderId.startsWith("ORD-")) {
      return apiError("VALIDATION_FAILED", "Invalid order ID format", 400);
    }

    // 1. Fetch internal order with relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        receipt: true,
      },
    });

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    // 2. IDOR Ownership Check
    const isOwner = order.buyerId === authUser.id;
    const isAdmin = authUser.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to access this order's receipt",
        403
      );
    }

    // 3. Gate check: Order must be PAID
    if (order.status !== "PAID") {
      return apiError(
        "ORDER_NOT_PAID",
        `Receipt is not available for order in status '${order.status}'. Payment must be verified.`,
        400
      );
    }

    // 4. Authoritative generation or retrieval
    const generationResult = await generateReceiptForOrder(order.id);
    if (!generationResult.success || !generationResult.receipt) {
      return apiError(
        generationResult.code || "RECEIPT_GENERATION_FAILED",
        generationResult.error || "Failed to generate receipt",
        generationResult.status || 500
      );
    }

    const receipt = generationResult.receipt;

    // 5. Generate secure, short-lived download authorization
    const storage = getStorageProvider();
    const storageKey = receipt.pdfStorageKey || `receipts/${receipt.id}.pdf`;
    let downloadUrl: string | undefined;

    if (storage.authorizeDownload) {
      const authDownload = await storage.authorizeDownload({
        objectKey: storageKey,
        originalFilename: `${receipt.id}.pdf`,
        expiresInSeconds: 900, // 15 minutes
      });
      downloadUrl = authDownload.downloadUrl;
    }

    // 6. Check if direct PDF stream is requested
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const download = searchParams.get("download");
    const acceptHeader = req.headers.get("accept");

    if (
      format === "pdf" ||
      download === "true" ||
      download === "1" ||
      acceptHeader === "application/pdf"
    ) {
      try {
        const fullPath = path.resolve(
          process.cwd(),
          "storage",
          "private",
          storageKey.replace(/\\/g, "/").replace(/^\/+/, "")
        );
        const fileBytes = await fs.readFile(fullPath);

        return new NextResponse(new Uint8Array(fileBytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${receipt.id}.pdf"`,
            "Content-Length": fileBytes.length.toString(),
            "Cache-Control": "private, no-cache, no-store",
          },
        });
      } catch (streamErr) {
        console.error("[RECEIPT_STREAM_ERROR]", streamErr);
        if (downloadUrl) {
          return NextResponse.redirect(downloadUrl, 302);
        }
      }
    }


    // 7. Return safe JSON response
    return apiSuccess(
      {
        receipt: {
          id: receipt.id,
          orderId: receipt.orderId,
          invoiceNumber: receipt.invoiceNumber,
          buyerName: receipt.buyerName,
          buyerEmail: receipt.buyerEmail,
          amountPaidPaise: receipt.amountPaidPaise,
          amountFormatted: formatPaiseToINR(receipt.amountPaidPaise),
          currency: receipt.currency,
          paymentMethod: receipt.paymentMethod,
          paymentId: receipt.paymentId,
          templateVersion: receipt.templateVersion,
          issuedAt: receipt.issuedAt,
          items: order.items.map((i) => ({
            id: i.id,
            productTitle: i.productTitle,
            licenseType: i.licenseType,
            pricePaise: i.pricePaise,
            priceFormatted: formatPaiseToINR(i.pricePaise),
          })),
        },
        downloadUrl,
        expiresInSeconds: 900,
      },
      "Receipt retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[BUYER_RECEIPT_API_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while retrieving receipt",
      500
    );
  }
}
