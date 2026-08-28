import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        title="Page not found"
        description="The page or return record you're looking for doesn't exist or may have been removed."
        action={<LinkButton href="/">Back to dashboard</LinkButton>}
      />
    </div>
  );
}
