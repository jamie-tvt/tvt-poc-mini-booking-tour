import type { Metadata } from "next";
import { CategoryManager } from "@/features/manager/components/CategoryManager";

export const metadata: Metadata = { title: "Danh mục tour" };

export default function CategoriesPage() {
  return <CategoryManager />;
}
