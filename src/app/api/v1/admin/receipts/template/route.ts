import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getActiveReceiptTemplate,
  updateActiveReceiptTemplate,
} from "@/lib/services/receipt";
import { updateReceiptTemplateSchema } from "@/lib/validations/receipt";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/receipts/template
 *
 * Retrieve the active receipt template configuration.
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
        "Only platform administrators may access receipt template settings",
        403
      );
    }

    const template = await getActiveReceiptTemplate();

    return apiSuccess(
      { template },
      "Receipt template retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_RECEIPT_TEMPLATE_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve receipt template",
      500
    );
  }
}

/**
 * PUT /api/v1/admin/receipts/template
 *
 * Update the active receipt template configuration.
 * Automatically increments template version to protect historical receipts.
 */
export async function PUT(req: NextRequest) {
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
        "Only platform administrators may update receipt template settings",
        403
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError("VALIDATION_FAILED", "Invalid JSON format in request body", 400);
    }

    const parseResult = updateReceiptTemplateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "VALIDATION_FAILED",
        "Invalid template configuration payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const updatedTemplate = await updateActiveReceiptTemplate(parseResult.data);

    return apiSuccess(
      { template: updatedTemplate },
      "Receipt template updated successfully. New version generated.",
      200
    );
  } catch (error) {
    console.error("[ADMIN_RECEIPT_TEMPLATE_UPDATE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update receipt template",
      500
    );
  }
}

export const PATCH = PUT;
