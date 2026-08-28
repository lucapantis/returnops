import { PageHeader } from "@/components/ui/PageHeader";
import { ReturnForm } from "@/components/returns/ReturnForm";

export default function NewReturnPage() {
  return (
    <div>
      <PageHeader title="New return" description="Log a new return record." />
      <ReturnForm />
    </div>
  );
}
