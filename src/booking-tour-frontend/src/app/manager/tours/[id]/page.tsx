import type { Metadata } from "next";
import { TourEditor } from "@/features/manager/components/TourEditor";
import { firstParam } from "@/lib/utils/query";

export const metadata: Metadata = { title: "Sửa tour" };

export default async function EditTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <TourEditor key={id} id={id} initialTab={firstParam(sp.tab)} />;
}
