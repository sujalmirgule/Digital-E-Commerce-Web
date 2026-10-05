# Digital Marketplace — Complete Route & Screen Architecture

## 1. Route Map Overview

```text
/ (Public Root)
├── /explore                      # Product discovery with multi-faceted filtering
├── /categories                   # Category index
├── /categories/[slug]            # Category-filtered listing
├── /products/[slug]              # Product details & instant purchase flow
├── /store/[storeSlug]            # Public seller storefront
├── /search                       # Global search results
│
├── (Auth)
│   ├── /login                    # User login
│   ├── /signup                   # Registration
│   ├── /verify-email             # OTP / Verification link landing
│   ├── /forgot-password          # Password recovery request
│   └── /reset-password           # Password update with token
│
├── /checkout/[orderId]           # Razorpay checkout wrapper & state monitor
├── /checkout/success/[orderId]   # Verified transaction receipt & instant download
│
├── /dashboard (Buyer Hub)
│   ├── /                         # Buyer overview & quick access
│   ├── /orders                   # Lifetime purchase history
│   ├── /orders/[id]              # Order invoice, payment breakdown & downloads
│   ├── /library                  # "My Library" permanent digital vault
│   ├── /wishlist                 # Saved products
│   ├── /notifications            # Central alert feed
│   └── /settings                 # Profile & security settings
│
├── /become-seller                # Seller onboarding workflow
│   ├── /step-1                   # Store identity & branding
│   ├── /step-2                   # KYC & Tax identity (PAN, business type)
│   ├── /step-3                   # Payout bank account details
│   └── /pending                  # Submission status & moderation tracker
│
├── /seller (Seller Workspace)
│   ├── /                         # Revenue, orders & sales analytics
│   ├── /products                 # Catalog inventory & status tracker
│   ├── /products/new             # Multi-step product builder & file uploader
│   ├── /products/[id]/edit       # Product editor & versioning
│   ├── /orders                   # Orders with net earnings breakdown
│   ├── /customers                # Customer buyer history
│   ├── /earnings                 # Commission ledger & balance summary
│   ├── /payouts                  # Payout request & transfer status
│   ├── /reviews                  # Customer ratings & reply workbench
│   └── /store/settings           # Public storefront customizations
│
└── /admin (Platform Operations)
    ├── /                         # Platform GMV, revenue & growth metrics
    ├── /sellers                  # Seller verification & KYC review
    ├── /products/moderation      # Product queue (Approve/Reject/Changes)
    ├── /users                    # User management & access control
    ├── /orders                   # Global transaction log
    ├── /payments                 # Razorpay payment & webhook reconciliations
    ├── /refunds                  # Refund processing & license revocation
    ├── /categories               # Category hierarchy & icon manager
    ├── /reports                  # Product/Seller violation reports
    └── /settings                 # Global commission & platform parameters
```

---

## 2. Screen Specifications & Layout Hierarchy

### 2.1 Public Marketplace Screens

#### `Screen 1: Landing Page (/)`
- **Header**: Sticky glassmorphic navbar with Logo, Category dropdown, Search bar, "Become a Seller" CTA, Cart/Quick checkout indicator, Auth buttons or User Profile avatar.
- **Hero Section**: 
  - Eyebrow: *"The Premier Indian Digital Marketplace"*
  - Headline: **"Everything Digital. One Marketplace."**
  - Subtitle: *Discover high-converting UI kits, production-ready boilerplates, Notion workspaces, and digital assets. Powered by instant Razorpay delivery.*
  - Dual CTAs: `Explore Catalog` (Primary glow button) + `Start Selling` (Ghost border button).
  - Floating Live Stat Pill: *100% Instant Delivery • Razorpay Verified • 2,400+ Creators*.
- **Category Grid**: 8 core categories with interactive micro-animations (Development, Design, AI, Education, Productivity, Media, Software, 3D Assets).
- **Featured Showcase**: Horizontal carousel of handpicked creator kits with seller badge, rating stars, price, and quick preview modal.
- **Trending / Best Sellers**: Grid of top-performing digital assets with discount tags and review counts.
- **Creator Value Proposition ("Have something worth selling?")**: 2-column creator pitch detailing 90% seller payouts, zero listing fees, automated delivery, and instant UPI payouts.
- **Trust & Security Banner**: Razorpay PCI-DSS compliance, encrypted file storage, signed download URLs, instant PDF invoice generation.
- **Footer**: Organized 4-column directory + copyright + social links.

