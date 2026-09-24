/**
 * So khớp không dấu như backend thật (cột utf8mb4_unicode_ci + đổi đ → d ở TourService):
 * "phu quoc" = "Phú Quốc", "dong thap" = "Đồng Tháp", "CAN THO" = "Cần Thơ".
 */
export const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
