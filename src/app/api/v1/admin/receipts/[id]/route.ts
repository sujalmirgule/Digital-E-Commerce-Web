import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { formatPaiseToINR } from "@/lib/services/receipt";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/admin/receipts/[id]
 *
 * Admin view single receipt details, items, snapshot, and order metadata.
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

    if (auth.user.role !== "ADMIN") {
      return apiError(
        "FORBIDDEN",
        "Only platform administrators may view full receipt details",
        403
      );
    }

    const receipt = await prisma.receipt.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!receipt) {
      return apiError("RECEIPT_NOT_FOUND", "Receipt not found", 404);
    }

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
          templateSnapshot: receipt.templateSnapshot,
          pdfStorageKey: receipt.pdfStorageKey,
          issuedAt: receipt.issuedAt,
          order: {
            id: receipt.order.id,
            status: receipt.order.status,
            subtotalPaise: receipt.order.subtotalPaise,
            discountPaise: receipt.order.discountPaise,
            totalAmountPaise: receipt.order.totalAmountPaise,
            paidAt: receipt.order.paidAt,
            items: receipt.order.items.map((i) => ({
              id: i.id,
              productTitle: i.productTitle,
              licenseType: i.licenseType,
              pricePaise: i.pricePaise,
              priceFormatted: formatPaiseToINR(i.pricePaise),
            })),
          },
        },
      },
      "Receipt details retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_RECEIPT_DETAIL_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve receipt details",
      500
    );
  }
}
