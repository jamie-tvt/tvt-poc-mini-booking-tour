package com.tourbooking.application.payment;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.application.booking.BookingLifecycle;
import com.tourbooking.application.notification.NotificationService;
import com.tourbooking.application.payment.PaymentGateway.GatewayEvent;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.payment.*;
import com.tourbooking.infrastructure.integration.mockgateway.MockPaymentGateway;
import com.tourbooking.infrastructure.persistence.jpa.JpaBillRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaPaymentRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDepartureRepository;
import com.tourbooking.infrastructure.security.AuthUser;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thanh toán (SRS 4.7, 7.7). Trạng thái chỉ đổi qua webhook đã xác minh chữ ký (hoặc admin xác minh tay),
 * không bao giờ tin vào redirect của trình duyệt.
 */
@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    public record Checkout(Payment payment, String checkoutUrl) {}

    private final JpaPaymentRepository payments;
    private final JpaBillRepository bills;
    private final JpaBookingRepository bookings;
    private final JpaTourDepartureRepository departures;
    private final PaymentGateway gateway;
    private final ObjectProvider<MockPaymentGateway> mockGateway;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;

    public PaymentService(JpaPaymentRepository payments, JpaBillRepository bills, JpaBookingRepository bookings,
                          JpaTourDepartureRepository departures, PaymentGateway gateway, ObjectProvider<MockPaymentGateway> mockGateway,
                          NotificationService notifications, AuditService audit, TimeProvider time) {
        this.payments = payments;
        this.bills = bills;
        this.bookings = bookings;
        this.departures = departures;
        this.gateway = gateway;
        this.mockGateway = mockGateway;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
    }

    public PaymentProvider activeProvider() { return gateway.provider(); }

    @Transactional
    public Checkout initiate(Long bookingId, Long userId) {
        Booking b = bookings.findByIdForUpdate(bookingId).filter(x -> x.isOwnedBy(userId))
                .orElseThrow(() -> BusinessException.notFound("đơn đặt tour"));
        if (b.getStatus() != BookingStatus.PENDING) throw BusinessException.rule("Đơn này không ở trạng thái chờ thanh toán");
        if (b.isPaymentOverdue(time.now())) throw BusinessException.rule("Đơn đã quá hạn thanh toán, vui lòng đặt lại");
        Bill bill = bills.findByBookingId(bookingId).orElseThrow();
        Payment p = payments.findByBillIdOrderByCreatedAtAsc(bill.getId()).stream()
                .filter(x -> x.getStatus() == PaymentStatus.PENDING && x.getProvider() == gateway.provider())
                .findFirst()
                .orElseGet(() -> payments.save(new Payment(bill, gateway.provider(), time.now())));
        audit.log(userId, "INITIATE", "payment", p.getId(), b.getBookingCode());
        return new Checkout(p, gateway.checkoutUrl(p, b));
    }

    /** Trang "cổng giả lập" gọi: tự ký rồi đi đúng đường webhook như cổng thật. */
    @Transactional
    public Payment mockComplete(Long paymentId, Long userId, boolean success) {
        MockPaymentGateway mock = mockGateway.getIfAvailable();
        if (mock == null) throw BusinessException.rule("Cổng giả lập đang tắt");
        // Kiểm quyền bằng projection, không nạp entity: đường webhook phía sau phải khoá và đọc bản mới nhất
        Long bookingId = payments.findBookingId(paymentId).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        if (!userId.equals(bookings.findOwnerId(bookingId).orElseThrow())) throw BusinessException.notFound("thanh toán");
        String[] signed = mock.buildSignedEvent(paymentId, payments.findAmount(paymentId).orElseThrow(), success);
        handleWebhook(signed[0], signed[1]);
        return payments.findById(paymentId).orElseThrow();
    }

    @Transactional
    public void handleWebhook(String rawBody, String signature) {
        Optional<GatewayEvent> event = gateway.parseWebhook(rawBody, signature);
        event.ifPresent(this::apply);
    }

    private void apply(GatewayEvent e) {
        Instant now = time.now();
        // Idempotent: mã giao dịch đã ghi nhận → bỏ qua (cổng thường gửi lại webhook nhiều lần)
        if (payments.existsByTransactionCode(e.transactionCode())) {
            log.info("Webhook trùng transactionCode={} — bỏ qua", e.transactionCode());
            return;
        }
        Long bookingId = payments.findBookingId(e.paymentId()).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        Booking b = bookings.findByIdForUpdate(bookingId).orElseThrow();
        Payment p = payments.findByIdForUpdate(e.paymentId()).orElseThrow();
        if (p.getStatus() != PaymentStatus.PENDING) {
            log.warn("Webhook cho payment {} ở trạng thái {} — bỏ qua", p.getId(), p.getStatus());
            return;
        }
        if (!e.success()) {
            p.markFailed(e.transactionCode(), "Cổng thanh toán báo thất bại");
            notifications.notify(b.getUser().getId(), b.getId(), "Thanh toán chưa thành công",
                    "Giao dịch cho đơn " + b.getBookingCode() + " thất bại. Bạn có thể thanh toán lại trước khi hết hạn giữ chỗ.");
            audit.log(null, "PAYMENT_FAILED", "payment", p.getId(), e.transactionCode());
            return;
        }
        if (e.amount() != p.getAmount()) {
            p.markFailed(e.transactionCode(), "Số tiền cổng báo (" + e.amount() + ") khác hoá đơn");
            audit.log(null, "PAYMENT_AMOUNT_MISMATCH", "payment", p.getId(), e.transactionCode());
            return;
        }
        p.markPaid(e.transactionCode(), e.amount(), e.method(), now);
        if (b.getStatus() == BookingStatus.PENDING) {
            b.confirm();
            notifications.notify(b.getUser().getId(), b.getId(), "Đặt tour thành công " + b.getBookingCode(),
                    "Đã nhận " + BookingLifecycle.vnd(p.getAmount()) + ". Hẹn gặp bạn ngày khởi hành!");
            audit.log(null, "PAYMENT_PAID", "payment", p.getId(), e.transactionCode());
        } else {
            // Tiền về sau khi đơn đã hết hạn/huỷ: không giữ tiền của khách
            p.refund(p.getAmount(), "Nhận tiền khi đơn đã " + b.getStatus() + " — hoàn tự động");
            notifications.notify(b.getUser().getId(), b.getId(), "Đơn " + b.getBookingCode() + " đã hết hiệu lực",
                    "Hệ thống nhận được tiền sau khi đơn hết hạn nên đã hoàn lại toàn bộ.");
            audit.log(null, "PAYMENT_LATE_REFUND", "payment", p.getId(), e.transactionCode());
        }
    }

    // ---------------------------------------------------------------- admin
    @Transactional
    public Payment verifyManually(Long paymentId, Long adminId) {
        Long bookingId = payments.findBookingId(paymentId).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        Booking b = bookings.findByIdForUpdate(bookingId).orElseThrow();
        Payment p = payments.findByIdForUpdate(paymentId).orElseThrow();
        if (b.getStatus() != BookingStatus.PENDING) throw BusinessException.rule("Đơn không còn chờ thanh toán nên không xác minh được");
        p.markPaid("MANUAL-" + paymentId + "-" + time.now().getEpochSecond(), p.getAmount(), "MANUAL", time.now());
        b.confirm();
        notifications.notify(b.getUser().getId(), b.getId(), "Đặt tour thành công " + b.getBookingCode(), "Quản trị viên đã xác nhận thanh toán.");
        audit.log(adminId, "VERIFY", "payment", paymentId, null);
        return p;
    }

    /** Hoàn tiền toàn bộ; đơn đang CONFIRMED sẽ bị huỷ và nhả chỗ. */
    @Transactional
    public Payment refund(Long paymentId, Long adminId, String reason) {
        Long bookingId = payments.findBookingId(paymentId).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        departures.findByIdForUpdate(bookings.findDepartureId(bookingId).orElseThrow()).orElseThrow();
        Booking b = bookings.findByIdForUpdate(bookingId).orElseThrow();
        Payment p = payments.findByIdForUpdate(paymentId).orElseThrow();
        if (p.getStatus() != PaymentStatus.PAID) throw new BusinessException(ErrorCode.INVALID_TRANSITION, "Chỉ hoàn được giao dịch đã thanh toán");
        String why = reason == null || reason.isBlank() ? "Quản trị viên hoàn tiền" : reason.trim();
        if (b.getStatus() == BookingStatus.CONFIRMED) {
            b.cancel(why, time.now());
            b.getDeparture().releaseSeats(b.getTicketQuantity(), time.now());
        }
        p.refund(p.getAmount(), why);
        notifications.notify(b.getUser().getId(), b.getId(), "Hoàn tiền đơn " + b.getBookingCode(),
                "Đã hoàn " + BookingLifecycle.vnd(p.getAmount()) + ". " + why);
        audit.log(adminId, "REFUND", "payment", paymentId, why);
        return p;
    }

    @Transactional
    public Payment cancel(Long paymentId, Long adminId) {
        Payment p = payments.findByIdForUpdate(paymentId).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        p.cancel("Quản trị viên huỷ giao dịch");
        audit.log(adminId, "CANCEL", "payment", paymentId, null);
        return p;
    }

    @Transactional(readOnly = true)
    public Payment get(Long id, AuthUser viewer) {
        Payment p = payments.findById(id).orElseThrow(() -> BusinessException.notFound("thanh toán"));
        if (!viewer.isStaff() && !p.getBill().getBooking().isOwnedBy(viewer.id())) throw BusinessException.notFound("thanh toán");
        return p;
    }

    @Transactional(readOnly = true)
    public Page<Payment> search(PaymentStatus status, Pageable pageable) { return payments.search(status, pageable); }

    @Transactional(readOnly = true)
    public Optional<Bill> bill(Long bookingId) { return bills.findByBookingId(bookingId); }

    @Transactional(readOnly = true)
    public List<Payment> forBooking(Long bookingId) { return payments.findByBookingId(bookingId); }
}
