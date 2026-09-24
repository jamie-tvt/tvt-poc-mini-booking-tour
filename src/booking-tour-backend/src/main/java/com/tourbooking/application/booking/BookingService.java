package com.tourbooking.application.booking;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.application.common.Codes;
import com.tourbooking.application.notification.NotificationService;
import com.tourbooking.application.systemsetting.SettingService;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.payment.Bill;
import com.tourbooking.domain.user.User;
import com.tourbooking.infrastructure.persistence.jpa.JpaBillRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDepartureRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaUserRepository;
import com.tourbooking.infrastructure.security.AuthUser;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {
    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final int MAX_TICKETS_PER_BOOKING = 20;

    private final JpaBookingRepository bookings;
    private final JpaTourDepartureRepository departures;
    private final JpaUserRepository users;
    private final JpaBillRepository bills;
    private final BookingLifecycle lifecycle;
    private final SettingService settings;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;

    public BookingService(JpaBookingRepository bookings, JpaTourDepartureRepository departures, JpaUserRepository users,
                          JpaBillRepository bills, BookingLifecycle lifecycle, SettingService settings,
                          NotificationService notifications, AuditService audit, TimeProvider time) {
        this.bookings = bookings;
        this.departures = departures;
        this.users = users;
        this.bills = bills;
        this.lifecycle = lifecycle;
        this.settings = settings;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
    }

    /**
     * Đặt tour (SRS 4.6). Khoá dòng đợt khởi hành trong giao dịch để hai khách không cùng lấy chỗ cuối;
     * CHECK (booked_seats <= capacity) ở DB là lớp chặn thứ hai nếu code có lỗi.
     */
    @Transactional
    public Booking create(Long userId, Long departureId, int adults, int children) {
        int tickets = adults + children;
        if (adults < 1) throw new BusinessException(ErrorCode.BAD_REQUEST, "Cần ít nhất 1 vé người lớn");
        if (children < 0 || tickets > MAX_TICKETS_PER_BOOKING) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Mỗi đơn đặt tối đa " + MAX_TICKETS_PER_BOOKING + " vé");
        }
        Instant now = time.now();
        User user = users.findById(userId).orElseThrow();
        TourDeparture d = departures.findByIdForUpdate(departureId).orElseThrow(() -> BusinessException.notFound("đợt khởi hành"));
        d.reserveSeats(tickets, now);
        String code;
        do { code = Codes.random("BT-", 6); } while (bookings.existsByBookingCode(code));
        Booking b = bookings.save(new Booking(code, user, d, adults, children, now, now.plus(settings.paymentTimeout())));
        bills.save(new Bill(b, "HD-" + code.substring(3), b.getTotalPrice(), now));
        notifications.notify(userId, b.getId(), "Đã giữ chỗ " + code,
                "Vui lòng thanh toán " + BookingLifecycle.vnd(b.getTotalPrice()) + " trước khi hết hạn giữ chỗ.");
        audit.log(userId, "CREATE", "booking", b.getId(), code + " x" + tickets);
        return b;
    }

    @Transactional(readOnly = true)
    public Page<Booking> mine(Long userId, BookingStatus status, Pageable pageable) { return bookings.findMine(userId, status, pageable); }

    @Transactional(readOnly = true)
    public Booking get(Long id, AuthUser viewer) {
        Booking b = bookings.findById(id).orElseThrow(() -> BusinessException.notFound("đơn đặt tour"));
        if (!viewer.isStaff() && !b.isOwnedBy(viewer.id())) throw BusinessException.notFound("đơn đặt tour");
        return b;
    }

    @Transactional(readOnly = true)
    public Page<Booking> search(BookingStatus status, Long departureId, String keyword, Pageable pageable) {
        return bookings.search(status, departureId, keyword == null || keyword.isBlank() ? null : keyword.trim(), pageable);
    }

    /** SRS 4.8 + 9.6: khách huỷ; tiền hoàn theo số ngày còn lại trước khởi hành. */
    @Transactional
    public Booking cancelByCustomer(Long id, Long userId, String reason) {
        Instant now = time.now();
        Booking b = lockForChange(id);
        if (!b.isOwnedBy(userId)) throw BusinessException.notFound("đơn đặt tour");
        if (!b.getDeparture().getStartAt().isAfter(now)) throw BusinessException.rule("Tour đã khởi hành nên không thể huỷ");
        int percent = b.getStatus() == BookingStatus.CONFIRMED
                ? settings.refundPolicy().percentFor(now, b.getDeparture().getStartAt()) : 0;
        long refunded = lifecycle.cancel(b, reason == null || reason.isBlank() ? "Khách huỷ" : reason.trim(), percent, now);
        audit.log(userId, "CANCEL", "booking", id, "hoàn " + percent + "% = " + refunded);
        return b;
    }

    /** Admin huỷ thay khách: hoàn đủ 100%. */
    @Transactional
    public Booking cancelByAdmin(Long id, Long adminId, String reason) {
        Booking b = lockForChange(id);
        long refunded = lifecycle.cancel(b, reason, 100, time.now());
        audit.log(adminId, "ADMIN_CANCEL", "booking", id, reason + " — hoàn " + refunded);
        return b;
    }

    /** Khoá theo thứ tự departure → booking. Chỉ lấy id trước (không nạp entity) để lúc khoá đọc được dữ liệu mới nhất. */
    private Booking lockForChange(Long id) {
        Long departureId = bookings.findDepartureId(id).orElseThrow(() -> BusinessException.notFound("đơn đặt tour"));
        departures.findByIdForUpdate(departureId).orElseThrow();
        return bookings.findByIdForUpdate(id).orElseThrow();
    }

    // ------------------------------------------------------------ hết hạn
    public List<Long> overdueIds() { return bookings.findOverdueIds(time.now()); }

    /** Một booking một giao dịch: lỗi ở đơn này không chặn các đơn khác. */
    @Transactional
    public boolean expireOne(Long id) {
        Instant now = time.now();
        Booking b = lockForChange(id);
        if (!b.isPaymentOverdue(now)) return false;       // đã được thanh toán/huỷ trong lúc chờ khoá
        lifecycle.expire(b, now);
        audit.log(null, "EXPIRE", "booking", id, b.getBookingCode());
        log.info("Booking {} hết hạn thanh toán, nhả {} chỗ", b.getBookingCode(), b.getTicketQuantity());
        return true;
    }
}
