"use client";

import { managerService } from "../services/managerService";
import { NamedEntityManager } from "./NamedEntityManager";

export function CategoryManager() {
  return (
    <NamedEntityManager
      title="Danh mục tour"
      description="Danh mục còn tour sẽ không xoá được."
      entityLabel="danh mục"
      queryKey="mgr-categories"
      list={managerService.categories}
      create={managerService.createCategory}
      update={managerService.updateCategory}
      remove={managerService.deleteCategory}
    />
  );
}

export function PlaceManager() {
  return (
    <NamedEntityManager
      title="Địa điểm"
      description="Địa điểm dùng để dựng lịch trình tour."
      entityLabel="địa điểm"
      withDescription
      queryKey="mgr-places"
      list={managerService.places}
      create={managerService.createPlace}
      update={managerService.updatePlace}
      remove={managerService.deletePlace}
    />
  );
}
