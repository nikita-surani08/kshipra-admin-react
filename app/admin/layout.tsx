"use client";

import Sidebar from "@/components/sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("idToken") : null;

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[20%] h-full overflow-hidden">
        <Sidebar />
      </div>
      <main className="w-[80%] h-full overflow-y-auto border">{children}</main>
    </div>
  );
}
