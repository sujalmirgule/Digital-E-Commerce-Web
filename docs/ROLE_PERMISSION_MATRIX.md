# Digital Marketplace — Role-Based Access Control (RBAC) & Permission Matrix

## 1. Unified Identity Model

The platform avoids hard-separating accounts into "Buyer-only" or "Seller-only". Instead, **every user is an account holder with Buyer privileges by default**. Any user can subsequently apply to become a Creator/Seller without creating a separate login:

```text
User Account
 │
 ├── Role: BUYER (Base permissions for all authenticated users)
 │     ├── Browse, Search & Wishlist
 │     ├── Instant Razorpay Checkout
 │     ├── Access "My Library" & Secure Downloads
 │     └── Verified Purchase Reviews
 │
 ├── SellerProfile (Optional 1:1 Extension)
 │     ├── Status: PENDING | APPROVED | REJECTED | SUSPENDED
 │     └── If APPROVED: Unlocks Seller Workspace, Product Publishing & Earnings
 │
 └── Role: ADMIN (Elevated Privileges)
       └── Unlocks Platform Moderation, KYC Review, Financial Oversight & Refunds
```

---

## 2. Comprehensive Permission Matrix

| Capability / Action | Guest (Public) | Buyer (Logged In) | Seller Applicant (Pending) | Approved Seller | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| **Public Catalog & Discovery** | | | | | |
| Browse Products & Categories | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search, Filter & View Details | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Public Seller Storefront | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Purchasing & Fulfillment** | | | | | |
| Add to Wishlist / Follow Seller | ❌ | ✅ | ✅ | ✅ | ✅ |
| Checkout & Razorpay Payment | ❌ | ✅ | ✅ | ✅ | ✅ |
| View Personal Orders & Invoices | ❌ | ✅ | ✅ | ✅ | ✅ |
| Generate Secure Download URL | ❌ | ✅ (Owned files) | ✅ (Owned files) | ✅ (Owned files) | ✅ |
| Write Verified Review | ❌ | ✅ (Verified only) | ✅ (Verified only) | ✅ (Verified only) | ❌ |
| **Seller Onboarding & Catalog** | | | | | |
| Start "Become a Seller" Wizard | ❌ | ✅ | In Progress | Already Active | N/A |
| Access Seller Workspace (`/seller`) | ❌ | ❌ | View Status Only | ✅ | ✅ |
| Create Draft Products | ❌ | ❌ | ❌ | ✅ | ✅ |
| Upload Product ZIP/PDF Files | ❌ | ❌ | ❌ | ✅ | ✅ |
| Edit Owned Products | ❌ | ❌ | ❌ | ✅ (Own products) | ✅ (All) |
| Submit Product for Review | ❌ | ❌ | ❌ | ✅ | N/A |
| View Store Analytics & Earnings | ❌ | ❌ | ❌ | ✅ (Own store) | ✅ (All) |
| Request Earnings Payout | ❌ | ❌ | ❌ | ✅ (Min ₹1,000) | N/A |
| **Admin Operations & Moderation** | | | | | |
| Access Admin Panel (`/admin`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve / Reject Seller KYC | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve / Reject Products | ❌ | ❌ | ❌ | ❌ | ✅ |
| Trigger Razorpay Refund | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suspend / Reactivate Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit Category Hierarchy | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Platform GMV & Revenue | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Middleware Enforcement Guards

### 1. `requireAuth`
Validates JWT or session cookie. Injects `req.user = { id, email, role, sellerProfile }`.
- Returns `401 Unauthorized` if token is missing/expired.

### 2. `requireSeller`
Validates that `req.user.sellerProfile` exists AND `req.user.sellerProfile.status === 'APPROVED'`.
- Returns `403 Forbidden: Seller approval required` if not approved.

### 3. `requireAdmin`
Validates `req.user.role === 'ADMIN'`.
- Returns `403 Forbidden: Administrative privileges required` if not an admin.

### 4. `requireProductOwnership`
Ensures that `req.params.productId` belongs to `req.user.sellerProfile.id`, unless `req.user.role === 'ADMIN'`.

### 5. `requireFileOwnership`
Ensures that the buyer requesting a download token has a corresponding `Order` with `status === 'PAID'` containing the specified file.
