/**
 * API giả lập chạy trong trình duyệt — thay backend Spring Boot khi demo offline.
 * Hình dạng request/response theo docs/technical/api-contracts.md; nghiệp vụ bám các *Service.java.
 * Chặn window.fetch với URL bắt đầu bằng DEMO_API.
 */
import * as store from "./db";
import type { Booking, DB, Departure, Payment, Tour, User } from "./db";
import { imageUrl } from "./images";
import { fold } from "./fold";
import type { BookingStatus, DepartureStatus, PaymentStatus, Role, TourStatus } from "@/types/domain";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const STAFF: Role[] = ["TOUR_MANAGER", "ADMIN"];

// ------------------------------------------------------------------ lỗi & phản hồi

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public errors: { field: string; message: string }[] | null = null) {
    super(message);
  }
}
const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `Không tìm thấy ${what}`);
const rule = (msg: string) => new HttpError(422, "BUSINESS_RULE", msg);
const bad = (msg: string) => new HttpError(400, "BAD_REQUEST", msg);
const invalid = (field: string, message: string) => new HttpError(400, "VALIDATION_FAILED", "Dữ liệu không hợp lệ", [{ field, message }]);

const MACHINES: Record<string, Record<string, string[]>> = {
  "Đơn đặt tour": { PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"], CONFIRMED: ["COMPLETED", "CANCELLED"] },
  "Thanh toán": { PENDING: ["PAID", "FAILED", "CANCELLED"], PAID: ["REFUNDED"] },
  "Đợt khởi hành": { OPEN: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED"] },
};
function assertTransition(entity: keyof typeof MACHINES, from: string, to: string) {
  if (!(MACHINES[entity][from] ?? []).includes(to)) {
    throw new HttpError(409, "INVALID_TRANSITION", `${entity} không thể chuyển từ ${from} sang ${to}`);
  }
}

interface Ctx {
  db: DB;
  now: number;
  me: User | null;
  query: URLSearchParams;
  body: any;
  params: Record<string, string>;
}

// ------------------------------------------------------------------ tiện ích

const iso = (t?: number | null) => (t == null ? undefined : new Date(t).toISOString());
const vnd = (n: number) => `${n.toLocaleString("vi-VN").replace(/,/g, ".")} ₫`;
const setting = (db: DB, key: string, fallback: number) => {
  const v = Number.parseInt(db.settings.find((s) => s.key === key)?.value ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function refundPercent(db: DB, now: number, start: number) {
  const days = Math.floor((start - now) / DAY);
  if (days >= setting(db, "cancel.full_refund_days", 7)) return 100;
  if (days >= setting(db, "cancel.partial_refund_days", 3)) return setting(db, "cancel.partial_refund_percent", 50);
  return 0;
}
function randomCode(prefix: string, len: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = prefix;
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function page<T, R>(list: T[], q: URLSearchParams, map: (t: T) => R, defSize = 12) {
  const p = Math.max(0, Number.parseInt(q.get("page") ?? "0", 10) || 0);
  const rawSize = Number.parseInt(q.get("size") ?? "", 10);
  const size = !rawSize || rawSize < 1 ? defSize : Math.min(rawSize, 100);
  return {
    content: list.slice(p * size, p * size + size).map(map),
    page: p,
    size,
    totalElements: list.length,
    totalPages: Math.ceil(list.length / size),
  };
}
const byId = <T extends { id: number }>(list: T[], id: number | string | undefined) => list.find((x) => x.id === Number(id));
const must = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw notFound(what);
  return v;
};
const blank = (s?: string | null) => (s == null || String(s).trim() === "" ? undefined : String(s).trim());

function requireUser(c: Ctx, roles?: Role[]): User {
  if (!c.me) throw new HttpError(401, "UNAUTHORIZED", "Bạn cần đăng nhập để tiếp tục.");
  if (roles && !roles.includes(c.me.role)) throw new HttpError(403, "ACCESS_DENIED", "Bạn không có quyền thực hiện thao tác này.");
  return c.me;
}
const isStaff = (u: User | null) => !!u && STAFF.includes(u.role);

function audit(db: DB, now: number, userId: number | undefined, action: string, entityType: string, entityId?: number, detail?: string, result = "SUCCESS") {
  store.insert(db, "audit", { userId, action, entityType, entityId, detail, result, createdAt: now });
}
function notify(db: DB, now: number, userId: number, bookingId: number | undefined, title: string, content: string) {
  store.insert(db, "notifications", { userId, bookingId, title, content, read: false, createdAt: now });
}

// ------------------------------------------------------------------ mapper (≈ DtoMapper.java)

const userDto = (u: User) => ({
  id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, address: u.address, role: u.role, active: u.active, createdAt: iso(u.createdAt),
});

function departureDto(db: DB, d: Departure) {
  const t = byId(db.tours, d.tourId)!;
  const g = d.tourGuideId ? byId(db.users, d.tourGuideId) : undefined;
  return {
    id: d.id, tourId: d.tourId, tourTitle: t.title, startAt: iso(d.startAt), endAt: iso(d.endAt), capacity: d.capacity,
    bookedSeats: d.bookedSeats, availableSeats: d.capacity - d.bookedSeats, adultPrice: d.adultPrice, childPrice: d.childPrice,
    status: d.status, tourGuideId: g?.id, tourGuideName: g?.fullName, cancelReason: d.cancelReason,
  };
}

const isPublic = (t: Tour) => t.status === "ACTIVE";

const foldKeyword = (v: string | null) => {
  const kw = blank(v);
  return kw ? fold(kw) : undefined;
};
const openUpcoming = (db: DB, tourId: number, now: number) =>
  db.departures.filter((d) => d.tourId === tourId && d.status === "OPEN" && d.startAt > now).sort((a, b) => a.startAt - b.startAt);

/** range: đang lọc theo ngày → nextDepartureAt là đợt đầu tiên NẰM TRONG khoảng (≈ TourService.summarize). */
function tourSummary(db: DB, t: Tour, now: number, range?: { from?: number; to?: number }) {
  const ds = openUpcoming(db, t.id, now);
  const withSeats = ds.filter((d) => d.capacity - d.bookedSeats > 0);
  let next = withSeats[0]?.startAt;
  if (range && (range.from !== undefined || range.to !== undefined)) {
    const inRange = ds.filter((d) => (range.from === undefined || d.startAt >= range.from) && (range.to === undefined || d.startAt <= range.to));
    next = (inRange.find((d) => d.capacity - d.bookedSeats > 0) ?? inRange[0])?.startAt;
  }
  const rs = db.reviews.filter((r) => r.tourId === t.id && r.status === "VISIBLE");
  const cat = byId(db.categories, t.categoryId);
  return {
    id: t.id, tourCode: t.tourCode, title: t.title, destination: t.destination, durationDays: t.durationDays, price: t.price,
    fromPrice: withSeats.length ? Math.min(...withSeats.map((d) => d.adultPrice)) : t.price,
    coverImageUrl: imageUrl(t.coverImageUrl), categoryId: t.categoryId, categoryName: cat?.name ?? "—", status: t.status,
    nextDepartureAt: iso(next), openDepartureCount: ds.length,
    availableSeats: ds.reduce((s, d) => s + d.capacity - d.bookedSeats, 0),
    ratingAverage: rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : undefined,
    ratingCount: rs.length,
  };
}

function itineraryDto(db: DB, tourId: number) {
  return db.details
    .filter((d) => d.tourId === tourId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((d) => {
      const p = byId(db.places, d.placeId)!;
      return { id: d.id, placeId: p.id, placeName: p.name, placeDescription: p.description, displayOrder: d.displayOrder };
    });
}
const imagesDto = (db: DB, tourId: number) =>
  db.images
    .filter((i) => i.tourId === tourId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((i) => ({ id: i.id, imageUrl: imageUrl(i.imageUrl), sortOrder: i.sortOrder }));

function tourDetail(db: DB, t: Tour, now: number) {
  return {
    ...tourSummary(db, t, now), description: t.description, maxGuests: t.maxGuests, images: imagesDto(db, t.id),
    itinerary: itineraryDto(db, t.id), departures: openUpcoming(db, t.id, now).map((d) => departureDto(db, d)),
  };
}

const billOf = (db: DB, bookingId: number) => db.bills.find((b) => b.bookingId === bookingId);
const paymentsOf = (db: DB, bookingId: number) => {
  const bill = billOf(db, bookingId);
  return bill ? db.payments.filter((p) => p.billId === bill.id).sort((a, b) => a.createdAt - b.createdAt || a.id - b.id) : [];
};
const bookingOfPayment = (db: DB, p: Payment) => byId(db.bookings, byId(db.bills, p.billId)!.bookingId)!;

function paymentDto(db: DB, p: Payment) {
  const b = bookingOfPayment(db, p);
  return {
    id: p.id, bookingId: b.id, bookingCode: b.bookingCode, amount: p.amount, refundAmount: p.refundAmount, status: p.status, provider: p.provider,
    transactionCode: p.transactionCode, paymentMethod: p.paymentMethod, note: p.note, createdAt: iso(p.createdAt), paidAt: iso(p.paidAt),
    checkoutUrl: p.status === "PENDING" ? `/pay/mock/${p.id}` : undefined, customerName: byId(db.users, b.userId)?.fullName,
  };
}

const overdue = (b: Booking, now: number) => b.status === "PENDING" && b.expiresAt != null && b.expiresAt <= now;

function bookingDto(db: DB, b: Booking, now: number, withBill = true) {
  const ps = paymentsOf(db, b.id);
  const d = byId(db.departures, b.departureId)!;
  const t = byId(db.tours, d.tourId)!;
  const u = byId(db.users, b.userId)!;
  const beforeStart = d.startAt > now;
  const canCancel = beforeStart && (b.status === "PENDING" || b.status === "CONFIRMED");
  let refundPreview;
  if (canCancel && b.status === "CONFIRMED") {
    const paid = ps.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
    const percent = refundPercent(db, now, d.startAt);
    refundPreview = { percent, amount: Math.floor((paid * percent) / 100) };
  }
  const latest = [...ps].sort((a, b2) => b2.createdAt - a.createdAt || b2.id - a.id)[0];
  const bill = billOf(db, b.id);
  return {
    id: b.id, bookingCode: b.bookingCode, status: b.status, adultQuantity: b.adultQuantity, childQuantity: b.childQuantity,
    ticketQuantity: b.ticketQuantity, totalPrice: b.totalPrice, bookedAt: iso(b.bookedAt), expiresAt: iso(b.expiresAt),
    cancelledAt: iso(b.cancelledAt), cancelReason: b.cancelReason, departure: departureDto(db, d), tourId: t.id, tourTitle: t.title,
    tourCoverImageUrl: imageUrl(t.coverImageUrl), customer: { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone },
    paymentStatus: latest?.status,
    bill: withBill && bill
      ? { id: bill.id, billCode: bill.billCode, amount: bill.amount, createdAt: iso(bill.createdAt), payments: ps.map((p) => paymentDto(db, p)) }
      : undefined,
    canPay: b.status === "PENDING" && !overdue(b, now),
    canCancel,
    canReview: b.status === "COMPLETED" && !db.reviews.some((r) => r.bookingId === b.id),
    refundPreview,
  };
}

function reviewDto(db: DB, r: DB["reviews"][number]) {
  return {
    id: r.id, bookingId: r.bookingId, tourId: r.tourId, userId: r.userId, userName: byId(db.users, r.userId)?.fullName ?? "Khách",
    rating: r.rating, content: r.content, status: r.status, createdAt: iso(r.createdAt),
  };
}

// ------------------------------------------------------------------ vòng đời booking (≈ BookingLifecycle.java)

function settlePayments(db: DB, b: Booking, percent: number, reason: string) {
  let refunded = 0;
  for (const p of paymentsOf(db, b.id)) {
    if (p.status === "PENDING") {
      p.status = "CANCELLED";
      p.note = reason;
    } else if (p.status === "PAID" && percent > 0) {
      const amount = Math.floor((p.amount * percent) / 100);
      p.status = "REFUNDED";
      p.refundAmount = amount;
      p.note = `${reason} — hoàn ${percent}%`;
      refunded += amount;
    }
  }
  return refunded;
}

function releaseSeats(db: DB, b: Booking) {
  const d = byId(db.departures, b.departureId)!;
  d.bookedSeats = Math.max(0, d.bookedSeats - b.ticketQuantity);
}

function cancelBooking(db: DB, b: Booking, reason: string, percent: number, now: number) {
  const wasConfirmed = b.status === "CONFIRMED";
  assertTransition("Đơn đặt tour", b.status, "CANCELLED");
  b.status = "CANCELLED";
  b.cancelledAt = now;
  b.cancelReason = reason;
  b.expiresAt = undefined;
  releaseSeats(db, b);
  const refunded = settlePayments(db, b, percent, reason);
  const money = !wasConfirmed ? "" : refunded > 0 ? ` Số tiền hoàn: ${vnd(refunded)}.` : " Đơn không đủ điều kiện hoàn tiền theo chính sách.";
  notify(db, now, b.userId, b.id, `Đơn ${b.bookingCode} đã huỷ`, `Lý do: ${reason}.${money}`);
  return refunded;
}

function expireBooking(db: DB, b: Booking, now: number) {
  assertTransition("Đơn đặt tour", b.status, "EXPIRED");
  b.status = "EXPIRED";
  b.cancelledAt = now;
  b.cancelReason = "Quá hạn thanh toán";
  releaseSeats(db, b);
  settlePayments(db, b, 100, "Quá hạn thanh toán");
  notify(db, now, b.userId, b.id, `Đơn ${b.bookingCode} đã hết hạn`, "Đơn chưa được thanh toán trong thời gian giữ chỗ nên hệ thống đã huỷ và nhả chỗ.");
}

/** ≈ BookingExpiryJob: backend chạy 30 giây/lần; ở đây chạy trước mỗi request. */
function runExpiry(db: DB, now: number): number {
  let n = 0;
  for (const b of db.bookings) {
    if (overdue(b, now)) {
      expireBooking(db, b, now);
      audit(db, now, undefined, "EXPIRE", "booking", b.id, b.bookingCode);
      n++;
    }
  }
  return n;
}

/** ≈ PaymentService.apply — đường webhook đã xác minh chữ ký. */
function applyGatewayEvent(db: DB, now: number, p: Payment, success: boolean) {
  const tx = randomCode("MOCK-", 10);
  const b = bookingOfPayment(db, p);
  if (p.status !== "PENDING") return;
  if (!success) {
    assertTransition("Thanh toán", p.status, "FAILED");
    p.status = "FAILED";
    p.transactionCode = tx;
    p.note = "Cổng thanh toán báo thất bại";
    notify(db, now, b.userId, b.id, "Thanh toán chưa thành công",
      `Giao dịch cho đơn ${b.bookingCode} thất bại. Bạn có thể thanh toán lại trước khi hết hạn giữ chỗ.`);
    audit(db, now, undefined, "PAYMENT_FAILED", "payment", p.id, tx);
    return;
  }
  assertTransition("Thanh toán", p.status, "PAID");
  p.status = "PAID";
  p.transactionCode = tx;
  p.paymentMethod = "MOCK_CARD";
  p.paidAt = now;
  if (b.status === "PENDING") {
    b.status = "CONFIRMED";
    b.expiresAt = undefined;
    notify(db, now, b.userId, b.id, `Đặt tour thành công ${b.bookingCode}`, `Đã nhận ${vnd(p.amount)}. Hẹn gặp bạn ngày khởi hành!`);
    audit(db, now, undefined, "PAYMENT_PAID", "payment", p.id, tx);
  } else {
    p.status = "REFUNDED";
    p.refundAmount = p.amount;
    p.note = `Nhận tiền khi đơn đã ${b.status} — hoàn tự động`;
    notify(db, now, b.userId, b.id, `Đơn ${b.bookingCode} đã hết hiệu lực`, "Hệ thống nhận được tiền sau khi đơn hết hạn nên đã hoàn lại toàn bộ.");
    audit(db, now, undefined, "PAYMENT_LATE_REFUND", "payment", p.id, tx);
  }
}

// ------------------------------------------------------------------ xác thực

function issueTokens(db: DB, u: User, family = randomCode("F", 12)) {
  const refreshToken = `demo-rt.${randomCode("", 32)}`;
  db.tokens.push({ token: refreshToken, userId: u.id, family, revoked: false });
  if (db.tokens.length > 200) db.tokens.splice(0, db.tokens.length - 200);
  return { accessToken: `demo-at.${u.id}.${randomCode("", 16)}`, refreshToken, expiresIn: 86_400, user: userDto(u) };
}

function userFromAuth(db: DB, header: string | null): User | null {
  const m = /^Bearer demo-at\.(\d+)\./.exec(header ?? "");
  if (!m) return null;
  const u = byId(db.users, m[1]);
  if (!u) return null;
  if (!u.active) throw new HttpError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khoá");
  return u;
}

// ------------------------------------------------------------------ bảng route

type Handler = (c: Ctx) => unknown;
type Method = "GET" | "POST" | "PUT" | "DELETE";
const routes: { method: Method; re: RegExp; keys: string[]; handler: Handler; status?: number; message?: string }[] = [];
function on(method: Method, pattern: string, handler: Handler, opts: { status?: number; message?: string } = {}) {
  const keys: string[] = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
  routes.push({ method, re, keys, handler, ...opts });
}

// ---- 4.1 Xác thực
on("POST", "/auth/register", ({ db, now, body }) => {
  const fullName = blank(body.fullName);
  const email = blank(body.email)?.toLowerCase();
  if (!fullName) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("email", "Email không hợp lệ");
  if (!body.password || String(body.password).length < 8) throw invalid("password", "Mật khẩu tối thiểu 8 ký tự");
  if (body.password !== body.confirmPassword) throw bad("Mật khẩu xác nhận không khớp");
  if (db.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, "EMAIL_EXISTS", "Email này đã được đăng ký");
  const u = store.insert<User>(db, "users", { role: "CUSTOMER", fullName, email, password: body.password, phone: blank(body.phone), active: true, createdAt: now });
  audit(db, now, u.id, "REGISTER", "user", u.id);
  return userDto(u);
}, { status: 201, message: "Đăng ký thành công" });

on("POST", "/auth/login", ({ db, now, body }) => {
  const email = String(body.email ?? "").trim().toLowerCase();
  const u = db.users.find((x) => x.email.toLowerCase() === email);
  if (!u || u.password !== body.password) {
    audit(db, now, u?.id, "LOGIN", "user", u?.id, `email=${email}`, "FAILURE");
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
  }
  if (!u.active) throw new HttpError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên");
  audit(db, now, u.id, "LOGIN", "user", u.id);
  return issueTokens(db, u);
});

on("POST", "/auth/refresh", ({ db, body }) => {
  const t = db.tokens.find((x) => x.token === body.refreshToken);
  if (!t) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ");
  if (t.revoked) {
    db.tokens.filter((x) => x.family === t.family).forEach((x) => (x.revoked = true));
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại");
  }
  const u = byId(db.users, t.userId)!;
  if (!u.active) throw new HttpError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khoá");
  t.revoked = true;
  return issueTokens(db, u, t.family);
});

on("POST", "/auth/logout", ({ db, body }) => {
  const t = db.tokens.find((x) => x.token === body.refreshToken);
  if (t) db.tokens.filter((x) => x.family === t.family).forEach((x) => (x.revoked = true));
  return null;
});

on("GET", "/users/me", (c) => userDto(requireUser(c)));
on("PUT", "/users/me", (c) => {
  const u = requireUser(c);
  const fullName = blank(c.body.fullName);
  if (!fullName) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (c.body.phone && !/^0\d{9,10}$/.test(String(c.body.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  u.fullName = fullName;
  u.phone = blank(c.body.phone);
  u.address = blank(c.body.address);
  return userDto(u);
}, { message: "Đã cập nhật hồ sơ" });

// ---- 4.2 Tour
on("GET", "/tours", ({ db, now, query }) => {
  const kw = foldKeyword(query.get("keyword"));
  const categoryId = Number(query.get("categoryId")) || undefined;
  const minPrice = query.get("minPrice") ? Number(query.get("minPrice")) : undefined;
  const maxPrice = query.get("maxPrice") ? Number(query.get("maxPrice")) : undefined;
  const dayStart = (v: string | null, end: boolean) => {
    if (!v) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-").map(Number);
      const start = Date.UTC(y, m - 1, d) - 7 * HOUR; // 00:00 giờ VN
      return end ? start + DAY - 1 : start;
    }
    const t = Date.parse(v);
    if (Number.isNaN(t)) throw bad("Ngày không đúng định dạng YYYY-MM-DD");
    return t;
  };
  const from = dayStart(query.get("departFrom"), false);
  const to = dayStart(query.get("departTo"), true);
  let list = db.tours.filter((t) => {
    if (!isPublic(t)) return false;
    if (kw && ![t.title, t.destination, t.tourCode].some((s) => fold(s).includes(kw))) return false;
    if (categoryId && t.categoryId !== categoryId) return false;
    if (minPrice !== undefined && t.price < minPrice) return false;
    if (maxPrice !== undefined && t.price > maxPrice) return false;
    if (from !== undefined || to !== undefined) {
      const ok = openUpcoming(db, t.id, now).some((d) => (from === undefined || d.startAt >= from) && (to === undefined || d.startAt <= to));
      if (!ok) return false;
    }
    return true;
  });
  const sort = query.get("sort") ?? "nextDeparture";
  const sums = new Map(list.map((t) => [t.id, tourSummary(db, t, now, { from, to })]));
  if (sort === "price,asc") list = list.sort((a, b) => a.price - b.price || a.id - b.id);
  else if (sort === "price,desc") list = list.sort((a, b) => b.price - a.price || a.id - b.id);
  else if (sort === "nextDeparture") {
    const next = (t: Tour) => (sums.get(t.id)!.nextDepartureAt ? Date.parse(sums.get(t.id)!.nextDepartureAt!) : Infinity);
    list = list.sort((a, b) => next(a) - next(b) || a.id - b.id);
  } else list = list.sort((a, b) => b.createdAt - a.createdAt || a.id - b.id);
  return page(list, query, (t) => sums.get(t.id)!);
});

on("GET", "/tours/:id", ({ db, now, me, params }) => {
  const t = byId(db.tours, params.id);
  if (!t || (!isPublic(t) && !isStaff(me))) throw notFound("tour");
  return tourDetail(db, t, now);
});

on("GET", "/manager/tours", (c) => {
  requireUser(c, STAFF);
  const kw = foldKeyword(c.query.get("keyword"));
  const status = blank(c.query.get("status")) as TourStatus | undefined;
  const list = c.db.tours
    .filter((t) => (!status || t.status === status) && (!kw || fold(t.title).includes(kw) || fold(t.tourCode).includes(kw)))
    .sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id);
  return page(list, c.query, (t) => tourSummary(c.db, t, c.now));
});

function applyTour(c: Ctx, t: Tour | null): Tour {
  const b = c.body;
  const code = String(b.tourCode ?? "").trim().toUpperCase();
  if (!code) throw invalid("tourCode", "Vui lòng nhập mã tour");
  if (!/^[A-Za-z0-9-]+$/.test(code)) throw invalid("tourCode", "Mã tour chỉ gồm chữ, số và dấu gạch");
  if (!blank(b.title)) throw invalid("title", "Vui lòng nhập tên tour");
  if (!blank(b.description)) throw invalid("description", "Vui lòng nhập mô tả");
  if (!blank(b.destination)) throw invalid("destination", "Vui lòng nhập điểm đến");
  if (!(Number(b.durationDays) >= 1)) throw invalid("durationDays", "Số ngày tối thiểu là 1");
  if (!(Number(b.maxGuests) >= 1)) throw invalid("maxGuests", "Số khách tối đa phải lớn hơn 0");
  if (!(Number(b.price) >= 0)) throw invalid("price", "Giá không được âm");
  must(byId(c.db.categories, b.categoryId), "danh mục");
  if (c.db.tours.some((x) => x.tourCode.toUpperCase() === code && x.id !== t?.id)) throw new HttpError(409, "DUPLICATE_CODE", "Mã tour đã tồn tại");
  const values = {
    tourCode: code, title: String(b.title).trim(), description: String(b.description).trim(), destination: String(b.destination).trim(),
    durationDays: Number(b.durationDays), maxGuests: Number(b.maxGuests), price: Number(b.price), categoryId: Number(b.categoryId),
    coverImageUrl: blank(b.coverImageUrl), status: (b.status ?? "DRAFT") as TourStatus, updatedAt: c.now,
  };
  if (t) return Object.assign(t, values);
  return store.insert<Tour>(c.db, "tours", { ...values, createdAt: c.now });
}

on("POST", "/tours", (c) => {
  const me = requireUser(c, STAFF);
  const t = applyTour(c, null);
  audit(c.db, c.now, me.id, "CREATE", "tour", t.id, t.tourCode);
  return tourDetail(c.db, t, c.now);
}, { status: 201, message: "Đã tạo tour" });

on("PUT", "/tours/:id", (c) => {
  const me = requireUser(c, STAFF);
  const t = applyTour(c, must(byId(c.db.tours, c.params.id), "tour"));
  audit(c.db, c.now, me.id, "UPDATE", "tour", t.id, `status=${t.status}`);
  return tourDetail(c.db, t, c.now);
}, { message: "Đã lưu tour" });

on("DELETE", "/tours/:id", (c) => {
  const me = requireUser(c, STAFF);
  const t = must(byId(c.db.tours, c.params.id), "tour");
  if (!c.db.departures.some((d) => d.tourId === t.id)) {
    c.db.tours = c.db.tours.filter((x) => x.id !== t.id);
    c.db.details = c.db.details.filter((x) => x.tourId !== t.id);
    c.db.images = c.db.images.filter((x) => x.tourId !== t.id);
    audit(c.db, c.now, me.id, "DELETE", "tour", t.id, t.tourCode);
    return { deleted: true };
  }
  t.status = "INACTIVE";
  t.updatedAt = c.now;
  audit(c.db, c.now, me.id, "DEACTIVATE", "tour", t.id, "đã có đợt khởi hành nên chuyển INACTIVE");
  return { deleted: false, status: "INACTIVE" };
});

on("GET", "/tours/:id/itinerary", ({ db, params }) => itineraryDto(db, Number(params.id)));
on("PUT", "/tours/:id/itinerary", (c) => {
  const me = requireUser(c, STAFF);
  const t = must(byId(c.db.tours, c.params.id), "tour");
  const items: { placeId: number; displayOrder: number }[] = c.body.items ?? [];
  if (new Set(items.map((i) => i.displayOrder)).size !== items.length) throw bad("Thứ tự trong lịch trình bị trùng");
  items.forEach((i) => must(byId(c.db.places, i.placeId), `địa điểm #${i.placeId}`));
  c.db.details = c.db.details.filter((d) => d.tourId !== t.id);
  items.forEach((i) => store.insert(c.db, "details", { tourId: t.id, placeId: Number(i.placeId), displayOrder: i.displayOrder }));
  audit(c.db, c.now, me.id, "UPDATE_ITINERARY", "tour", t.id, `${items.length} điểm`);
  return itineraryDto(c.db, t.id);
}, { message: "Đã lưu lịch trình" });

on("GET", "/tours/:id/images", ({ db, params }) => imagesDto(db, Number(params.id)));
on("POST", "/tours/:id/images", (c) => {
  requireUser(c, STAFF);
  const t = must(byId(c.db.tours, c.params.id), "tour");
  const url = blank(c.body.imageUrl);
  if (!url) throw invalid("imageUrl", "Vui lòng nhập đường dẫn ảnh");
  const img = store.insert<DB["images"][number]>(c.db, "images", {
    tourId: t.id, imageUrl: url, sortOrder: c.db.images.filter((i) => i.tourId === t.id).length,
  });
  return { id: img.id, imageUrl: imageUrl(img.imageUrl), sortOrder: img.sortOrder };
}, { status: 201, message: "Đã thêm ảnh" });
on("DELETE", "/tours/:id/images/:imageId", (c) => {
  requireUser(c, STAFF);
  const img = c.db.images.find((i) => i.id === Number(c.params.imageId) && i.tourId === Number(c.params.id));
  if (!img) throw notFound("ảnh");
  c.db.images = c.db.images.filter((i) => i !== img);
  return null;
}, { message: "Đã xoá ảnh" });

on("GET", "/tours/:id/reviews", ({ db, params, query }) =>
  page(
    db.reviews.filter((r) => r.tourId === Number(params.id) && r.status === "VISIBLE").sort((a, b) => b.createdAt - a.createdAt),
    query, (r) => reviewDto(db, r), 5,
  ));

// Danh mục & địa điểm
on("GET", "/categories", ({ db }) => [...db.categories].sort((a, b) => a.name.localeCompare(b.name, "vi")).map((c) => ({ id: c.id, name: c.name })));
on("POST", "/categories", (c) => {
  requireUser(c, STAFF);
  const name = blank(c.body.name);
  if (!name) throw invalid("name", "Vui lòng nhập tên danh mục");
  if (c.db.categories.some((x) => x.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, "CONFLICT", "Danh mục đã tồn tại");
  return store.insert(c.db, "categories", { name });
}, { status: 201, message: "Đã tạo danh mục" });
on("PUT", "/categories/:id", (c) => {
  requireUser(c, STAFF);
  const cat = must(byId(c.db.categories, c.params.id), "danh mục");
  const name = blank(c.body.name);
  if (!name) throw invalid("name", "Vui lòng nhập tên danh mục");
  if (c.db.categories.some((x) => x.id !== cat.id && x.name.toLowerCase() === name.toLowerCase())) throw new HttpError(409, "CONFLICT", "Danh mục đã tồn tại");
  cat.name = name;
  return cat;
});
on("DELETE", "/categories/:id", (c) => {
  requireUser(c, STAFF);
  if (c.db.tours.some((t) => t.categoryId === Number(c.params.id))) throw new HttpError(409, "CONFLICT", "Danh mục còn tour nên không xoá được");
  c.db.categories = c.db.categories.filter((x) => x.id !== Number(c.params.id));
  return null;
});
on("GET", "/places", ({ db }) => [...db.places].sort((a, b) => a.name.localeCompare(b.name, "vi")));
on("POST", "/places", (c) => {
  requireUser(c, STAFF);
  const name = blank(c.body.name);
  if (!name) throw invalid("name", "Vui lòng nhập tên địa điểm");
  return store.insert(c.db, "places", { name, description: blank(c.body.description) });
}, { status: 201, message: "Đã tạo địa điểm" });
on("PUT", "/places/:id", (c) => {
  requireUser(c, STAFF);
  const p = must(byId(c.db.places, c.params.id), "địa điểm");
  const name = blank(c.body.name);
  if (!name) throw invalid("name", "Vui lòng nhập tên địa điểm");
  p.name = name;
  p.description = blank(c.body.description);
  return p;
});
on("DELETE", "/places/:id", (c) => {
  requireUser(c, STAFF);
  if (c.db.details.some((d) => d.placeId === Number(c.params.id))) throw new HttpError(409, "CONFLICT", "Địa điểm đang nằm trong lịch trình tour");
  c.db.places = c.db.places.filter((x) => x.id !== Number(c.params.id));
  return null;
});

// ---- 4.3 Đợt khởi hành
on("GET", "/tours/:id/departures", (c) => {
  const all = c.query.get("all") === "true";
  if (all) requireUser(c, STAFF);
  const list = all
    ? c.db.departures.filter((d) => d.tourId === Number(c.params.id)).sort((a, b) => a.startAt - b.startAt)
    : openUpcoming(c.db, Number(c.params.id), c.now);
  return list.map((d) => departureDto(c.db, d));
});
on("GET", "/departures/:id", ({ db, params }) => departureDto(db, must(byId(db.departures, params.id), "đợt khởi hành")));

function applyDeparture(c: Ctx, tour: Tour, d: Departure | null): Departure {
  const b = c.body;
  const startAt = Date.parse(b.startAt);
  const endAt = Date.parse(b.endAt);
  const capacity = Number(b.capacity);
  if (Number.isNaN(startAt)) throw invalid("startAt", "Vui lòng chọn ngày khởi hành");
  if (Number.isNaN(endAt)) throw invalid("endAt", "Vui lòng chọn ngày kết thúc");
  if (!(capacity >= 1)) throw invalid("capacity", "Sức chứa phải lớn hơn 0");
  if (capacity > tour.maxGuests) throw rule(`Sức chứa vượt số khách tối đa của tour (${tour.maxGuests})`);
  const adult = b.adultPrice != null && b.adultPrice !== "" ? Number(b.adultPrice) : tour.price;
  const child = b.childPrice != null && b.childPrice !== "" ? Number(b.childPrice) : Math.floor((adult * setting(c.db, "pricing.child_percent", 70)) / 100);
  let guideId: number | undefined;
  if (b.tourGuideId) {
    const g = byId(c.db.users, b.tourGuideId);
    if (!g || g.role !== "TOUR_GUIDE") throw rule("Người được phân công không phải hướng dẫn viên");
    const clash = c.db.departures.some((x) => x.tourGuideId === g.id && x.id !== d?.id && (x.status === "OPEN" || x.status === "IN_PROGRESS")
      && x.startAt < endAt && startAt < x.endAt);
    if (clash) throw new HttpError(409, "CONFLICT", `Hướng dẫn viên ${g.fullName} đã có lịch trùng thời gian`);
    guideId = g.id;
  }
  if (endAt <= startAt) throw rule("Thời gian kết thúc phải sau thời gian khởi hành");
  if (d) {
    if (capacity < d.bookedSeats) throw rule(`Sức chứa không được nhỏ hơn số chỗ đã đặt (${d.bookedSeats})`);
    if (d.bookedSeats > 0 && d.startAt !== startAt) throw rule("Đợt đã có khách đặt nên không thể đổi ngày khởi hành (SRS UC-TDM-02 A3)");
    if (d.status !== "OPEN") throw rule("Chỉ sửa được đợt đang mở bán");
    return Object.assign(d, { startAt, endAt, capacity, adultPrice: adult, childPrice: child, tourGuideId: guideId, updatedAt: c.now });
  }
  if (startAt <= c.now) throw rule("Ngày khởi hành phải ở tương lai");
  return store.insert<Departure>(c.db, "departures", {
    tourId: tour.id, tourGuideId: guideId, capacity, bookedSeats: 0, adultPrice: adult, childPrice: child, startAt, endAt, status: "OPEN",
    createdAt: c.now, updatedAt: c.now,
  });
}
on("POST", "/tours/:id/departures", (c) => {
  const me = requireUser(c, STAFF);
  const d = applyDeparture(c, must(byId(c.db.tours, c.params.id), "tour"), null);
  audit(c.db, c.now, me.id, "CREATE", "departure", d.id, iso(d.startAt));
  return departureDto(c.db, d);
}, { status: 201, message: "Đã tạo đợt khởi hành" });
on("PUT", "/departures/:id", (c) => {
  const me = requireUser(c, STAFF);
  const d = must(byId(c.db.departures, c.params.id), "đợt khởi hành");
  applyDeparture(c, byId(c.db.tours, d.tourId)!, d);
  audit(c.db, c.now, me.id, "UPDATE", "departure", d.id, `guide=${d.tourGuideId ?? "-"}, capacity=${d.capacity}`);
  return departureDto(c.db, d);
}, { message: "Đã lưu đợt khởi hành" });
on("PUT", "/departures/:id/cancel", (c) => {
  const me = requireUser(c, STAFF);
  const d = must(byId(c.db.departures, c.params.id), "đợt khởi hành");
  const reason = blank(c.body.reason);
  if (!reason) throw invalid("reason", "Vui lòng nhập lý do huỷ");
  assertTransition("Đợt khởi hành", d.status, "CANCELLED");
  d.status = "CANCELLED";
  d.cancelReason = reason;
  d.updatedAt = c.now;
  const affected = c.db.bookings.filter((b) => b.departureId === d.id && (b.status === "PENDING" || b.status === "CONFIRMED"));
  affected.forEach((b) => cancelBooking(c.db, b, `Đợt khởi hành bị huỷ: ${reason}`, 100, c.now));
  audit(c.db, c.now, me.id, "CANCEL", "departure", d.id, `${reason} — huỷ ${affected.length} booking`);
  return departureDto(c.db, d);
}, { message: "Đã huỷ đợt khởi hành" });
on("GET", "/guides", (c) => {
  requireUser(c, STAFF);
  return c.db.users.filter((u) => u.role === "TOUR_GUIDE").sort((a, b) => a.fullName.localeCompare(b.fullName, "vi")).map(userDto);
});

// ---- 4.4 Đặt tour
on("POST", "/bookings", (c) => {
  const me = requireUser(c, ["CUSTOMER"]);
  const adults = Number(c.body.adultQuantity);
  const children = Number(c.body.childQuantity ?? 0);
  const tickets = adults + children;
  if (!(adults >= 1)) throw bad("Cần ít nhất 1 vé người lớn");
  if (children < 0 || tickets > 20) throw bad("Mỗi đơn đặt tối đa 20 vé");
  const d = must(byId(c.db.departures, c.body.departureId), "đợt khởi hành");
  const t = byId(c.db.tours, d.tourId)!;
  if (!(d.status === "OPEN" && d.startAt > c.now && isPublic(t))) throw rule("Đợt khởi hành này không còn nhận đặt chỗ");
  const avail = d.capacity - d.bookedSeats;
  if (tickets > avail) throw new HttpError(409, "DEPARTURE_FULL", avail === 0 ? "Đợt khởi hành đã hết chỗ" : `Chỉ còn ${avail} chỗ cho đợt này`);
  d.bookedSeats += tickets;
  let code: string;
  do code = randomCode("BT-", 6);
  while (c.db.bookings.some((b) => b.bookingCode === code));
  const b = store.insert<Booking>(c.db, "bookings", {
    bookingCode: code, userId: me.id, departureId: d.id, adultQuantity: adults, childQuantity: children, ticketQuantity: tickets,
    totalPrice: d.adultPrice * adults + d.childPrice * children, status: "PENDING", bookedAt: c.now,
    expiresAt: c.now + setting(c.db, "booking.payment_timeout_minutes", 15) * 60_000,
  });
  store.insert(c.db, "bills", { bookingId: b.id, billCode: `HD-${code.slice(3)}`, amount: b.totalPrice, createdAt: c.now });
  notify(c.db, c.now, me.id, b.id, `Đã giữ chỗ ${code}`, `Vui lòng thanh toán ${vnd(b.totalPrice)} trước khi hết hạn giữ chỗ.`);
  audit(c.db, c.now, me.id, "CREATE", "booking", b.id, `${code} x${tickets}`);
  return bookingDto(c.db, b, c.now);
}, { status: 201, message: "Đã giữ chỗ" });

on("GET", "/users/me/bookings", (c) => {
  const me = requireUser(c);
  const status = blank(c.query.get("status")) as BookingStatus | undefined;
  const list = c.db.bookings.filter((b) => b.userId === me.id && (!status || b.status === status)).sort((a, b) => b.bookedAt - a.bookedAt);
  return page(list, c.query, (b) => bookingDto(c.db, b, c.now, false));
});

function viewableBooking(c: Ctx): Booking {
  const me = requireUser(c);
  const b = byId(c.db.bookings, c.params.id);
  if (!b || (!isStaff(me) && b.userId !== me.id)) throw notFound("đơn đặt tour");
  return b;
}
on("GET", "/bookings/:id", (c) => bookingDto(c.db, viewableBooking(c), c.now));
on("GET", "/bookings/:id/bill", (c) => bookingDto(c.db, viewableBooking(c), c.now).bill ?? null);

on("POST", "/bookings/:id/cancel", (c) => {
  const me = requireUser(c);
  const b = byId(c.db.bookings, c.params.id);
  if (!b || b.userId !== me.id) throw notFound("đơn đặt tour");
  const d = byId(c.db.departures, b.departureId)!;
  if (d.startAt <= c.now) throw rule("Tour đã khởi hành nên không thể huỷ");
  const percent = b.status === "CONFIRMED" ? refundPercent(c.db, c.now, d.startAt) : 0;
  const refunded = cancelBooking(c.db, b, blank(c.body.reason) ?? "Khách huỷ", percent, c.now);
  audit(c.db, c.now, me.id, "CANCEL", "booking", b.id, `hoàn ${percent}% = ${refunded}`);
  return bookingDto(c.db, b, c.now);
}, { message: "Đã huỷ đơn" });

on("GET", "/admin/bookings", (c) => {
  requireUser(c, STAFF);
  const status = blank(c.query.get("status")) as BookingStatus | undefined;
  const departureId = Number(c.query.get("departureId")) || undefined;
  const kw = foldKeyword(c.query.get("keyword"));
  const list = c.db.bookings
    .filter((b) => {
      if (status && b.status !== status) return false;
      if (departureId && b.departureId !== departureId) return false;
      if (kw) {
        const u = byId(c.db.users, b.userId)!;
        if (![b.bookingCode, u.fullName, u.email].some((s) => fold(s).includes(kw))) return false;
      }
      return true;
    })
    .sort((a, b) => b.bookedAt - a.bookedAt);
  return page(list, c.query, (b) => bookingDto(c.db, b, c.now, false));
});
on("PUT", "/admin/bookings/:id/status", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const b = must(byId(c.db.bookings, c.params.id), "đơn đặt tour");
  if (c.body.status !== "CANCELLED") throw rule("Chỉ hỗ trợ huỷ đơn");
  const reason = blank(c.body.reason);
  if (!reason) throw invalid("reason", "Vui lòng nhập lý do");
  const refunded = cancelBooking(c.db, b, reason, 100, c.now);
  audit(c.db, c.now, me.id, "ADMIN_CANCEL", "booking", b.id, `${reason} — hoàn ${refunded}`);
  return bookingDto(c.db, b, c.now);
}, { message: "Đã huỷ đơn" });

// ---- 4.5 Thanh toán
on("POST", "/bookings/:id/payment", (c) => {
  const me = requireUser(c);
  const b = byId(c.db.bookings, c.params.id);
  if (!b || b.userId !== me.id) throw notFound("đơn đặt tour");
  if (b.status !== "PENDING") throw rule("Đơn này không ở trạng thái chờ thanh toán");
  if (overdue(b, c.now)) throw rule("Đơn đã quá hạn thanh toán, vui lòng đặt lại");
  const bill = billOf(c.db, b.id)!;
  const p = paymentsOf(c.db, b.id).find((x) => x.status === "PENDING")
    ?? store.insert<Payment>(c.db, "payments", { billId: bill.id, amount: bill.amount, provider: "MOCK", status: "PENDING", createdAt: c.now });
  audit(c.db, c.now, me.id, "INITIATE", "payment", p.id, b.bookingCode);
  return paymentDto(c.db, p);
});
function viewablePayment(c: Ctx): Payment {
  const me = requireUser(c);
  const p = byId(c.db.payments, c.params.id);
  if (!p || (!isStaff(me) && bookingOfPayment(c.db, p).userId !== me.id)) throw notFound("thanh toán");
  return p;
}
on("GET", "/payments/:id", (c) => paymentDto(c.db, viewablePayment(c)));
on("POST", "/payments/mock/:id/complete", (c) => {
  const me = requireUser(c);
  const p = byId(c.db.payments, c.params.id);
  if (!p || bookingOfPayment(c.db, p).userId !== me.id) throw notFound("thanh toán");
  applyGatewayEvent(c.db, c.now, p, c.body.result === "SUCCESS");
  return paymentDto(c.db, p);
});
on("GET", "/admin/payments", (c) => {
  requireUser(c, ["ADMIN"]);
  const status = blank(c.query.get("status")) as PaymentStatus | undefined;
  const list = c.db.payments.filter((p) => !status || p.status === status).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return page(list, c.query, (p) => paymentDto(c.db, p));
});
on("POST", "/payments/:id/verify", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const p = must(byId(c.db.payments, c.params.id), "thanh toán");
  const b = bookingOfPayment(c.db, p);
  if (b.status !== "PENDING") throw rule("Đơn không còn chờ thanh toán nên không xác minh được");
  assertTransition("Thanh toán", p.status, "PAID");
  Object.assign(p, { status: "PAID", transactionCode: `MANUAL-${p.id}-${Math.floor(c.now / 1000)}`, paymentMethod: "MANUAL", paidAt: c.now });
  b.status = "CONFIRMED";
  b.expiresAt = undefined;
  notify(c.db, c.now, b.userId, b.id, `Đặt tour thành công ${b.bookingCode}`, "Quản trị viên đã xác nhận thanh toán.");
  audit(c.db, c.now, me.id, "VERIFY", "payment", p.id);
  return paymentDto(c.db, p);
}, { message: "Đã xác minh thanh toán" });
on("POST", "/payments/:id/refund", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const p = must(byId(c.db.payments, c.params.id), "thanh toán");
  const b = bookingOfPayment(c.db, p);
  if (p.status !== "PAID") throw new HttpError(409, "INVALID_TRANSITION", "Chỉ hoàn được giao dịch đã thanh toán");
  const why = blank(c.body?.reason) ?? "Quản trị viên hoàn tiền";
  if (b.status === "CONFIRMED") {
    b.status = "CANCELLED";
    b.cancelledAt = c.now;
    b.cancelReason = why;
    releaseSeats(c.db, b);
  }
  Object.assign(p, { status: "REFUNDED", refundAmount: p.amount, note: why });
  notify(c.db, c.now, b.userId, b.id, `Hoàn tiền đơn ${b.bookingCode}`, `Đã hoàn ${vnd(p.amount)}. ${why}`);
  audit(c.db, c.now, me.id, "REFUND", "payment", p.id, why);
  return paymentDto(c.db, p);
}, { message: "Đã hoàn tiền" });
on("POST", "/payments/:id/cancel", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const p = must(byId(c.db.payments, c.params.id), "thanh toán");
  assertTransition("Thanh toán", p.status, "CANCELLED");
  Object.assign(p, { status: "CANCELLED", note: "Quản trị viên huỷ giao dịch" });
  audit(c.db, c.now, me.id, "CANCEL", "payment", p.id);
  return paymentDto(c.db, p);
}, { message: "Đã huỷ giao dịch" });

// ---- 4.6 Đánh giá, thông báo
on("POST", "/reviews", (c) => {
  const me = requireUser(c, ["CUSTOMER"]);
  const rating = Number(c.body.rating);
  const content = String(c.body.content ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) throw invalid("rating", "Điểm đánh giá từ 1 đến 5");
  if (content.length < 10) throw invalid("content", "Nội dung tối thiểu 10 ký tự");
  const b = byId(c.db.bookings, c.body.bookingId);
  if (!b || b.userId !== me.id) throw notFound("đơn đặt tour");
  if (b.status !== "COMPLETED") throw rule("Bạn chỉ đánh giá được sau khi hoàn thành chuyến đi");
  if (c.db.reviews.some((r) => r.bookingId === b.id)) throw new HttpError(409, "ALREADY_REVIEWED", "Bạn đã đánh giá chuyến đi này");
  const d = byId(c.db.departures, b.departureId)!;
  const r = store.insert<DB["reviews"][number]>(c.db, "reviews", {
    userId: me.id, tourId: d.tourId, bookingId: b.id, rating, content, status: "VISIBLE", createdAt: c.now,
  });
  audit(c.db, c.now, me.id, "CREATE", "review", r.id, `rating=${rating}`);
  return reviewDto(c.db, r);
}, { status: 201, message: "Cảm ơn bạn đã đánh giá" });
on("GET", "/admin/reviews", (c) => {
  requireUser(c, STAFF);
  return page([...c.db.reviews].sort((a, b) => b.createdAt - a.createdAt), c.query, (r) => reviewDto(c.db, r));
});
on("PUT", "/admin/reviews/:id/visibility", (c) => {
  const me = requireUser(c, STAFF);
  const r = must(byId(c.db.reviews, c.params.id), "đánh giá");
  r.status = c.body.status === "HIDDEN" ? "HIDDEN" : "VISIBLE";
  audit(c.db, c.now, me.id, r.status === "HIDDEN" ? "HIDE" : "SHOW", "review", r.id);
  return reviewDto(c.db, r);
});
on("GET", "/notifications", (c) => {
  const me = requireUser(c);
  const list = c.db.notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return page(list, c.query, (n) => ({ id: n.id, title: n.title, content: n.content, bookingId: n.bookingId, read: n.read, createdAt: iso(n.createdAt) }), 20);
});
on("GET", "/notifications/unread-count", (c) => {
  const me = requireUser(c);
  return { count: c.db.notifications.filter((n) => n.userId === me.id && !n.read).length };
});
on("PUT", "/notifications/read-all", (c) => {
  const me = requireUser(c);
  c.db.notifications.filter((n) => n.userId === me.id).forEach((n) => (n.read = true));
  return null;
});
on("PUT", "/notifications/:id/read", (c) => {
  const me = requireUser(c);
  const n = c.db.notifications.find((x) => x.id === Number(c.params.id) && x.userId === me.id);
  if (!n) throw notFound("thông báo");
  n.read = true;
  return null;
});

// ---- 4.7 Hướng dẫn viên
function assignedDeparture(c: Ctx) {
  const me = requireUser(c, ["TOUR_GUIDE"]);
  const d = must(byId(c.db.departures, c.params.id), "đợt khởi hành");
  if (d.tourGuideId !== me.id) throw new HttpError(403, "ACCESS_DENIED", "Bạn không được phân công cho đợt khởi hành này");
  return { me, d };
}
on("GET", "/guide/departures", (c) => {
  const me = requireUser(c, ["TOUR_GUIDE"]);
  const status = blank(c.query.get("status")) as DepartureStatus | undefined;
  return c.db.departures
    .filter((d) => d.tourGuideId === me.id && (!status || d.status === status))
    .sort((a, b) => a.startAt - b.startAt)
    .map((d) => departureDto(c.db, d));
});
on("GET", "/guide/departures/:id", (c) => {
  const { d } = assignedDeparture(c);
  const passengers = c.db.bookings
    .filter((b) => b.departureId === d.id && (b.status === "CONFIRMED" || b.status === "COMPLETED"))
    .sort((a, b) => a.bookedAt - b.bookedAt)
    .map((b) => {
      const u = byId(c.db.users, b.userId)!;
      return { bookingCode: b.bookingCode, fullName: u.fullName, phone: u.phone, adultQuantity: b.adultQuantity, childQuantity: b.childQuantity, status: b.status };
    });
  return { departure: departureDto(c.db, d), tourTitle: byId(c.db.tours, d.tourId)!.title, passengers };
});
on("POST", "/guide/departures/:id/start", (c) => {
  const { me, d } = assignedDeparture(c);
  if (c.now < d.startAt - setting(c.db, "guide.start_window_hours", 24) * HOUR) throw rule("Chưa tới thời gian bắt đầu tour");
  assertTransition("Đợt khởi hành", d.status, "IN_PROGRESS");
  d.status = "IN_PROGRESS";
  d.updatedAt = c.now;
  c.db.bookings.filter((b) => b.departureId === d.id && b.status === "PENDING").forEach((b) => expireBooking(c.db, b, c.now));
  audit(c.db, c.now, me.id, "START", "departure", d.id);
  return departureDto(c.db, d);
}, { message: "Đã bắt đầu tour" });
on("POST", "/guide/departures/:id/finish", (c) => {
  const { me, d } = assignedDeparture(c);
  assertTransition("Đợt khởi hành", d.status, "COMPLETED");
  d.status = "COMPLETED";
  d.updatedAt = c.now;
  const t = byId(c.db.tours, d.tourId)!;
  c.db.bookings.filter((b) => b.departureId === d.id && b.status === "CONFIRMED").forEach((b) => {
    b.status = "COMPLETED";
    b.completedAt = c.now;
    notify(c.db, c.now, b.userId, b.id, "Cảm ơn bạn đã đồng hành", `Tour ${t.title} đã kết thúc. Hãy để lại đánh giá cho chuyến đi nhé.`);
  });
  audit(c.db, c.now, me.id, "FINISH", "departure", d.id);
  return departureDto(c.db, d);
}, { message: "Đã kết thúc tour" });

// ---- 4.8 Quản trị
on("GET", "/admin/dashboard", (c) => {
  requireUser(c, STAFF);
  const { db, now } = c;
  const bookings: Record<string, number> = {};
  for (const s of ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"]) bookings[s] = db.bookings.filter((b) => b.status === s).length;
  const collected = db.payments.filter((p) => p.status === "PAID" || p.status === "REFUNDED").reduce((s, p) => s + p.amount, 0);
  const refunded = db.payments.filter((p) => p.status === "REFUNDED").reduce((s, p) => s + (p.refundAmount ?? 0), 0);
  return {
    tours: { total: db.tours.length, active: db.tours.filter((t) => t.status === "ACTIVE").length },
    departures: {
      upcoming: db.departures.filter((d) => d.status === "OPEN" && d.startAt > now).length,
      inProgress: db.departures.filter((d) => d.status === "IN_PROGRESS").length,
    },
    bookings,
    revenue: { paid: collected - refunded, refunded },
    users: { total: db.users.length, customers: db.users.filter((u) => u.role === "CUSTOMER").length },
    recentBookings: [...db.bookings].sort((a, b) => b.bookedAt - a.bookedAt).slice(0, 8).map((b) => bookingDto(db, b, now, false)),
  };
});
on("GET", "/admin/users", (c) => {
  requireUser(c, ["ADMIN"]);
  const kw = foldKeyword(c.query.get("keyword"));
  const role = blank(c.query.get("role"));
  const list = c.db.users
    .filter((u) => (!role || u.role === role) && (!kw || fold(u.fullName).includes(kw) || fold(u.email).includes(kw)))
    .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return page(list, c.query, userDto);
});
on("POST", "/admin/users", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const b = c.body;
  const email = blank(b.email)?.toLowerCase();
  if (!blank(b.fullName)) throw invalid("fullName", "Vui lòng nhập họ tên");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw invalid("email", "Email không hợp lệ");
  if (!b.password || String(b.password).length < 8) throw invalid("password", "Mật khẩu tối thiểu 8 ký tự");
  if (b.phone && !/^0\d{9,10}$/.test(String(b.phone).trim())) throw invalid("phone", "Số điện thoại không hợp lệ");
  if (c.db.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, "EMAIL_EXISTS", "Email này đã được đăng ký");
  const u = store.insert<User>(c.db, "users", {
    role: b.role, fullName: String(b.fullName).trim(), email, password: b.password, phone: blank(b.phone), active: true, createdAt: c.now,
  });
  audit(c.db, c.now, me.id, "CREATE", "user", u.id, `role=${u.role}`);
  return userDto(u);
}, { status: 201, message: "Đã tạo tài khoản" });
on("PUT", "/admin/users/:id", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const u = must(byId(c.db.users, c.params.id), "tài khoản");
  if (u.id === me.id && c.body.role !== u.role) throw rule("Không thể tự đổi vai trò của chính mình");
  if (!blank(c.body.fullName)) throw invalid("fullName", "Vui lòng nhập họ tên");
  u.fullName = String(c.body.fullName).trim();
  u.phone = blank(c.body.phone);
  if (c.body.role && c.body.role !== u.role) {
    audit(c.db, c.now, me.id, "CHANGE_ROLE", "user", u.id, `${u.role} → ${c.body.role}`);
    u.role = c.body.role;
  }
  return userDto(u);
}, { message: "Đã lưu tài khoản" });
on("PUT", "/admin/users/:id/active", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const active = !!c.body.active;
  if (Number(c.params.id) === me.id && !active) throw rule("Không thể tự khoá tài khoản của chính mình");
  const u = must(byId(c.db.users, c.params.id), "tài khoản");
  u.active = active;
  if (!active) c.db.tokens.filter((t) => t.userId === u.id).forEach((t) => (t.revoked = true));
  audit(c.db, c.now, me.id, active ? "UNLOCK" : "LOCK", "user", u.id);
  return userDto(u);
});
on("GET", "/admin/settings", (c) => {
  requireUser(c, ["ADMIN"]);
  return [...c.db.settings].sort((a, b) => a.key.localeCompare(b.key));
});
on("PUT", "/admin/settings", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const ranges: Record<string, [number, number]> = {
    "booking.payment_timeout_minutes": [1, 1440], "pricing.child_percent": [0, 100], "cancel.full_refund_days": [0, 365],
    "cancel.partial_refund_days": [0, 365], "cancel.partial_refund_percent": [0, 100], "guide.start_window_hours": [0, 168],
  };
  const next = c.db.settings.map((s) => ({ ...s }));
  for (const item of (c.body.items ?? []) as { key: string; value: string }[]) {
    const s = next.find((x) => x.key === item.key);
    if (!s) throw notFound(`tham số ${item.key}`);
    const v = Number.parseInt(String(item.value).trim(), 10);
    if (!/^-?\d+$/.test(String(item.value).trim())) throw bad(`${item.key} phải là số nguyên`);
    const [lo, hi] = ranges[item.key] ?? [-Infinity, Infinity];
    if (v < lo || v > hi) throw bad(`${item.key} phải nằm trong khoảng ${lo}–${hi}`);
    s.value = String(v);
  }
  const get = (k: string) => Number(next.find((s) => s.key === k)?.value);
  if (get("cancel.partial_refund_days") > get("cancel.full_refund_days")) throw bad("Mốc hoàn một phần phải nhỏ hơn hoặc bằng mốc hoàn đủ");
  c.db.settings = next;
  audit(c.db, c.now, me.id, "UPDATE", "setting", undefined, (c.body.items ?? []).map((i: { key: string; value: string }) => `${i.key}=${i.value}`).join(", "));
  return [...next].sort((a, b) => a.key.localeCompare(b.key));
}, { message: "Đã lưu cấu hình" });
on("GET", "/admin/audit-logs", (c) => {
  requireUser(c, ["ADMIN"]);
  const list = [...c.db.audit].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
  return page(list, c.query, (a) => ({
    id: a.id, userEmail: a.userId ? byId(c.db.users, a.userId)?.email : undefined, action: a.action, entityType: a.entityType,
    entityId: a.entityId, result: a.result, detail: a.detail, createdAt: iso(a.createdAt),
  }), 30);
});

// ---- 4.9 Công cụ demo
on("GET", "/demo/clock", ({ now, db }) => ({ now: iso(now), offsetMinutes: db.offsetMinutes }));
on("POST", "/demo/clock", (c) => {
  const me = requireUser(c, ["ADMIN"]);
  const offset = Number(c.body.offsetMinutes);
  if (!(offset >= 0 && offset <= 60 * 24 * 60)) throw rule("Chỉ dời tới tối đa 60 ngày về phía trước");
  c.db.offsetMinutes = offset;
  const now = Date.now() + offset * 60_000;
  audit(c.db, now, me.id, "TIME_TRAVEL", "system", undefined, `offset=${offset} phút`);
  runExpiry(c.db, now);
  return { now: iso(now), offsetMinutes: offset };
});
on("POST", "/demo/expire-now", (c) => {
  requireUser(c, ["ADMIN"]);
  return { expired: runExpiry(c.db, c.now) };
});

// ------------------------------------------------------------------ bộ chặn fetch

function respond(status: number, payload: object) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

function envelope(status: number, code: string, message: string, data: unknown, errors: unknown = null) {
  return {
    success: status < 400, status, code, message, requestId: crypto.randomUUID?.() ?? String(Math.random()),
    timestamp: new Date().toISOString(), data, errors,
  };
}

async function handle(url: URL, init: RequestInit & { headers?: Record<string, string> }, base: string): Promise<Response> {
  const path = url.pathname.slice(new URL(base).pathname.length) || "/";
  const method = (init.method ?? "GET").toUpperCase() as Method;
  const db = store.load();
  const now = Date.now() + db.offsetMinutes * 60_000;
  // Độ trễ nhỏ cho giống mạng thật (để thấy spinner/pending)
  await new Promise((r) => setTimeout(r, method === "GET" ? 90 : 220));
  try {
    runExpiry(db, now);
    const headers = new Headers(init.headers);
    const me = userFromAuth(db, headers.get("Authorization"));
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      let body: any = {};
      if (typeof init.body === "string" && init.body) body = JSON.parse(init.body);
      const data = r.handler({ db, now, me, query: url.searchParams, body: body ?? {}, params });
      store.save(db);
      const status = r.status ?? 200;
      return respond(status, envelope(status, "SUCCESS", r.message ?? "OK", data ?? null));
    }
    throw new HttpError(404, "NOT_FOUND", `Không có API ${method} ${path} trong bản demo`);
  } catch (e) {
    store.save(db); // giữ lại audit log của lần thất bại (VD đăng nhập sai)
    if (e instanceof HttpError) return respond(e.status, envelope(e.status, e.code, e.message, null, e.errors));
    console.error("[demo-api]", e);
    return respond(500, envelope(500, "INTERNAL_ERROR", "Máy chủ demo gặp lỗi không lường trước", null));
  }
}

export function installMockApi(base: string) {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!href.startsWith(base)) return realFetch(input, init);
    return handle(new URL(href), init as RequestInit & { headers?: Record<string, string> }, base);
  };
  // Mở nhiều tab cùng lúc: tab khác ghi dữ liệu thì đọc lại
  window.addEventListener("storage", (e) => {
    if (e.key === store.DB_KEY) store.invalidate();
  });
}
