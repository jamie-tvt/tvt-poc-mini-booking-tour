/** Ảnh minh hoạ tour (public/images/tours/*.svg) nhúng thẳng vào file HTML dưới dạng data URL. */
const files = import.meta.glob<string>("../../public/images/tours/*.svg", { eager: true, query: "?url", import: "default" });

const byPath: Record<string, string> = {};
for (const [file, url] of Object.entries(files)) byPath[`/images/tours/${file.split("/").pop()}`] = url;

export const PLACEHOLDER_DATA_URL = byPath["/images/tours/placeholder.svg"];

/** "/images/tours/cai-rang.svg" → data URL; URL khác (http…) giữ nguyên. */
export function imageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return byPath[url] ?? url;
}
