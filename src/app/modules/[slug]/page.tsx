import { notFound } from "next/navigation";
import { MODULES, getModule } from "@/lib/sim/modules";
import { MODULE_CLIENTS } from "@/components/modules/registry";

export function generateStaticParams() {
  return MODULES.map((moduleSummary) => ({ slug: moduleSummary.slug }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getModule(slug)) notFound();

  const ModuleClient = MODULE_CLIENTS[slug];
  if (!ModuleClient) notFound();

  return <ModuleClient />;
}
