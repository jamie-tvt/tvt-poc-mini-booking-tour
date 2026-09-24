package com.tourbooking.application.booking;

import com.tourbooking.application.notification.NotificationService;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.RefundPolicy;
import com.tourbooking.domain.payment.Payment;
import com.tourbooking.domain.payment.PaymentStatus;
import com.tourbooking.infrastructure.persistence.jpa.JpaPaymentRepository;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * Các bước dùng chung khi huỷ/hết hạn booking. Người gọi PHẢI đã khoá theo thứ tự: đợt → booking,
 * lớp này khoá tiếp payment (thứ tự khoá thống nhất toàn hệ thống: departure → booking → payment).
 */
@Component
public class BookingLifecycle {
    private final JpaPaymentRepository payments;
    private final NotificationService notifications;

    public BookingLifecycle(JpaPaymentRepository payments, NotificationService notifications) {
        this.payments = payments;
        this.notifications = notifications;
    }

    /** Huỷ booking, nhả chỗ, xử lý tiền. refundPercent áp dụng cho payment đã PAID. Trả số tiền hoàn. */
    public long cancel(Booking b, String reason, int refundPercent, Instant now) {
        boolean wasConfirmed = b.getStatus() == com.tourbooking.domain.booking.BookingStatus.CONFIRMED;
        b.cancel(reason, now);
        b.getDeparture().releaseSeats(b.getTicketQuantity(), now);
        long refunded = settlePayments(b, refundPercent, reason);
        String money = !wasConfirmed ? "" : refunded > 0 ? " Số tiền hoàn: " + vnd(refunded) + "." : " Đơn không đủ điều kiện hoàn tiền theo chính sách.";
        notifications.notify(b.getUser().getId(), b.getId(), "Đơn " + b.getBookingCode() + " đã huỷ",
                "Lý do: " + reason + "." + money);
        return refunded;
    }

    public void expire(Booking b, Instant now) {
        b.expire(now);
        b.getDeparture().releaseSeats(b.getTicketQuantity(), now);
        settlePayments(b, 100, "Quá hạn thanh toán");
        notifications.notify(b.getUser().getId(), b.getId(), "Đơn " + b.getBookingCode() + " đã hết hạn",
                "Đơn chưa được thanh toán trong thời gian giữ chỗ nên hệ thống đã huỷ và nhả chỗ.");
    }

    private long settlePayments(Booking b, int refundPercent, String reason) {
        long refunded = 0;
        for (Long paymentId : payments.findIdsByBookingId(b.getId())) {
            Payment locked = payments.findByIdForUpdate(paymentId).orElseThrow();
            if (locked.getStatus() == PaymentStatus.PENDING) {
                locked.cancel(reason);
            } else if (locked.getStatus() == PaymentStatus.PAID && refundPercent > 0) {
                long amount = RefundPolicy.amount(locked.getAmount(), refundPercent);
                locked.refund(amount, reason + " — hoàn " + refundPercent + "%");
                refunded += amount;
            }
        }
        return refunded;
    }

    public static String vnd(long amount) { return String.format("%,d", amount).replace(',', '.') + " ₫"; }
}
