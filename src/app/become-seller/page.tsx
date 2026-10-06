"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BecomeSellerRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seller/signup");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#120A12] flex items-center justify-center text-xs text-[#BBAE9F]">
      Redirecting to Creator Onboarding...
    </div>
  );
}
