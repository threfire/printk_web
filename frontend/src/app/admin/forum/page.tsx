import { AdminPageContent } from "../_components/AdminPageContent";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminForumPage({ searchParams }: AdminPageProps) {
  return <AdminPageContent searchParams={searchParams} section="forum" />;
}