#### `Screen 2: Product Discovery & Explore (/explore)`
- **Sidebar Filters**:
  - Category / Subcategory tree with item counters.
  - Price Range Slider (₹0 - ₹10,000+) + "Free Products" toggle.
  - Minimum Rating filter (4.5★+, 4.0★+, 3.0★+).
  - Product Type (Digital Download, Software, Bundle).
  - File Formats (ZIP, FIG, PDF, PSD, Source Code).
  - License Type (Personal, Commercial, Extended).
- **Sorting Toolbar**: Best Match, Price: Low to High, Price: High to Low, Most Popular, Newest Releases.
- **Product Card Component**:
  - 16:9 Image thumbnail with hover preview zoom.
  - Category pill & version tag (`v1.2`).
  - Product Title & Seller Store link with verified checkmark.
  - Star rating with total review count (`⭐ 4.9 (128)`).
  - Pricing display: Discounted price in ₹ + struck-through original price.
  - "Quick Buy" button launching instant checkout modal.

#### `Screen 3: Product Detail Page (/products/[slug])`
- **Left Column (Media & Content)**:
  - Interactive Gallery: Main preview image/video + clickable thumbnail carousel.
  - Live Demo Button (if available).
  - Rich-text overview, features checklist, system requirements.
  - File contents breakdown (e.g. `Includes: 45+ Figma screens, 120+ Components, Documentation PDF`).
  - Changelog & version history timeline.
  - Verified Purchaser Reviews list with rating distribution chart and seller responses.
- **Right Column (Sticky Checkout Sidebar)**:
  - Selected License Tier selector (Personal / Commercial / Team).
  - Pricing box: `₹799` with tax inclusive indicator.
  - Primary CTA: **"Buy Now via Razorpay"** (Launches server-side order generation).
  - Secondary CTA: Wishlist bookmark button.
  - Security badges: *Instant Download • Secure Razorpay UPI/Cards • Guaranteed Updates*.
  - Seller mini-card: Logo, store name, total sales, response time, "View Store" link.

#### `Screen 4: Seller Storefront (/store/[storeSlug])`
- **Banner & Header**: Custom branded banner, seller avatar, bio, total products, follower count, total sales, social links, and "Follow Store" button.
- **Store Tabs**: Products (grid with in-store search), About & FAQ, Customer Reviews.

---

### 2.2 Checkout & Delivery Screens

#### `Screen 5: Instant Checkout Modal / Page (/checkout/[orderId])`
- Minimalist distraction-free checkout layout.
- Order Summary: Product name, seller, selected license, subtotal, discount, total payable in ₹.
- Customer Details: Email (auto-filled if logged in) for digital receipt delivery.
- Payment Action: **"Pay with Razorpay"** triggering official Razorpay Standard Checkout SDK (supporting Google Pay, PhonePe, Paytm, UPI QR, Credit/Debit cards, Net Banking).
- Live fallback polling state machine if user closes browser during redirect.

#### `Screen 6: Payment Success & Delivery (/checkout/success/[orderId])`
- Animated success checkmark.
- Order metadata: Order ID (`ORD-20261005-9821`), Razorpay Payment ID (`pay_Px7a91Lkd`), Date.
- Action Buttons:
  - **"Download Product Files"** (Calls authenticated secure download API).
  - **"Download Official Tax Receipt (PDF)"**.
  - **"Go to My Library"**.
- Delivery notice: *A backup copy of this order and download links has been dispatched to your email.*

---

### 2.3 Buyer Dashboard Screens

#### `Screen 7: Buyer Overview (/dashboard)`
- Stat cards: Total Purchases, Downloads Remaining, Saved Items, Followed Creators.
- "Recent Purchases" list with instant download buttons.
- Recommended updates: Alerts if any previously bought product received a new version.

#### `Screen 8: My Library (/dashboard/library)`
- Searchable digital product shelf.
- Each product card displays:
  - Product thumbnail and title.
  - Purchase date & license type.
  - Current version available (`v2.0.1`).
  - Active **"Download"** button (fetches fresh signed URL).
  - "Write a Review" button (if not reviewed yet).

