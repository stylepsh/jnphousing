import { redirect } from "next/navigation";

export default async function AdminLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const qs = new URLSearchParams();
  if (error) qs.set("error", error);
  if (next) qs.set("next", next);
  const tail = qs.toString();
  redirect(`/login${tail ? `?${tail}` : ""}`);
}
