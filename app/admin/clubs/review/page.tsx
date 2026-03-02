import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function AdminClubReviewPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdmin();
  const q = searchParams.q?.trim() || "";
  redirect(`/admin/club-claims?tab=duplicates${q ? `&q=${encodeURIComponent(q)}` : ""}`);
}
