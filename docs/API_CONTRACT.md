# Digital Marketplace — REST API Contract (v1)

All endpoints conform to standardized JSON response structures, strict validation schemas, and HTTP status codes.

---

## 1. Global Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request parameters",
    "details": [
      { "field": "pricePaise", "message": "Price must be greater than or equal to 0" }
    ]
  }
}
```

---

## 2. Authentication Endpoints

### `POST /api/v1/auth/signup`
Creates a standard user account (Buyer role by default).
- **Request Body**:
```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@example.com",
  "password": "SecurePassword123!",
  "acceptTerms": true
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_clx102938",
      "fullName": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "BUYER",
      "isEmailVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### `POST /api/v1/auth/login`
- **Request Body**:
```json
{
  "email": "rahul@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_clx102938",
      "fullName": "Rahul Sharma",
      "email": "rahul@example.com",
      "role": "BUYER",
      "hasSellerProfile": true,
      "sellerStatus": "APPROVED"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### `GET /api/v1/auth/me`
Fetches authenticated user identity, role, and active permissions.

---

## 3. Product Catalog Endpoints (Public)

### `GET /api/v1/products`
Retrieves paginated marketplace catalog with filters.
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
  - `category`: string (category slug)
  - `query`: string (search term in title/description/tags)
  - `minPrice`: number (in paise)
  - `maxPrice`: number (in paise)
  - `productType`: `DIGITAL_DOWNLOAD` | `SOFTWARE` | `BUNDLE`
  - `sort`: `newest` | `best_selling` | `price_asc` | `price_desc` | `rating`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_clx109283",
      "title": "Ultimate React Dashboard UI Kit",
      "slug": "ultimate-react-dashboard-ui-kit",
      "shortDescription": "Over 50+ pre-built React & Tailwind CSS dashboard components.",
      "pricePaise": 79900,
      "discountPricePaise": 99900,
      "ratingAvg": 4.9,
      "reviewsCount": 128,
      "thumbnailUrl": "https://cdn.marketplace.com/thumbnails/react-kit.webp",
      "seller": {
        "storeName": "CodeCraft Labs",
        "storeSlug": "codecraft",
        "logoUrl": "https://cdn.marketplace.com/avatars/codecraft.webp"
      },
      "category": {
        "name": "Development",
        "slug": "development"
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 84 }
}
```

### `GET /api/v1/products/:slug`
Retrieves full product details, screenshots, license specifications, and reviews.

---

## 4. Checkout & Razorpay Payment Endpoints

### `POST /api/v1/orders/checkout`
Initiates a purchase transaction. Creates internal Order (`PENDING`) and Razorpay Order.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "productId": "prod_clx109283",
  "licenseType": "COMMERCIAL"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20261005-9821",
    "totalAmountPaise": 79900,
    "currency": "INR",
    "razorpayOrderId": "order_Oxk9281jKd28",
    "razorpayKeyId": "rzp_live_xxxxxxxxxxxx",
    "product": {
      "title": "Ultimate React Dashboard UI Kit",
      "pricePaise": 79900
    },
    "customer": {
      "name": "Amit Patel",
      "email": "amit@example.com"
    }
  }
}
```

### `POST /api/v1/payments/verify`
Validates client-side Razorpay payment completion using HMAC-SHA256 signature verification.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "orderId": "ORD-20261005-9821",
  "razorpayOrderId": "order_Oxk9281jKd28",
  "razorpayPaymentId": "pay_Px7a91Lkd829",
  "razorpaySignature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20261005-9821",
    "status": "PAID",
    "receiptId": "REC-20261005-9821",
    "downloadReady": true,
    "message": "Payment verified successfully. Your files are ready."
  }
}
```

### `POST /api/v1/payments/webhook`
Server-to-Server webhook listener for asynchronous Razorpay events (`order.paid`, `payment.captured`, `payment.failed`, `refund.processed`).
- **Headers**: `x-razorpay-signature: <hmac_hex>`
- **Behavior**: Verifies webhook signature against `RAZORPAY_WEBHOOK_SECRET`. Performs idempotent state transition to `PAID`, provisions downloads, calculates seller earnings, and sends transactional email.

---

## 5. Delivery & Secure Download Endpoints

### `GET /api/v1/buyer/library`
Retrieves all digital assets purchased by the authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "orderId": "ORD-20261005-9821",
      "purchasedAt": "2026-10-05T13:30:00Z",
      "product": {
        "id": "prod_clx109283",
        "title": "Ultimate React Dashboard UI Kit",
        "slug": "ultimate-react-dashboard-ui-kit",
        "version": "1.0.0",
        "thumbnailUrl": "https://cdn.marketplace.com/thumbnails/react-kit.webp"
      },
      "file": {
        "id": "file_clx98214",
        "filename": "ultimate-react-dashboard-v1.0.0.zip",
        "fileSize": 48291044,
        "downloadCount": 1,
        "maxAllowed": null
      }
    }
  ]
}
```

### `POST /api/v1/buyer/downloads/:productFileId/url`
Validates ownership, checks fraud/rate limits, increments download counter, and returns a time-limited signed download URL (e.g. AWS S3 / Cloudflare R2 presigned URL valid for 15 minutes).
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.marketplace.com/private/products/react-kit.zip?X-Amz-Signature=...",
    "expiresInSeconds": 900,
    "remainingDownloads": "unlimited"
  }
}
```

### `GET /api/v1/buyer/orders/:id/receipt`
Generates and serves the formal Tax Invoice / Payment Receipt for the order.

---

## 6. Seller Workspace Endpoints

### `POST /api/v1/seller/onboard`
Submits seller store profile and payout bank information for verification.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "storeName": "DesignStudio Pro",
  "storeSlug": "designstudio-pro",
  "bio": "Curators of premium Figma and Design Systems",
  "panNumber": "ABCDE1234F",
  "bankAccount": "987654321012",
  "bankIfsc": "HDFC0001234",
  "accountHolderName": "DesignStudio Pvt Ltd"
}
```

### `GET /api/v1/seller/dashboard/stats`
Retrieves real-time seller metrics: Gross sales, net balance, pending clearance, order count.

### `POST /api/v1/seller/products`
Creates a new draft digital product.

### `POST /api/v1/seller/products/:id/upload-presign`
Generates an authenticated S3/R2 direct-upload URL for large ZIP/PDF product files, bypassing server memory bottlenecks.

### `POST /api/v1/seller/products/:id/submit`
Submits the draft product for Admin Moderation (`PENDING_REVIEW`).

### `GET /api/v1/seller/earnings`
Itemized ledger of all sales, platform commissions (10%), and payout schedules.

### `POST /api/v1/seller/payouts/request`
Initiates a payout transfer request to the verified bank account.

---

## 7. Admin Moderation Endpoints

### `GET /api/v1/admin/products/moderation`
Lists all products in `PENDING_REVIEW` queue.

### `POST /api/v1/admin/products/:id/approve`
Approves product and immediately sets status to `PUBLISHED`. Triggers seller notification.

### `POST /api/v1/admin/products/:id/reject`
Rejects product with required feedback string (`rejectionReason`).

### `POST /api/v1/admin/orders/:id/refund`
Executes Razorpay Refund API call, marks order `REFUNDED`, disables digital download access, and creates negative adjustment entry on seller ledger.
