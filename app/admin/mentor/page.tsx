import { Suspense } from "react";
import ManageMentor from "@/components/mentors/manageMentor";

export default function MentorPage() {
  return (
    <Suspense fallback={null}>
      <ManageMentor />
    </Suspense>
  );
}
