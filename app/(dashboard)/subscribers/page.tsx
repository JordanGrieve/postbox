import { redirect } from "next/navigation";

export const metadata = { title: "People" };

/**
 * /subscribers is the People tab on /newsletters since 19 Nov 2026 (Jordan:
 * "we are removing subscribers and moving it into there"). Old links and
 * bookmarks land there with their filter and page kept. One person's
 * consent page, /subscribers/[id], is unchanged and links back to People.
 */
export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const q = new URLSearchParams({ tab: "people" });
  if (status) q.set("status", status);
  if (page) q.set("page", page);
  redirect(`/newsletters?${q.toString()}`);
}
