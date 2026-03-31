import { Suspense } from "react";
import ManageLiveSession from "@/components/liveSession/manageLiveSession";

export default function LiveSessionPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-screen w-full bg-[#F5F6F7]" />}>
      <ManageLiveSession />
    </Suspense>
  );
}
