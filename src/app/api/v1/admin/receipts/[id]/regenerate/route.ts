import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { regenerateReceiptPDF } from "@/lib/services/receipt";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/v1/admin/receipts/[id]/regenerate
 *
 * Explicit administrator endpoint to regenerate the receipt PDF artifact.
 *
 * Invariants:
 *   - Admin authorization strictly enforced.
 *   - Financial fields, amounts, order, buyer, and payment IDs NEVER change.
 *   - Rebuilds PDF using stored template snapshot.
 *   - Idempotent and safe.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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
        "Only platform administrators may regenerate receipt documents",
        403
      );
    }

    const result = await regenerateReceiptPDF(params.id);

    if (!result.success || !result.receipt) {
      return apiError(
        result.code || "REGENERATION_FAILED",
        result.error || "Failed to regenerate receipt",
        result.status || 400
      );
    }

    return apiSuccess(
      {
        receiptId: result.receipt.id,
        orderId: result.receipt.orderId,
        invoiceNumber: result.receipt.invoiceNumber,
        amountPaidPaise: result.receipt.amountPaidPaise,
        message: "Receipt PDF regenerated successfully. Historical financial data preserved.",
      },
      "Receipt regenerated successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_RECEIPT_REGENERATE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to regenerate receipt",
      500
    );
  }
}
