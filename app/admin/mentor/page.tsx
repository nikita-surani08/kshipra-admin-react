import { Suspense } from "react";
import ManageMentor from "@/components/mentors/manageMentor";

export default function MentorPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-screen w-full bg-[#F5F6F7]" />}>
      <ManageMentor />
    </Suspense>
  );
}
