import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { adminReceiptsQuerySchema } from "@/lib/validations/receipt";
import { formatPaiseToINR } from "@/lib/services/receipt";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/receipts
 *
 * Admin receipts search & listing endpoint.
 *
 * Rules:
 *   - Only authenticated ADMIN users.
 *   - Supports pagination, searching by receipt number / invoice number / order ID / buyer,
 *     and date range filtering.
 */
export async function GET(req: NextRequest) {
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
        "Only platform administrators may view the receipt register",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      search: searchParams.get("search") || undefined,
      orderId: searchParams.get("orderId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    const parsedQuery = adminReceiptsQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid query parameters",
        400,
        parsedQuery.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const { page, limit, search, orderId, startDate, endDate } = parsedQuery.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (orderId) {
      where.orderId = { contains: orderId, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { orderId: { contains: search, mode: "insensitive" } },
        { buyerName: { contains: search, mode: "insensitive" } },
        { buyerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      where.issuedAt = {};
      if (startDate) where.issuedAt.gte = new Date(startDate);
      if (endDate) where.issuedAt.lte = new Date(endDate);
    }

    const [receipts, totalCount] = await Promise.all([
      prisma.receipt.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalAmountPaise: true,
              buyerId: true,
            },
          },
        },
      }),
      prisma.receipt.count({ where }),
    ]);

    const formattedReceipts = receipts.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      receiptNumber: r.invoiceNumber,
      orderId: r.orderId,
      buyerName: r.buyerName,
      buyerEmail: r.buyerEmail,
      amountPaidPaise: r.amountPaidPaise,
      totalAmountPaise: r.amountPaidPaise,
      amountFormatted: formatPaiseToINR(r.amountPaidPaise),
      currency: r.currency,
      paymentMethod: r.paymentMethod,
      paymentId: r.paymentId,
      templateVersion: r.templateVersion,
      issuedAt: r.issuedAt,
    }));

    return apiSuccess(
      {
        receipts: formattedReceipts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
      "Receipts retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_RECEIPTS_API_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve receipts register",
      500
    );
  }
}
