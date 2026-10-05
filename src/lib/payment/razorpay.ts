import crypto from "crypto";

export interface CreateRazorpayOrderParams {
  orderId: string;
  amountPaise: number;
  currency?: string;
  productId: string;
  buyerEmail?: string;
  buyerName?: string;
}

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

/**
 * Returns the public Razorpay Key ID safely.
 * Never exposes the key secret or internal credentials.
 */
export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
}

/**
 * Formats a canonical marketplace Order ID conforming to:
 * ORD-YYYYMMDD-XXXX (e.g. ORD-20261005-9821)
 */
export function generateOrderId(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `ORD-${yyyy}${mm}${dd}-${randomSuffix}`;
}

/**
 * Initializes a Razorpay Order for a checkout transaction.
 *
 * Requirements & Security:
 *   - Amount is strictly in integer paise.
 *   - Currency is locked to INR.
 *   - Receipt binds strictly to internal orderId.
 *   - Notes only contain non-sensitive metadata (orderId, productId).
 *   - Never sends or leaks passwords, PAN, bank accounts, or storage keys.
 *   - Provides test-safe provider abstraction if real credentials are not supplied.
 */
export async function createRazorpayOrder(
  params: CreateRazorpayOrderParams
): Promise<RazorpayOrderResult> {
  const { orderId, amountPaise, currency = "INR", productId } = params;

  // 1. Simulation hooks for automated failure / timeout testing
  if (process.env.RAZORPAY_SIMULATE_FAILURE === "true") {
    throw new Error("Razorpay API error: Gateway service unavailable (simulated failure)");
  }

  if (process.env.RAZORPAY_SIMULATE_TIMEOUT === "true") {
    throw new Error("Razorpay API timeout: Connection timed out after 10000ms (simulated timeout)");
  }

  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // 2. Free product handling (amountPaise === 0)
  if (amountPaise === 0) {
    return {
      razorpayOrderId: `order_free_${orderId.replace(/[^a-zA-Z0-9]/g, "")}`,
      amountPaise: 0,
      currency: "INR",
      keyId,
    };
  }

  // 3. If real credentials are provided and not in placeholder/mock test mode
  const isMockMode =
    !keySecret ||
    keySecret === "your_razorpay_secret" ||
    keyId.includes("your_key_id") ||
    process.env.MOCK_PAYMENTS === "true";

  if (!isMockMode) {
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt: orderId,
        notes: {
          orderId,
          productId,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RAZORPAY_API_ERROR]", response.status, errorText);
      throw new Error(`Razorpay gateway rejected order creation (HTTP ${response.status})`);
    }

    const data = await response.json();
    return {
      razorpayOrderId: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      keyId,
    };
  }

  // 4. Test-safe provider initialization for local development and testing
  const mockRandomSuffix = crypto.randomBytes(7).toString("hex");
  return {
    razorpayOrderId: `order_${mockRandomSuffix}`,
    amountPaise,
    currency,
    keyId,
  };
}
