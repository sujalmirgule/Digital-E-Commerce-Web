import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthenticatedSeller } from "@/lib/auth";
import { EarningStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/seller/earnings
 *
 * Returns an itemized ledger of all completed sales, showing platform commissions
 * and payout schedules for the authenticated, APPROVED seller.
 *
 * Security:
 *   - Requires valid APPROVED seller JWT.
 *   - IDOR protected: only returns earnings owned by the authenticated seller's SellerProfile.
 *   - No payment credentials, Razorpay keys, PAN/bank data are returned.
 *
 * Pagination: cursor-based (page/limit).
 *
 * Response shape:
 *   {
 *     earnings: [ { id, orderId, orderItemId, productTitle, grossAmountPaise,
 *                   platformFeePaise, netEarningsPaise, status, availableOn, createdAt } ],
 *     summary: { totalGrossPaise, totalPlatformFeePaise, totalNetEarningsPaise,
 *                pendingBalancePaise, availableBalancePaise, totalRevenuePaise },
 *     pagination: { total, page, limit, totalPages }
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate — must be APPROVED seller
    const seller = await getAuthenticatedSeller(req);
    if (!seller) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication as an approved seller is required",
        401
      );
    }

    const { sellerProfileId } = seller;

    // 2. Parse pagination query parameters
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page") ?? "1";
    const limitParam = searchParams.get("limit") ?? "20";
    const statusParam = searchParams.get("status") as EarningStatus | null;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
    const skip = (page - 1) * limit;

    // Validate status filter
    const validStatuses: EarningStatus[] = ["PENDING", "AVAILABLE", "PAID_OUT", "REFUNDED_DEDUCTED"];
    const statusFilter =
      statusParam && validStatuses.includes(statusParam)
        ? statusParam
        : undefined;

    // 3. IDOR-protected query: only earnings where sellerId = sellerProfileId
    const whereClause = {
      sellerId: sellerProfileId,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [earnings, total] = await Promise.all([
      prisma.sellerEarning.findMany({
        where: whereClause,
        include: {
          orderItem: {
            select: {
              productTitle: true,
              pricePaise: true,
              licenseType: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              paidAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sellerEarning.count({ where: whereClause }),
    ]);

    // 4. Fetch seller profile summary (aggregated balances)
    const profile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: {
        totalRevenuePaise: true,
        netEarningsPaise: true,
        availableBalance: true,
        pendingBalance: true,
      },
    });

    if (!profile) {
      return apiError("NOT_FOUND", "Seller profile not found", 404);
    }

    // 5. Calculate period totals from current page
    const periodGross = earnings.reduce(
      (s, e) => s + e.grossAmountPaise,
      0
    );
    const periodFee = earnings.reduce((s, e) => s + e.platformFeePaise, 0);
    const periodNet = earnings.reduce(
      (s, e) => s + e.netEarningsPaise,
      0
    );

    // 6. Build response — serialize BigInt to number for JSON (safe for paise values within JS safe integer range)
    return apiSuccess(
      {
        earnings: earnings.map((e) => ({
          id: e.id,
          orderId: e.orderId,
          orderItemId: e.orderItemId,
          productTitle: e.orderItem?.productTitle ?? null,
          licenseType: e.orderItem?.licenseType ?? null,
          grossAmountPaise: e.grossAmountPaise,
          platformFeePaise: e.platformFeePaise,
          netEarningsPaise: e.netEarningsPaise,
          status: e.status,
          availableOn: e.availableOn.toISOString(),
          orderStatus: e.order.status,
          saleDate: e.order.paidAt?.toISOString() ?? e.createdAt.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
        summary: {
          // Page-level totals
          periodGrossPaise: periodGross,
          periodPlatformFeePaise: periodFee,
          periodNetEarningsPaise: periodNet,
          // All-time aggregated balances from SellerProfile
          totalRevenuePaise: Number(profile.totalRevenuePaise),
          netEarningsPaise: Number(profile.netEarningsPaise),
          availableBalancePaise: Number(profile.availableBalance),
          pendingBalancePaise: Number(profile.pendingBalance),
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Seller earnings retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[SELLER_EARNINGS_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred while retrieving earnings",
      500
    );
  }
}
