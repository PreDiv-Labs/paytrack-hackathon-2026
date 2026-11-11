import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { workspace } from "@/lib/workspace";
import { WorkspaceApp } from "@/components/workspace-app";
import { sections } from "@/lib/navigation";
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const data = await workspace(session.user.id);
  return <WorkspaceApp initial={data} section={section} />;
}
