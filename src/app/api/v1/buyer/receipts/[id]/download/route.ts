import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/v1/buyer/receipts/[id]/download
 *
 * Secure buyer PDF receipt download stream.
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

    const receipt = await prisma.receipt.findUnique({
      where: { id: params.id },
      include: { order: true },
    });

    if (!receipt) {
      return apiError("RECEIPT_NOT_FOUND", "Receipt not found", 404);
    }

    const isOwner = receipt.order?.buyerId === authUser.id;
    const isAdmin = authUser.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to download this receipt",
        403
      );
    }

    const storageKey = receipt.pdfStorageKey || `receipts/${receipt.id}.pdf`;
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
  } catch (error) {
    console.error("[RECEIPT_DOWNLOAD_ERROR]", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to download receipt", 500);
  }
}
