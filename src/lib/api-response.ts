import { NextResponse } from "next/server";
import { sanitizeErrorMessage } from "@/lib/logger";

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export function apiSuccess<T>(data: T, message?: string, status = 200, meta?: Record<string, unknown>) {
  const payload: ApiResponseSuccess<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  };
  return NextResponse.json(payload, { status });
}

export function apiError(code: string, message: string, status = 400, details?: ApiErrorDetail[]) {
  const sanitizedMessage = sanitizeErrorMessage(message);
  const payload: ApiResponseError = {
    success: false,
    error: {
      code,
      message: sanitizedMessage,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
  return NextResponse.json(payload, { status });
}

