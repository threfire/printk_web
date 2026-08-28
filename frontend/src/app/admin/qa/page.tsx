import { AdminPageContent } from "../_components/AdminPageContent";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminQaPage({ searchParams }: AdminPageProps) {
  return <AdminPageContent searchParams={searchParams} section="qa" />;
}
