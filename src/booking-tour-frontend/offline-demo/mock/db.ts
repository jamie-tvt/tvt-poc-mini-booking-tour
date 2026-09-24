/**
 * "Cơ sở dữ liệu" của API giả lập: 1 object JSON lưu ở localStorage.
 * Seed bám DemoDataSeeder.java của backend (cùng tài khoản, tour, đợt, đơn mẫu, sinh theo "hôm nay").
 */
import type { BookingStatus, DepartureStatus, PaymentStatus, ReviewStatus, Role, TourStatus } from "@/types/domain";

export const DB_KEY = "bt.demo.db.v1";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface User { id: number; role: Role; fullName: string; email: string; password: string; phone?: string; address?: string; active: boolean; createdAt: number }
export interface Category { id: number; name: string }
export interface Place { id: number; name: string; description?: string }
export interface Tour {
  id: number; tourCode: string; title: string; description: string; destination: string; price: number; durationDays: number;
  maxGuests: number; coverImageUrl?: string; categoryId: number; status: TourStatus; createdAt: number; updatedAt: number;
}
export interface Detail { id: number; tourId: number; placeId: number; displayOrder: number }
export interface Image { id: number; tourId: number; imageUrl: string; sortOrder: number }
export interface Departure {
  id: number; tourId: number; tourGuideId?: number; capacity: number; bookedSeats: number; adultPrice: number; childPrice: number;
  startAt: number; endAt: number; status: DepartureStatus; cancelReason?: string; createdAt: number; updatedAt: number;
}
export interface Booking {
  id: number; bookingCode: string; userId: number; departureId: number; adultQuantity: number; childQuantity: number; ticketQuantity: number;
  totalPrice: number; status: BookingStatus; bookedAt: number; expiresAt?: number; cancelledAt?: number; cancelReason?: string; completedAt?: number;
}
export interface Bill { id: number; bookingId: number; billCode: string; amount: number; createdAt: number }
export interface Payment {
  id: number; billId: number; amount: number; refundAmount?: number; provider: "MOCK"; transactionCode?: string; paymentMethod?: string;
  status: PaymentStatus; note?: string; createdAt: number; paidAt?: number;
}
export interface Review { id: number; userId: number; tourId: number; bookingId: number; rating: number; content: string; status: ReviewStatus; createdAt: number }
export interface Notification { id: number; userId: number; bookingId?: number; title: string; content: string; read: boolean; createdAt: number }
export interface Audit { id: number; userId?: number; action: string; entityType?: string; entityId?: number; result: string; detail?: string; createdAt: number }
export interface Setting { key: string; value: string; description: string }
export interface Token { token: string; userId: number; family: string; revoked: boolean }

export interface DB {
  version: 1;
  seededAt: number;
  offsetMinutes: number;
  seq: Record<string, number>;
  users: User[]; categories: Category[]; places: Place[]; tours: Tour[]; details: Detail[]; images: Image[];
  departures: Departure[]; bookings: Booking[]; bills: Bill[]; payments: Payment[]; reviews: Review[];
  notifications: Notification[]; audit: Audit[]; settings: Setting[]; tokens: Token[];
}

export type Table = Exclude<keyof DB, "version" | "seededAt" | "offsetMinutes" | "seq" | "settings">;

export function nextId(db: DB, table: Table): number {
  db.seq[table] = (db.seq[table] ?? 0) + 1;
  return db.seq[table];
}

export function insert<T extends { id: number }>(db: DB, table: Table, row: Omit<T, "id">): T {
  const full = { id: nextId(db, table), ...row } as T;
  (db[table] as unknown as T[]).push(full);
  return full;
}

/** 07:00 giờ Việt Nam (UTC+7, không đổi giờ) của ngày hôm nay + N ngày. */
export function vnMorning(now: number, daysAhead: number): number {
  const vn = new Date(now + 7 * HOUR);
  return Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + daysAhead, 0, 0, 0);
}