#### `Screen 9: Order History & Details (/dashboard/orders/[id])`
- Detailed itemized invoice view.
- Payment method used (UPI/Card), timestamp, Razorpay reference.
- Direct PDF receipt generation button.
- "Report an Issue / Support" button linking to seller support.

---

### 2.4 Seller Onboarding & Hub Screens

#### `Screen 10: Seller Onboarding Wizard (/become-seller)`
- **Step 1: Store Setup**: Store name, unique slug (`/store/your-slug`), tagline, logo upload.
- **Step 2: KYC & Compliance**: PAN number (encrypted), legal business name, country, registered address.
- **Step 3: Payout Details**: Bank account number, IFSC code, account holder name (configured for Razorpay Payouts).
- **Step 4: Review & Submit**: Summary check -> Transitions status to `PENDING` -> redirects to status tracker.

#### `Screen 11: Seller Analytics & Dashboard (/seller)`
- **Top KPIs**:
  - Total Gross Revenue (`₹1,42,800`)
  - Platform Fee Deducted (`₹14,280`)
  - Net Available Balance (`₹84,520`)
  - Pending Balance (`₹12,400`)
  - Total Orders (`214`)
- **Interactive Revenue Chart**: 7d, 30d, 90d, All-time toggle.
- **Recent Orders Table**: Order ID, Product, Customer Name, Paid Amount, Net Earnings, Status.
- **Quick Actions**: "+ Create New Product", "Request Payout", "Store Preview".

#### `Screen 12: Seller Product Management (/seller/products)`
- DataTable with search, category filter, and status filter (`All`, `Published`, `Pending Review`, `Draft`, `Rejected`).
- Columns: Product Preview, Title, Price, Sales, Net Revenue, Rating, Status Badge, Actions (Edit, Submit, Unpublish, Delete).

#### `Screen 13: Product Creation Studio (/seller/products/new)`
- **Tab 1: Basic Information**: Title, category, tags, short description, Markdown rich-text editor for full details.
- **Tab 2: Media & Gallery**: Drag-and-drop thumbnail uploader, gallery screenshots (up to 6), demo preview URL.
- **Tab 3: Digital Files & Packaging**: Secure file upload (ZIP, PDF, etc.) -> Direct private object storage stream -> File checksum & size calculation -> Download limit configuration.
- **Tab 4: Pricing & Licensing**: Price in ₹, optional discount price, license terms selector, version number.
- **Footer Actions**: "Save as Draft", "Preview as Buyer", **"Submit for Admin Review"**.

#### `Screen 14: Seller Earnings & Payouts (/seller/earnings)`
- Transparent financial ledger itemizing every sale: Gross sale, platform 10% fee, payment gateway fee, net credited amount, release date.
- Payout Request modal: Minimum payout threshold check (₹1,000) -> One-click transfer request -> Payout status tracker (`PROCESSING` -> `PAID`).

---

### 2.5 Admin Operations Panel

#### `Screen 15: Admin Executive Dashboard (/admin)`
- Real-time marketplace KPIs: Gross Merchandise Value (GMV), Platform Net Revenue, Active Sellers, Total Buyers, Pending Moderation Queue.
- Alerts banner: Number of products awaiting review, pending seller KYC approvals, open dispute reports.

#### `Screen 16: Product Moderation Workbench (/admin/products/moderation)`
- Side-by-side review interface:
  - Seller details & reputation score.
  - Uploaded digital file inspection (filename, size, virus scan status, extension validation).
  - Product copy, tags, pricing, and preview gallery.
- Moderation Actions:
  - **Approve & Publish**: Automatically marks product `PUBLISHED`, notifies seller.
  - **Request Changes**: Opens modal to write specific revision requirements to seller.
  - **Reject**: Rejects with standardized or custom reason.

#### `Screen 17: Transaction & Refund Controller (/admin/orders & /admin/refunds)`
- Full audit log of all transactions with Razorpay Order ID and Payment ID links.
- Refund Trigger: Initiates Razorpay Refund API call -> Marks order `REFUNDED` -> Revokes buyer download tokens -> Deducts amount from seller's pending ledger -> Sends notifications.
