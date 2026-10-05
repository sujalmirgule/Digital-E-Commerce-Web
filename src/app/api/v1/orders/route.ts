export const dynamic = "force-dynamic";

/**
 * POST /api/v1/orders
 * Alias for POST /api/v1/orders/checkout
 */
export { POST } from "./checkout/route";

/**
 * GET /api/v1/orders
 * Alias for GET /api/v1/buyer/orders
 */
export { GET } from "../buyer/orders/route";

