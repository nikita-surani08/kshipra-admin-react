import { Suspense } from "react";
import ManageLiveSession from "@/components/liveSession/manageLiveSession";

export default function LiveSessionPage() {
  return (
    <Suspense fallback={null}>
      <ManageLiveSession />
    </Suspense>
  );
}
