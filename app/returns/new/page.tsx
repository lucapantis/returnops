import { PageHeader } from "@/components/ui/PageHeader";
import { ReturnForm } from "@/components/returns/ReturnForm";
import { requirePermission } from "@/lib/auth/guard";

export default async function NewReturnPage() {
  await requirePermission("returns:create");

  return (
    <div>
      <PageHeader title="New return" description="Log a new return record." />
      <ReturnForm />
    </div>
  );
}
