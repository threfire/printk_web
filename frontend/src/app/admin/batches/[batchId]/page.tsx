import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, type BatchDetailData } from "@/lib/api";
import { AdminPageContent } from "../../_components/AdminPageContent";

type BatchPageProps = {
  params: Promise<{
    batchId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function fetchBatchDetail(batchId: string, token: string): Promise<BatchDetailData | null> {
  const response = await fetch(`${API_BASE}/api/invoices/batches/${batchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<BatchDetailData>;
}

export default async function BatchDetailPage({ params, searchParams }: BatchPageProps) {
  const { batchId } = await params;
  const token = (await cookies()).get("printk-admin-token")?.value ?? "";

  if (!token) {
    redirect("/admin/materials");
  }

  const detail = await fetchBatchDetail(batchId, token);

  if (!detail) {
    redirect("/api/admin/logout");
  }

  return (
    <AdminPageContent
      batchDetail={detail}
      batchId={batchId}
      searchParams={searchParams}
      section="batch"
    />
  );
}
