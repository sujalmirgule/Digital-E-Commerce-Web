/**
 * POST /api/v1/seller/products/:productId/upload-presign
 *
 * Alias for POST /api/v1/seller/products/:productId/assets/upload
 * Defined in docs/API_CONTRACT.md (Section 6, line 291).
 * Generates an authenticated upload authorization for the product asset.
 */
export { POST } from "../assets/upload/route";
