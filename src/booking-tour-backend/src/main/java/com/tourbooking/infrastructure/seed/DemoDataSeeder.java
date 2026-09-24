package com.tourbooking.infrastructure.seed;

import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.notification.Notification;
import com.tourbooking.domain.payment.Bill;
import com.tourbooking.domain.payment.Payment;
import com.tourbooking.domain.payment.PaymentProvider;
import com.tourbooking.domain.review.Review;
import com.tourbooking.domain.tour.*;
import com.tourbooking.domain.user.User;
import com.tourbooking.infrastructure.persistence.jpa.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dữ liệu mẫu cho demo, sinh theo "hôm nay" nên lúc nào mở demo cũng có đợt sắp khởi hành.
 * Chỉ chạy khi DB chưa có người dùng. Tài khoản giống Mockup UI của Team A (mật khẩu 12345678).
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo", havingValue = "true")
public class DemoDataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final JpaUserRepository users;
    private final JpaUserRoleRepository roles;
    private final JpaTourCategoryRepository categories;
    private final JpaPlaceRepository places;
    private final JpaTourRepository tours;
    private final JpaTourDetailRepository details;
    private final JpaTourImageRepository images;
    private final JpaTourDepartureRepository departures;
    private final JpaBookingRepository bookings;
    private final JpaBillRepository bills;
    private final JpaPaymentRepository payments;
    private final JpaReviewRepository reviews;
    private final JpaNotificationRepository notifications;
    private final PasswordEncoder encoder;
    private final TimeProvider time;
    private int seq = 0;

    public DemoDataSeeder(JpaUserRepository users, JpaUserRoleRepository roles, JpaTourCategoryRepository categories, JpaPlaceRepository places,
                          JpaTourRepository tours, JpaTourDetailRepository details, JpaTourImageRepository images,
                          JpaTourDepartureRepository departures, JpaBookingRepository bookings, JpaBillRepository bills,
                          JpaPaymentRepository payments, JpaReviewRepository reviews, JpaNotificationRepository notifications,
                          PasswordEncoder encoder, TimeProvider time) {
        this.users = users; this.roles = roles; this.categories = categories; this.places = places; this.tours = tours;
        this.details = details; this.images = images; this.departures = departures; this.bookings = bookings; this.bills = bills;
        this.payments = payments; this.reviews = reviews; this.notifications = notifications; this.encoder = encoder; this.time = time;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;
        Instant now = time.now();
        String pw = encoder.encode("12345678");
        User hao = user("CUSTOMER", "Nguyễn Văn Hào", "customer@example.com", "0901234567", pw, now);
        User mai = user("CUSTOMER", "Trần Thị Mai", "mai.tran@example.com", "0912345678", pw, now);
        User hung = user("TOUR_GUIDE", "Trần Quốc Hưng", "guide@example.com", "0923456789", pw, now);
        User tuan = user("TOUR_GUIDE", "Phạm Minh Tuấn", "tuan.guide@example.com", "0934567890", pw, now);
        user("TOUR_MANAGER", "Nguyễn Thu Hà", "manager@example.com", "0945678901", pw, now);
        user("ADMIN", "Lê Hoàng Long", "admin@example.com", "0956789012", pw, now);

        TourCategory songNuoc = categories.save(new TourCategory("Sông nước miền Tây"));
        TourCategory vanHoa = categories.save(new TourCategory("Văn hoá – Lịch sử"));
        TourCategory sinhThai = categories.save(new TourCategory("Sinh thái – Nghỉ dưỡng"));
        TourCategory bienDao = categories.save(new TourCategory("Biển đảo"));

        Map<String, Place> p = new LinkedHashMap<>();
        for (String[] x : new String[][] {
                {"Chợ nổi Cái Răng", "Chợ nổi lớn nhất Cần Thơ, họp từ 5 giờ sáng"},
                {"Lò hủ tiếu Sáu Hoài", "Xem làm hủ tiếu thủ công, thử bánh tráng"},
                {"Vườn trái cây Phong Điền", "Hái trái cây theo mùa tại vườn"},
                {"Bến Ninh Kiều", "Biểu tượng Cần Thơ bên sông Hậu"},
                {"Cồn Sơn", "Làng du lịch cộng đồng giữa sông Hậu, xem cá lóc bay"},
                {"Chợ nổi Ngã Bảy", "Chợ nổi Phụng Hiệp, Hậu Giang"},
                {"Khu bảo tồn Lung Ngọc Hoàng", "Rừng ngập nước, chim cò, trải nghiệm xuồng ba lá"},
                {"Làng nghề cá thát lát", "Đặc sản Hậu Giang"},
                {"Mũi Cà Mau", "Điểm cực Nam Tổ quốc"},
                {"Rừng U Minh Hạ", "Rừng tràm, gác kèo ong"},
                {"Chùa Dơi", "Chùa Khmer nổi tiếng Sóc Trăng"},
                {"Chùa Chén Kiểu", "Chùa ốp mảnh chén sứ độc đáo"},
                {"Nam đảo Phú Quốc", "Bãi Sao, cáp treo Hòn Thơm"},
                {"Rừng tràm Trà Sư", "Rừng tràm An Giang mùa nước nổi"},
                {"Nhà Công tử Bạc Liêu", "Dinh thự đầu thế kỷ XX"},
                {"Cánh đồng điện gió Bạc Liêu", "Điện gió ven biển"}}) {
            p.put(x[0], places.save(new Place(x[0], x[1])));
        }

        Tour caiRang = tour("MT-CR-01", "Chợ nổi Cái Răng – Vườn trái cây Phong Điền", "Cần Thơ", 650_000, 1, 25, songNuoc, "cai-rang",
                "Đi xuồng ra chợ nổi lúc bình minh, ăn hủ tiếu trên sông, ghé lò hủ tiếu và vườn trái cây Phong Điền.",
                now, p.get("Chợ nổi Cái Răng"), p.get("Lò hủ tiếu Sáu Hoài"), p.get("Vườn trái cây Phong Điền"), p.get("Bến Ninh Kiều"));
        Tour conSon = tour("MT-CS-02", "Cồn Sơn – Làng du lịch cộng đồng", "Cần Thơ", 590_000, 1, 20, songNuoc, "con-son",
                "Một ngày sống cùng người dân cồn: xem cá lóc bay, làm bánh dân gian, đạp xe quanh cồn.",
                now, p.get("Bến Ninh Kiều"), p.get("Cồn Sơn"));
        Tour hauGiang = tour("MT-HG-03", "Hậu Giang – Chợ nổi Ngã Bảy và Lung Ngọc Hoàng", "Hậu Giang", 1_650_000, 2, 20, sinhThai, "lung-ngoc-hoang",
                "Hai ngày một đêm khám phá Hậu Giang: chợ nổi Ngã Bảy, rừng ngập nước Lung Ngọc Hoàng, đặc sản cá thát lát.",
                now, p.get("Chợ nổi Ngã Bảy"), p.get("Khu bảo tồn Lung Ngọc Hoàng"), p.get("Làng nghề cá thát lát"));
        Tour caMau = tour("MT-CM-04", "Cà Mau – Mũi Cà Mau và Rừng U Minh Hạ", "Cà Mau", 3_290_000, 3, 30, sinhThai, "mui-ca-mau",
                "Ba ngày chạm tới điểm cực Nam, đi xuồng xuyên rừng tràm U Minh Hạ, thưởng thức mật ong gác kèo.",
                now, p.get("Mũi Cà Mau"), p.get("Rừng U Minh Hạ"));
        Tour socTrang = tour("VH-ST-05", "Sóc Trăng – Chùa Dơi và Chùa Chén Kiểu", "Sóc Trăng", 790_000, 1, 30, vanHoa, "soc-trang",
                "Tìm hiểu văn hoá Khmer Nam Bộ qua những ngôi chùa đặc sắc.", now, p.get("Chùa Dơi"), p.get("Chùa Chén Kiểu"));
        Tour phuQuoc = tour("BD-PQ-06", "Phú Quốc – Nam đảo và cáp treo Hòn Thơm", "Kiên Giang", 4_590_000, 3, 30, bienDao, "phu-quoc",
                "Nghỉ dưỡng ba ngày ở đảo ngọc: Bãi Sao, cáp treo vượt biển dài nhất thế giới, lặn ngắm san hô.", now, p.get("Nam đảo Phú Quốc"));
        Tour traSu = tour("ST-TS-07", "Trà Sư – Rừng tràm An Giang mùa nước nổi", "An Giang", 1_490_000, 2, 20, sinhThai, "tra-su",
                "Chèo xuồng dưới tán tràm xanh, ngắm chim trời, thưởng thức món ăn mùa nước nổi.", now, p.get("Rừng tràm Trà Sư"));
        Tour bacLieu = tour("VH-BL-08", "Bạc Liêu – Nhà Công tử và Cánh đồng điện gió", "Bạc Liêu", 1_890_000, 2, 25, vanHoa, "bac-lieu",
                "Nghe chuyện Công tử Bạc Liêu, dạo cánh đồng điện gió ven biển.", now, p.get("Nhà Công tử Bạc Liêu"), p.get("Cánh đồng điện gió Bạc Liêu"));
        bacLieu.changeStatus(TourStatus.DRAFT, now);   // tour nháp để demo màn quản lý

        // Đợt sắp tới cho mọi tour đang bán (7 giờ sáng giờ Việt Nam)
        for (Tour t : List.of(caiRang, conSon, hauGiang, caMau, socTrang, phuQuoc, traSu)) {
            for (int days : new int[] {10, 24, 38}) dep(t, vnMorning(now, days), 25, null, now);
        }
        // Đợt khởi hành trong 20 giờ tới — HDV Hưng bắt đầu được ngay để demo luồng HDV
        TourDeparture soon = dep(caiRang, now.plus(20, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS), 20, hung, now);
        confirmed(hao, soon, 2, 1, now.minus(2, ChronoUnit.DAYS));
        confirmed(mai, soon, 2, 0, now.minus(3, ChronoUnit.DAYS));
        // Đợt chỉ còn 1 chỗ — demo "hai người tranh chỗ cuối"
        TourDeparture lastSeat = dep(conSon, vnMorning(now, 4), 4, tuan, now);
        confirmed(mai, lastSeat, 3, 0, now.minus(1, ChronoUnit.DAYS));
        // Khách Hào có đơn còn xa ngày đi → huỷ được hoàn 100%
        TourDeparture hgNext = departures.findOpenUpcoming(hauGiang.getId(), now).get(0);
        confirmed(hao, hgNext, 2, 0, now.minus(1, ChronoUnit.DAYS));

        // Chuyến đã đi — Hào chưa đánh giá (demo form đánh giá), Mai đã đánh giá
        TourDeparture past = pastDep(caiRang, vnMorning(now, -12), 20, hung, now);
        Booking haoPast = completed(hao, past, 2, 0, now.minus(20, ChronoUnit.DAYS));
        Booking maiPast = completed(mai, past, 1, 0, now.minus(19, ChronoUnit.DAYS));
        past.seedState(DepartureStatus.COMPLETED, haoPast.getTicketQuantity() + maiPast.getTicketQuantity());
        reviews.save(new Review(mai.getId(), caiRang.getId(), maiPast.getId(), 5,
                "Chợ nổi lúc bình minh rất đẹp, anh Hưng hướng dẫn nhiệt tình, hủ tiếu trên ghe ngon.", now.minus(11, ChronoUnit.DAYS)));
        TourDeparture pqPast = pastDep(phuQuoc, vnMorning(now, -30), 20, tuan, now);
        Booking maiPq = completed(mai, pqPast, 2, 0, now.minus(45, ChronoUnit.DAYS));
        pqPast.seedState(DepartureStatus.COMPLETED, maiPq.getTicketQuantity());
        reviews.save(new Review(mai.getId(), phuQuoc.getId(), maiPq.getId(), 4,
                "Lịch trình hợp lý, khách sạn sạch. Cáp treo hơi đông vào buổi chiều.", now.minus(26, ChronoUnit.DAYS)));

        notifications.save(new Notification(hao.getId(), haoPast.getId(), "Cảm ơn bạn đã đồng hành",
                "Tour Chợ nổi Cái Răng đã kết thúc. Hãy để lại đánh giá cho chuyến đi nhé.", now.minus(12, ChronoUnit.DAYS)));
        log.info("Đã tạo dữ liệu mẫu: 6 tài khoản, {} tour, {} đợt khởi hành", tours.count(), departures.count());
    }

    private User user(String role, String name, String email, String phone, String pw, Instant now) {
        return users.save(new User(roles.findByName(role).orElseThrow(), name, email, pw, phone, now));
    }

    private Tour tour(String code, String title, String dest, long price, int days, int maxGuests, TourCategory cat, String img,
                      String desc, Instant now, Place... itinerary) {
        Tour t = new Tour(code, now);
        t.update(code, title, desc, dest, price, days, maxGuests, "/images/tours/" + img + ".svg", cat, now);
        t.changeStatus(TourStatus.ACTIVE, now);
        t = tours.save(t);
        for (int i = 0; i < itinerary.length; i++) details.save(new TourDetail(t.getId(), itinerary[i], i + 1));
        images.save(new TourImage(t.getId(), "/images/tours/" + img + ".svg", 0));
        return t;
    }

    private static Instant vnMorning(Instant now, int daysAhead) {
        return LocalDate.ofInstant(now, VN).plusDays(daysAhead).atTime(7, 0).atZone(VN).toInstant();
    }

    private TourDeparture dep(Tour t, Instant start, int capacity, User guide, Instant now) {
        TourDeparture d = new TourDeparture(t, now);
        long adult = t.getPrice();
        d.update(start, start.plus(Duration.ofDays(t.getDurationDays())).minus(Duration.ofHours(6)), capacity, adult, adult * 70 / 100, guide, now);
        return departures.save(d);
    }

    private TourDeparture pastDep(Tour t, Instant start, int capacity, User guide, Instant now) {
        TourDeparture d = new TourDeparture(t, now);
        d.update(start, start.plus(Duration.ofDays(t.getDurationDays())).minus(Duration.ofHours(6)), capacity, t.getPrice(), t.getPrice() * 70 / 100, guide, now);
        return departures.save(d);
    }

    private Booking confirmed(User u, TourDeparture d, int adults, int children, Instant bookedAt) {
        d.reserveSeats(adults + children, time.now());
        Booking b = paidBooking(u, d, adults, children, bookedAt);
        b.seedState(BookingStatus.CONFIRMED, bookedAt, null);
        return b;
    }

    private Booking completed(User u, TourDeparture d, int adults, int children, Instant bookedAt) {
        Booking b = paidBooking(u, d, adults, children, bookedAt);
        b.seedState(BookingStatus.COMPLETED, bookedAt, d.getEndAt());
        return b;
    }

    private Booking paidBooking(User u, TourDeparture d, int adults, int children, Instant bookedAt) {
        seq++;
        String code = "BT-DEMO" + (char) ('A' + seq - 1);
        Booking b = bookings.save(new Booking(code, u, d, adults, children, bookedAt, null));
        Bill bill = bills.save(new Bill(b, "HD-DEMO" + (char) ('A' + seq - 1), b.getTotalPrice(), bookedAt));
        Payment pay = new Payment(bill, PaymentProvider.MOCK, bookedAt);
        pay.markPaid("SEED-" + code, b.getTotalPrice(), "MOCK_CARD", bookedAt.plus(Duration.ofMinutes(3)));
        payments.save(pay);
        return b;
    }
}
