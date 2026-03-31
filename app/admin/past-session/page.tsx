import { Suspense } from "react";
import ManagePastSession from "@/components/pastSession/managePastSession";

export default function PastSessionPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-screen w-full bg-[#F5F6F7]" />}>
      <ManagePastSession />
    </Suspense>
  );
}
