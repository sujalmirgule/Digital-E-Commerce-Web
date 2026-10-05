import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthenticatedAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/platform/ledger
 *
 * Paginated platform commission ledger — ADMIN only.
 * Returns every PlatformLedger entry with associated order/item context.
 * Used by platform administrators to audit marketplace revenue.
 *
 * Security:
 *   - Requires ADMIN role JWT.
 *   - Does NOT return seller bank details, PAN, Razorpay keys, or any payment credentials.
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 *   - orderId (optional filter)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate — must be ADMIN
    const admin = await getAuthenticatedAdmin(req);
    if (!admin) {
      return apiError(
        "UNAUTHORIZED",
        "Admin authentication is required",
        401
      );
    }

    // 2. Parse pagination + filter query params
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page") ?? "1";
    const limitParam = searchParams.get("limit") ?? "20";
    const orderIdFilter = searchParams.get("orderId") ?? undefined;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (page - 1) * limit;

    const whereClause = orderIdFilter ? { orderId: orderIdFilter } : {};

    // 3. Fetch ledger entries with order + item context
    const [ledgers, total] = await Promise.all([
      prisma.platformLedger.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              buyerId: true,
              createdAt: true,
              paidAt: true,
              totalAmountPaise: true,
            },
          },
          orderItem: {
            select: {
              id: true,
              productTitle: true,
              sellerId: true,
              pricePaise: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.platformLedger.count({ where: whereClause }),
    ]);

    // 4. Compute page-level totals
    const totalFeePaise = ledgers.reduce((s, l) => s + l.feePaise, 0);
    const totalGrossPaise = ledgers.reduce(
      (s, l) => s + l.grossAmountPaise,
      0
    );
    const totalNetSellerPaise = ledgers.reduce(
      (s, l) => s + l.netSellerPaise,
      0
    );

    return apiSuccess(
      {
        ledger: ledgers.map((l) => ({
          id: l.id,
          orderId: l.orderId,
          orderItemId: l.orderItemId,
          productTitle: l.orderItem?.productTitle ?? null,
          sellerId: l.orderItem?.sellerId ?? null,
          grossAmountPaise: l.grossAmountPaise,
          feePaise: l.feePaise,
          netSellerPaise: l.netSellerPaise,
          status: l.status,
          orderStatus: l.order.status,
          paidAt: l.order.paidAt?.toISOString() ?? null,
          createdAt: l.createdAt.toISOString(),
        })),
        summary: {
          periodGrossPaise: totalGrossPaise,
          periodFeePaise: totalFeePaise,
          periodNetSellerPaise: totalNetSellerPaise,
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Platform ledger retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_PLATFORM_LEDGER_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while retrieving the platform ledger",
      500
    );
  }
}
