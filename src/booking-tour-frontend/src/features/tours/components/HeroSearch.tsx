"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { toQueryString } from "@/lib/utils/query";
import type { CategoryDto } from "@/types/domain";

export function HeroSearch({ categories }: { categories: CategoryDto[] }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departFrom, setDepartFrom] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/tours${toQueryString({ keyword: keyword.trim(), categoryId, departFrom })}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Tìm tour"
      className="glass grid gap-3 p-4 text-ink sm:grid-cols-2 sm:p-5 lg:grid-cols-[2fr_1.3fr_1.2fr_auto] lg:items-end"
    >
      <TextField
        id="hero-keyword"
        label="Bạn muốn đi đâu?"
        placeholder="VD: Cần Thơ, chợ nổi, Phú Quốc"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        containerClassName="sm:col-span-2 lg:col-span-1"
      />
      <SelectField id="hero-category" label="Danh mục" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">Tất cả danh mục</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <TextField
        id="hero-depart"
        type="date"
        label="Khởi hành từ ngày"
        value={departFrom}
        onChange={(e) => setDepartFrom(e.target.value)}
      />
      <Button type="submit" variant="cta" size="lg" className="sm:col-span-2 lg:col-span-1">
        <Search className="size-5" aria-hidden="true" /> Tìm tour
      </Button>
    </form>
  );
}
