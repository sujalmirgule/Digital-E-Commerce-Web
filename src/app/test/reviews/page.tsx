"use client";

import React, { useState } from "react";
import Link from "next/link";

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  sellerReply?: string | null;
  reviewer: {
    displayName: string;
    avatarUrl: string | null;
  };
}

export default function TestReviewsPage() {
  const [token, setToken] = useState("");
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("Outstanding quality!");
  const [comment, setComment] = useState("Completely exceeded my expectations. Smooth download and setup.");

  const [loading, setLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<any | null>(null);
  const [reviewsData, setReviewsData] = useState<{
    reviews: Review[];
    ratingSummary: any;
    pagination: any;
  } | null>(null);

  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!@");

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }
    return headers;
  };

  const handleLogin = async (role: "buyer" | "admin") => {
    setLoading(true);
    setError(null);
    try {
      const targetEmail =
        role === "admin"
          ? "admin@marketplace.com"
          : email || "buyer@example.com";
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password }),
      });
      const data = await res.json();
      if (res.ok && data.data?.token) {
        setToken(data.data.token);
        setStatusMessage(`Logged in as ${data.data.user.role} (${data.data.user.email})`);
      } else {
        setError(data.error?.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check Eligibility
  const checkEligibility = async () => {
    if (!productId) {
      setError("Please provide a Product ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/products/${productId}/reviews/eligibility`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      setEligibilityResult(data.data);
      if (res.ok) {
        setStatusMessage(data.message);
      } else {
        setError(data.error?.message || "Failed to check eligibility");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Review
  const submitReview = async () => {
    if (!productId) {
      setError("Please provide a Product ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/products/${productId}/reviews`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          rating: Number(rating),
          title,
          comment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage("Review submitted successfully! Rating aggregates updated.");
        fetchPublicReviews();
      } else {
        setError(data.error?.message || "Failed to submit review");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Public Reviews
  const fetchPublicReviews = async () => {
    if (!productId) {
      setError("Please provide a Product ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/products/${productId}/reviews`);
      const data = await res.json();
      if (res.ok) {
        setReviewsData(data.data);
        setStatusMessage(`Fetched ${data.data.reviews.length} reviews.`);
      } else {
        setError(data.error?.message || "Failed to fetch reviews");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: List Reviews
  const fetchAdminReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/reviews", {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminReviews(data.data.reviews);
        setStatusMessage(`Admin fetched ${data.data.reviews.length} reviews.`);
      } else {
        setError(data.error?.message || "Failed to fetch admin reviews");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Moderate Review
  const moderate = async (reviewId: string, action: "hide" | "restore" | "delete") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`Review ${reviewId} successfully ${action}d!`);
        fetchAdminReviews();
        if (productId) fetchPublicReviews();
      } else {
        setError(data.error?.message || `Failed to ${action} review`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verified Buyer Reviews Test Bench (Feature 16)
            </h1>
            <p className="text-sm text-gray-600">
              Verified purchaser eligibility, rating aggregates, public display, and admin moderation
            </p>
          </div>
          <Link
            href="/test/receipts"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Receipts Test Bench
          </Link>
        </div>

        {/* Global Alert Messages */}
        {statusMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Session / Authentication Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">1. Authentication</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                JWT Token (or Login below)
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Bearer eyJhbGciOi..."
                className="w-full text-xs font-mono border rounded p-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => handleLogin("buyer")}
                disabled={loading}
                className="bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Login as Buyer
              </button>
              <button
                type="button"
                onClick={() => handleLogin("admin")}
                disabled={loading}
                className="bg-gray-800 text-white text-xs font-medium px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
              >
                Login as Admin
              </button>
            </div>
          </div>
        </div>

        {/* Verified Purchase Review Form */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            2. Verified Purchaser Review Submission
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Product ID or Slug
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="prod_xxxx or product-slug"
                  className="flex-1 text-sm border rounded p-2 font-mono"
                />
                <button
                  type="button"
                  onClick={checkEligibility}
                  disabled={loading || !productId}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded"
                >
                  Check Eligibility
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rating (1 to 5 Stars)
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full text-sm border rounded p-2"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 - Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ (4 - Very Good)</option>
                <option value={3}>⭐⭐⭐ (3 - Average)</option>
                <option value={2}>⭐⭐ (2 - Below Average)</option>
                <option value={1}>⭐ (1 - Poor)</option>
              </select>
            </div>
          </div>

          {eligibilityResult && (
            <div
              className={`p-3 rounded text-xs ${
                eligibilityResult.eligible
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {eligibilityResult.eligible ? (
                <span>
                  ✅ Verified Purchaser verified via Order ID:{" "}
                  <strong>{eligibilityResult.orderId}</strong>
                </span>
              ) : (
                <span>⚠️ {eligibilityResult.message}</span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Review Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Written Review Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full text-sm border rounded p-2"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitReview}
              disabled={loading || !productId}
              className="bg-indigo-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              Submit Verified Review
            </button>
            <button
              type="button"
              onClick={fetchPublicReviews}
              disabled={loading || !productId}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium px-4 py-2 rounded"
            >
              Fetch Public Reviews
            </button>
          </div>
        </div>

        {/* Public Reviews & Ratings Display Section */}
        {reviewsData && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Customer Reviews & Ratings
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900">
                    ⭐ {reviewsData.ratingSummary.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({reviewsData.ratingSummary.reviewsCount} verified reviews)
                  </span>
                </div>
              </div>

              {/* Distribution */}
              <div className="space-y-1 text-xs text-gray-600">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-10">{star} stars:</span>
                    <span className="font-mono font-bold">
                      {reviewsData.ratingSummary.distribution[star] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {reviewsData.reviews.map((r) => (
                <div key={r.id} className="p-4 bg-gray-50 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {r.reviewer.displayName}
                      </span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-medium">
                        ✓ Verified Purchase
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                    <span className="ml-2 font-bold text-gray-800">{r.title}</span>
                  </div>
                  <p className="text-xs text-gray-700">{r.comment}</p>
                  {r.sellerReply && (
                    <div className="mt-2 p-2 bg-indigo-50 border-l-2 border-indigo-600 text-xs text-indigo-900">
                      <span className="font-semibold">Seller Response: </span>
                      {r.sellerReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Review Moderation Register */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              3. Admin Review Moderation Workbench
            </h2>
            <button
              type="button"
              onClick={fetchAdminReviews}
              disabled={loading}
              className="text-xs bg-gray-800 text-white font-medium px-3 py-1.5 rounded hover:bg-gray-900"
            >
              Load Admin Register
            </button>
          </div>

          {adminReviews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Buyer</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Rating</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Title</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Visible</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminReviews.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-gray-800 font-medium">{r.product?.title}</td>
                      <td className="px-3 py-2 text-gray-600">{r.buyer?.fullName}</td>
                      <td className="px-3 py-2 text-center font-bold text-amber-600">{r.rating} ★</td>
                      <td className="px-3 py-2 text-gray-800">{r.title}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            r.isVisible
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.isVisible ? "Visible" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        {r.isVisible ? (
                          <button
                            type="button"
                            onClick={() => moderate(r.id, "hide")}
                            className="text-amber-600 hover:text-amber-800 font-medium"
                          >
                            Hide
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => moderate(r.id, "restore")}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => moderate(r.id, "delete")}
                          className="text-red-600 hover:text-red-800 font-medium ml-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No reviews loaded. Click &apos;Load Admin Register&apos;.</p>
          )}
        </div>
      </div>
    </div>
  );
}
