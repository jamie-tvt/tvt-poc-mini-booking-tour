import type { Metadata } from "next";
import { PlaceManager } from "@/features/manager/components/CategoryManager";

export const metadata: Metadata = { title: "Địa điểm" };

export default function PlacesPage() {
  return <PlaceManager />;
}
