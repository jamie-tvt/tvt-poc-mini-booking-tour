import { describe, expect, it } from "vitest";
import { fallbackImageFor, unsplashSrcSet, unsplashVariant } from "../images";

const PHOTO = "https://images.unsplash.com/photo-1732243395944-cb3ff9311091?auto=format&fit=crop&w=1200&q=75";

describe("unsplashVariant", () => {
  it("đổi w (và q) của ảnh Unsplash, giữ các tham số khác", () => {
    const u = new URL(unsplashVariant(PHOTO, 800));
    expect(u.hostname).toBe("images.unsplash.com");
    expect(u.pathname).toBe("/photo-1732243395944-cb3ff9311091");
    expect(u.searchParams.get("w")).toBe("800");
    expect(u.searchParams.get("q")).toBe("75");
    expect(u.searchParams.get("auto")).toBe("format");
    expect(u.searchParams.get("fit")).toBe("crop");

    const tiny = new URL(unsplashVariant(PHOTO, 64, 40));
    expect(tiny.searchParams.get("w")).toBe("64");
    expect(tiny.searchParams.get("q")).toBe("40");
  });

  it("thêm w khi URL Unsplash chưa có tham số", () => {
    expect(unsplashVariant("https://images.unsplash.com/photo-1-abc", 1200)).toBe("https://images.unsplash.com/photo-1-abc?w=1200");
  });

  it("giữ nguyên ảnh local / host khác / rỗng", () => {
    expect(unsplashVariant("/images/tours/cai-rang.svg", 800)).toBe("/images/tours/cai-rang.svg");
    expect(unsplashVariant("https://cdn.example.com/a.jpg?w=10", 800)).toBe("https://cdn.example.com/a.jpg?w=10");
    expect(unsplashVariant("data:image/svg+xml;base64,AAAA", 800)).toBe("data:image/svg+xml;base64,AAAA");
    expect(unsplashVariant(undefined, 800)).toBeUndefined();
    expect(unsplashVariant("", 800)).toBeUndefined();
  });
});

describe("unsplashSrcSet / fallbackImageFor", () => {
  it("srcSet 800/1200/1600 chỉ cho ảnh Unsplash", () => {
    const set = unsplashSrcSet(PHOTO)!;
    expect(set.split(", ")).toHaveLength(3);
    expect(set).toMatch(/w=800[^ ]* 800w/);
    expect(set).toMatch(/w=1600[^ ]* 1600w/);
    expect(unsplashSrcSet("/images/tours/phu-quoc.svg")).toBeUndefined();
  });

  it("ảnh seed → SVG minh hoạ cùng chủ đề; ảnh lạ → undefined", () => {
    expect(fallbackImageFor(PHOTO)).toBe("/images/tours/phu-quoc.svg");
    expect(fallbackImageFor("https://images.unsplash.com/photo-1-abc")).toBeUndefined();
    expect(fallbackImageFor(null)).toBeUndefined();
  });
});
