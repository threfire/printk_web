import { AdminPageContent } from "../_components/AdminPageContent";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminSSLPage({ searchParams }: AdminPageProps) {
  return <AdminPageContent searchParams={searchParams} section="ssl" />;
}
