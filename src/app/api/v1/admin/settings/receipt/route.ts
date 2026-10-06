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
 * GET /api/v1/admin/settings/receipt
 *
 * Retrieve current receipt template configuration.
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
        "Administrative privileges are required to access receipt settings",
        403
      );
    }

    const template = await getActiveReceiptTemplate();

    return apiSuccess(
      { template, ...template },
      "Receipt template settings retrieved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_SETTINGS_RECEIPT_GET_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to retrieve receipt settings",
      500
    );
  }
}

/**
 * PUT /api/v1/admin/settings/receipt
 *
 * Update receipt template configuration.
 * Generates an immutable new version preserving historical receipts.
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
        "Administrative privileges are required to update receipt settings",
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
        "Invalid receipt template payload",
        400,
        parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }))
      );
    }

    const updatedTemplate = await updateActiveReceiptTemplate(parseResult.data);

    return apiSuccess(
      { template: updatedTemplate, ...updatedTemplate },
      "Receipt template configuration saved successfully",
      200
    );
  } catch (error) {
    console.error("[ADMIN_SETTINGS_RECEIPT_UPDATE_ERROR]", error);
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to update receipt settings",
      500
    );
  }
}

export const PATCH = PUT;
export const POST = PUT;
