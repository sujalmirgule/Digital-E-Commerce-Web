"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellerDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seller");
  }, [router]);

  return (
    <div className="py-20 text-center text-xs text-velvet-cream-muted">
      Redirecting to Seller Studio...
    </div>
  );
}
