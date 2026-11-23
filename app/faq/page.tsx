import type { Metadata } from "next";
import GuidePage from "@/components/marketing/GuidePage";
import { guide } from "@/lib/guides";
import { pageMetadata } from "@/lib/page-metadata";
import "../home.css";

const GUIDE = guide("/faq");

export const metadata: Metadata = pageMetadata({
  path: "/faq",
  title: GUIDE.title,
  description: GUIDE.description,
});

export default function Page() {
  return <GuidePage guide={GUIDE} />;
}
