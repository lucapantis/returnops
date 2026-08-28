import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeReturn } from "@/lib/serialize";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReturnForm } from "@/components/returns/ReturnForm";

export default async function EditReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.return.findUnique({ where: { id } });

  if (!record) {
    notFound();
  }

  const r = serializeReturn(record);

  return (
    <div>
      <PageHeader title={`Edit ${r.returnRef}`} description="Update this return record." />
      <ReturnForm existing={r} />
    </div>
  );
}
