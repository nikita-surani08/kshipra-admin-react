import { Suspense } from "react";
import ManagePastSession from "@/components/pastSession/managePastSession";

export default function PastSessionPage() {
  return (
    <Suspense fallback={null}>
      <ManagePastSession />
    </Suspense>
  );
}
