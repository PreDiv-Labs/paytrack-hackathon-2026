import { notFound } from "next/navigation";
import { emptyWorkspace } from "@/lib/workspace";
import { WorkspaceApp } from "@/components/workspace-app";
import { sections } from "@/lib/navigation";
export default async function Preview({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const current = section?.[0] ?? "overview";
  if (!sections.includes(current) || (section?.length ?? 0) > 1) notFound();
  return <WorkspaceApp initial={emptyWorkspace()} section={current} preview />;
}
