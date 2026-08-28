"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-6">
      <ErrorState
        title="Something went wrong"
        description="This page couldn't be loaded. This is usually temporary — try again in a moment."
        action={<Button onClick={() => retry()}>Try again</Button>}
      />
    </div>
  );
}
