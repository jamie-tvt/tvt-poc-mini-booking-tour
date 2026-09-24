import { describe, expect, it } from "vitest";
import { fold } from "./fold";

describe("fold (tìm kiếm không dấu của API giả lập)", () => {
  it("bỏ dấu, đ → d, không phân biệt hoa thường", () => {
    expect(fold("Phú Quốc – Nam đảo")).toBe("phu quoc – nam dao");
    expect(fold("Cần Thơ")).toBe("can tho");
    expect(fold("ĐỒNG THÁP")).toBe("dong thap");
    expect(fold("Chợ nổi Cái Răng")).toContain("cho noi");
  });

  it("chuỗi đã gập giữ nguyên, dùng được cho includes()", () => {
    expect(fold("phu quoc")).toBe("phu quoc");
    expect(fold("Phú Quốc – Nam đảo và cáp treo Hòn Thơm").includes(fold("phu quoc"))).toBe(true);
    expect(fold("Sóc Trăng").includes(fold("can tho"))).toBe(false);
  });
});
