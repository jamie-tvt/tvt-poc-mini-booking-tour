import { describe, expect, it } from "vitest";
import catalog from "../../../booking-tour-backend/src/main/resources/seed/mekong-catalog.json";
import { seed } from "./db";

describe("catalog 200 tour miền Tây trong bản demo offline", () => {
  const now = Date.UTC(2026, 8, 24, 3, 0, 0); // 10:00 giờ VN
  const db = seed(now);

  it("thêm đủ 200 tour đang bán vào sau 8 tour demo gốc", () => {
    expect(catalog.tours).toHaveLength(200);
    expect(db.tours).toHaveLength(208);
    const added = db.tours.slice(8);
    expect(added.map((t) => t.tourCode)).toEqual(catalog.tours.map((t) => t.code));
    expect(added.every((t) => t.status === "ACTIVE")).toBe(true);
  });

  it("danh mục và địa điểm trùng tên được dùng lại, không nhân đôi", () => {
    expect(new Set(db.categories.map((c) => c.name)).size).toBe(db.categories.length);
    expect(db.categories).toHaveLength(6);
    expect(new Set(db.places.map((p) => p.name)).size).toBe(db.places.length);
    expect(db.places.find((p) => p.name === "Chợ nổi Cái Răng")!.id).toBe(1);
  });

  it("mỗi tour mới có lịch trình, ảnh Unsplash và 3 đợt khởi hành sắp tới", () => {
    for (const t of db.tours.slice(8)) {
      expect(db.details.filter((d) => d.tourId === t.id).length).toBeGreaterThan(0);
      const imgs = db.images.filter((i) => i.tourId === t.id);
      expect(imgs.length).toBeGreaterThanOrEqual(3);
      expect(imgs[0]!.imageUrl).toBe(t.coverImageUrl);
      expect(imgs.every((i) => i.imageUrl.startsWith("https://images.unsplash.com/photo-") && i.imageUrl.length <= 255)).toBe(true);
      const deps = db.departures.filter((d) => d.tourId === t.id);
      expect(deps).toHaveLength(3);
      expect(deps.every((d) => d.status === "OPEN" && d.startAt > now && d.capacity === t.maxGuests && d.bookedSeats === 0)).toBe(true);
    }
  });

  it("phủ đủ 13 tỉnh miền Tây", () => {
    expect(new Set(catalog.places.map((p) => p.province)).size).toBe(13);
  });
});
