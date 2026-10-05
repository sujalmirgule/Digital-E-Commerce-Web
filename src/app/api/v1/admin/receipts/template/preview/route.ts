import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { previewReceiptTemplate } from "@/lib/services/receipt";
import { updateReceiptTemplateSchema } from "@/lib/validations/receipt";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/receipts/template/preview
 *
 * Generate preview PDF artifact using unsaved/current template settings.
 *
 * Invariants:
 *   - Admin only.
 *   - NEVER creates a real Receipt database record.
 *   - NEVER consumes receipt numbers.
 *   - NEVER mutates financial ledger or order state.
 */
export async function POST(req: NextRequest) {
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
        "Only platform administrators may preview receipt templates",
        403
      );
    }

    let overrides: any = undefined;
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const rawBody = await req.json();
        const parseResult = updateReceiptTemplateSchema.safeParse(rawBody);
        if (!parseResult.success) {
          return apiError(
            "VALIDATION_FAILED",
            "Invalid template preview overrides",
            400,
            parseResult.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            }))
          );
        }
        overrides = parseResult.data;
      } catch {
        return apiError("VALIDATION_FAILED", "Malformed JSON body", 400);
      }
    }

    const { pdfBuffer, template } = await previewReceiptTemplate(overrides);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const acceptHeader = req.headers.get("accept");

    if (format === "pdf" || acceptHeader === "application/pdf") {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="receipt-preview.pdf"',
          "Content-Length": pdfBuffer.length.toString(),
          "Cache-Control": "no-store, no-cache",
        },
      });
    }

    return apiSuccess(
      {
        preview: true,
        template,
        pdfSizeBytes: pdfBuffer.length,
        pdfBase64: pdfBuffer.toString("base64"),
        message: "Receipt template preview generated. Zero database records created.",
      },
      "Receipt template preview generated successfully",
      200
    );
  } catch (error) {
    console.error("[RECEIPT_TEMPLATE_PREVIEW_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to generate template preview",
      500
    );
  }
}
