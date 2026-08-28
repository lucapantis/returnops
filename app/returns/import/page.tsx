import { PageHeader } from "@/components/ui/PageHeader";
import { ImportWizard } from "@/components/import/ImportWizard";
import { requirePermission } from "@/lib/auth/guard";

export default async function ImportReturnsPage() {
  await requirePermission("returns:import");

  return (
    <div>
      <PageHeader
        title="Import CSV"
        description="Bulk-load return records from a CSV file. Rows are validated and deduplicated before anything is saved."
      />
      <ImportWizard />
    </div>
  );
}
