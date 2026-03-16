import React, { Suspense } from "react";
import CompareClient from "./CompareClient";

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading compare...</div>}>
      {/* Client-side compare UI */}
      <CompareClient />
    </Suspense>
  );
}