export function seed(now = Date.now()): DB {
  const db: DB = {
    version: 1, seededAt: now, offsetMinutes: 0, seq: {},
    users: [], categories: [], places: [], tours: [], details: [], images: [], departures: [], bookings: [], bills: [],
    payments: [], reviews: [], notifications: [], audit: [], tokens: [],
    settings: [
      { key: "booking.payment_timeout_minutes", value: "15", description: "Hạn thanh toán của booking chờ thanh toán (phút)" },
      { key: "cancel.full_refund_days", value: "7", description: "Huỷ trước ngày khởi hành ít nhất N ngày: hoàn 100%" },
      { key: "cancel.partial_refund_days", value: "3", description: "Huỷ trước ít nhất N ngày (dưới mốc hoàn đủ): hoàn một phần" },
      { key: "cancel.partial_refund_percent", value: "50", description: "Tỷ lệ hoàn một phần (%)" },
      { key: "guide.start_window_hours", value: "24", description: "HDV được bắt đầu tour trước giờ khởi hành tối đa N giờ" },
      { key: "pricing.child_percent", value: "70", description: "Giá vé trẻ em = % giá người lớn khi đợt không nhập giá riêng" },
    ],
  };

  const user = (role: Role, fullName: string, email: string, phone: string) =>
    insert<User>(db, "users", { role, fullName, email, password: "12345678", phone, active: true, createdAt: now - 60 * DAY });
  const hao = user("CUSTOMER", "Nguyễn Văn Hào", "customer@example.com", "0901234567");
  const mai = user("CUSTOMER", "Trần Thị Mai", "mai.tran@example.com", "0912345678");
  const hung = user("TOUR_GUIDE", "Trần Quốc Hưng", "guide@example.com", "0923456789");
  const tuan = user("TOUR_GUIDE", "Phạm Minh Tuấn", "tuan.guide@example.com", "0934567890");
  user("TOUR_MANAGER", "Nguyễn Thu Hà", "manager@example.com", "0945678901");
  user("ADMIN", "Lê Hoàng Long", "admin@example.com", "0956789012");

  const cat = (name: string) => insert<Category>(db, "categories", { name });
  const songNuoc = cat("Sông nước miền Tây");
  const vanHoa = cat("Văn hoá – Lịch sử");
  const sinhThai = cat("Sinh thái – Nghỉ dưỡng");
  const bienDao = cat("Biển đảo");

  const p: Record<string, Place> = {};
  for (const [name, description] of [
    ["Chợ nổi Cái Răng", "Chợ nổi lớn nhất Cần Thơ, họp từ 5 giờ sáng"],
    ["Lò hủ tiếu Sáu Hoài", "Xem làm hủ tiếu thủ công, thử bánh tráng"],
    ["Vườn trái cây Phong Điền", "Hái trái cây theo mùa tại vườn"],
    ["Bến Ninh Kiều", "Biểu tượng Cần Thơ bên sông Hậu"],
    ["Cồn Sơn", "Làng du lịch cộng đồng giữa sông Hậu, xem cá lóc bay"],
    ["Chợ nổi Ngã Bảy", "Chợ nổi Phụng Hiệp, Hậu Giang"],
    ["Khu bảo tồn Lung Ngọc Hoàng", "Rừng ngập nước, chim cò, trải nghiệm xuồng ba lá"],
    ["Làng nghề cá thát lát", "Đặc sản Hậu Giang"],
    ["Mũi Cà Mau", "Điểm cực Nam Tổ quốc"],
    ["Rừng U Minh Hạ", "Rừng tràm, gác kèo ong"],
    ["Chùa Dơi", "Chùa Khmer nổi tiếng Sóc Trăng"],
    ["Chùa Chén Kiểu", "Chùa ốp mảnh chén sứ độc đáo"],
    ["Nam đảo Phú Quốc", "Bãi Sao, cáp treo Hòn Thơm"],
    ["Rừng tràm Trà Sư", "Rừng tràm An Giang mùa nước nổi"],
    ["Nhà Công tử Bạc Liêu", "Dinh thự đầu thế kỷ XX"],
    ["Cánh đồng điện gió Bạc Liêu", "Điện gió ven biển"],
  ]) p[name] = insert<Place>(db, "places", { name, description });

  const tour = (code: string, title: string, dest: string, price: number, days: number, maxGuests: number, c: Category, img: string,
    desc: string, ...itinerary: Place[]) => {
    const t = insert<Tour>(db, "tours", {
      tourCode: code, title, description: desc, destination: dest, price, durationDays: days, maxGuests,
      coverImageUrl: `/images/tours/${img}.svg`, categoryId: c.id, status: "ACTIVE", createdAt: now - 30 * DAY, updatedAt: now - 30 * DAY,
    });
    itinerary.forEach((pl, i) => insert<Detail>(db, "details", { tourId: t.id, placeId: pl.id, displayOrder: i + 1 }));
    insert<Image>(db, "images", { tourId: t.id, imageUrl: `/images/tours/${img}.svg`, sortOrder: 0 });
    return t;
  };
  const caiRang = tour("MT-CR-01", "Chợ nổi Cái Răng – Vườn trái cây Phong Điền", "Cần Thơ", 650_000, 1, 25, songNuoc, "cai-rang",
    "Đi xuồng ra chợ nổi lúc bình minh, ăn hủ tiếu trên sông, ghé lò hủ tiếu và vườn trái cây Phong Điền.",
    p["Chợ nổi Cái Răng"], p["Lò hủ tiếu Sáu Hoài"], p["Vườn trái cây Phong Điền"], p["Bến Ninh Kiều"]);
  const conSon = tour("MT-CS-02", "Cồn Sơn – Làng du lịch cộng đồng", "Cần Thơ", 590_000, 1, 20, songNuoc, "con-son",
    "Một ngày sống cùng người dân cồn: xem cá lóc bay, làm bánh dân gian, đạp xe quanh cồn.", p["Bến Ninh Kiều"], p["Cồn Sơn"]);
  const hauGiang = tour("MT-HG-03", "Hậu Giang – Chợ nổi Ngã Bảy và Lung Ngọc Hoàng", "Hậu Giang", 1_650_000, 2, 20, sinhThai, "lung-ngoc-hoang",
    "Hai ngày một đêm khám phá Hậu Giang: chợ nổi Ngã Bảy, rừng ngập nước Lung Ngọc Hoàng, đặc sản cá thát lát.",
    p["Chợ nổi Ngã Bảy"], p["Khu bảo tồn Lung Ngọc Hoàng"], p["Làng nghề cá thát lát"]);
  const caMau = tour("MT-CM-04", "Cà Mau – Mũi Cà Mau và Rừng U Minh Hạ", "Cà Mau", 3_290_000, 3, 30, sinhThai, "mui-ca-mau",
    "Ba ngày chạm tới điểm cực Nam, đi xuồng xuyên rừng tràm U Minh Hạ, thưởng thức mật ong gác kèo.", p["Mũi Cà Mau"], p["Rừng U Minh Hạ"]);
  const socTrang = tour("VH-ST-05", "Sóc Trăng – Chùa Dơi và Chùa Chén Kiểu", "Sóc Trăng", 790_000, 1, 30, vanHoa, "soc-trang",
    "Tìm hiểu văn hoá Khmer Nam Bộ qua những ngôi chùa đặc sắc.", p["Chùa Dơi"], p["Chùa Chén Kiểu"]);
  const phuQuoc = tour("BD-PQ-06", "Phú Quốc – Nam đảo và cáp treo Hòn Thơm", "Kiên Giang", 4_590_000, 3, 30, bienDao, "phu-quoc",
    "Nghỉ dưỡng ba ngày ở đảo ngọc: Bãi Sao, cáp treo vượt biển dài nhất thế giới, lặn ngắm san hô.", p["Nam đảo Phú Quốc"]);
  const traSu = tour("ST-TS-07", "Trà Sư – Rừng tràm An Giang mùa nước nổi", "An Giang", 1_490_000, 2, 20, sinhThai, "tra-su",
    "Chèo xuồng dưới tán tràm xanh, ngắm chim trời, thưởng thức món ăn mùa nước nổi.", p["Rừng tràm Trà Sư"]);
  const bacLieu = tour("VH-BL-08", "Bạc Liêu – Nhà Công tử và Cánh đồng điện gió", "Bạc Liêu", 1_890_000, 2, 25, vanHoa, "bac-lieu",
    "Nghe chuyện Công tử Bạc Liêu, dạo cánh đồng điện gió ven biển.", p["Nhà Công tử Bạc Liêu"], p["Cánh đồng điện gió Bạc Liêu"]);
  bacLieu.status = "DRAFT"; // tour nháp để demo màn quản lý

  const dep = (t: Tour, start: number, capacity: number, guide?: User) =>
    insert<Departure>(db, "departures", {
      tourId: t.id, tourGuideId: guide?.id, capacity, bookedSeats: 0, adultPrice: t.price, childPrice: Math.floor((t.price * 70) / 100),
      startAt: start, endAt: start + t.durationDays * DAY - 6 * HOUR, status: "OPEN", createdAt: now - 20 * DAY, updatedAt: now - 20 * DAY,
    });

  for (const t of [caiRang, conSon, hauGiang, caMau, socTrang, phuQuoc, traSu]) for (const d of [10, 24, 38]) dep(t, vnMorning(now, d), 25);
  const hgNext = db.departures.find((d) => d.tourId === hauGiang.id)!;

  let seq = 0;
  const paidBooking = (u: User, d: Departure, adults: number, children: number, bookedAt: number, status: BookingStatus, completedAt?: number) => {
    const letter = String.fromCharCode(65 + seq++);
    const code = `BT-DEMO${letter}`;
    const b = insert<Booking>(db, "bookings", {
      bookingCode: code, userId: u.id, departureId: d.id, adultQuantity: adults, childQuantity: children, ticketQuantity: adults + children,
      totalPrice: d.adultPrice * adults + d.childPrice * children, status, bookedAt, completedAt,
    });
    const bill = insert<Bill>(db, "bills", { bookingId: b.id, billCode: `HD-DEMO${letter}`, amount: b.totalPrice, createdAt: bookedAt });
    insert<Payment>(db, "payments", {
      billId: bill.id, amount: bill.amount, provider: "MOCK", transactionCode: `SEED-${code}`, paymentMethod: "MOCK_CARD",
      status: "PAID", createdAt: bookedAt, paidAt: bookedAt + 3 * 60_000,
    });
    return b;
  };
  const confirmed = (u: User, d: Departure, a: number, c: number, at: number) => {
    d.bookedSeats += a + c;
    return paidBooking(u, d, a, c, at, "CONFIRMED");
  };

  // Đợt khởi hành trong 20 giờ tới — HDV Hưng bắt đầu được ngay để demo luồng HDV
  const soon = dep(caiRang, Math.floor((now + 20 * HOUR) / HOUR) * HOUR, 20, hung);
  confirmed(hao, soon, 2, 1, now - 2 * DAY);
  confirmed(mai, soon, 2, 0, now - 3 * DAY);
  // Đợt chỉ còn 1 chỗ — demo "hai người tranh chỗ cuối"
  const lastSeat = dep(conSon, vnMorning(now, 4), 4, tuan);
  confirmed(mai, lastSeat, 3, 0, now - DAY);
  // Khách Hào có đơn còn xa ngày đi → huỷ được hoàn 100%
  confirmed(hao, hgNext, 2, 0, now - DAY);

  // Chuyến đã đi — Hào chưa đánh giá (demo form đánh giá), Mai đã đánh giá
  const past = dep(caiRang, vnMorning(now, -12), 20, hung);
  const haoPast = paidBooking(hao, past, 2, 0, now - 20 * DAY, "COMPLETED", past.endAt);
  const maiPast = paidBooking(mai, past, 1, 0, now - 19 * DAY, "COMPLETED", past.endAt);
  past.status = "COMPLETED";
  past.bookedSeats = haoPast.ticketQuantity + maiPast.ticketQuantity;
  insert<Review>(db, "reviews", {
    userId: mai.id, tourId: caiRang.id, bookingId: maiPast.id, rating: 5, status: "VISIBLE", createdAt: now - 11 * DAY,
    content: "Chợ nổi lúc bình minh rất đẹp, anh Hưng hướng dẫn nhiệt tình, hủ tiếu trên ghe ngon.",
  });
  const pqPast = dep(phuQuoc, vnMorning(now, -30), 20, tuan);
  const maiPq = paidBooking(mai, pqPast, 2, 0, now - 45 * DAY, "COMPLETED", pqPast.endAt);
  pqPast.status = "COMPLETED";
  pqPast.bookedSeats = maiPq.ticketQuantity;
  insert<Review>(db, "reviews", {
    userId: mai.id, tourId: phuQuoc.id, bookingId: maiPq.id, rating: 4, status: "VISIBLE", createdAt: now - 26 * DAY,
    content: "Lịch trình hợp lý, khách sạn sạch. Cáp treo hơi đông vào buổi chiều.",
  });

  insert<Notification>(db, "notifications", {
    userId: hao.id, bookingId: haoPast.id, title: "Cảm ơn bạn đã đồng hành", read: false, createdAt: now - 12 * DAY,
    content: "Tour Chợ nổi Cái Răng đã kết thúc. Hãy để lại đánh giá cho chuyến đi nhé.",
  });
  return db;
}

// ------------------------------------------------------------------ lưu trữ

let memory: DB | null = null;

export function load(): DB {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed?.version === 1) return (memory = parsed);
    }
  } catch {
    /* localStorage bị chặn / dữ liệu hỏng → seed lại */
  }
  memory = seed();
  save(memory);
  return memory;
}

export function save(db: DB) {
  memory = db;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* chế độ riêng tư: chỉ giữ trong bộ nhớ */
  }
}

/** Tab khác ghi dữ liệu → đọc lại. */
export function invalidate() {
  memory = null;
}

export function reset() {
  memory = seed();
  save(memory);
}
