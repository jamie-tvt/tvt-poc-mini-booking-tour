package com.tourbooking.domain.booking;

import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "booking_code", nullable = false, unique = true)
    private String bookingCode;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id")
    private User user;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tour_departure_id")
    private TourDeparture departure;
    @Column(name = "adult_quantity", nullable = false)
    private int adultQuantity;
    @Column(name = "child_quantity", nullable = false)
    private int childQuantity;
    @Column(name = "ticket_quantity", nullable = false)
    private int ticketQuantity;
    @Column(name = "total_price", nullable = false)
    private long totalPrice;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;
    @Column(name = "booked_at", nullable = false)
    private Instant bookedAt;
    @Column(name = "expires_at")
    private Instant expiresAt;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Column(name = "cancel_reason")
    private String cancelReason;
    @Column(name = "completed_at")
    private Instant completedAt;

    protected Booking() {}

    public Booking(String bookingCode, User user, TourDeparture departure, int adults, int children, Instant now, Instant expiresAt) {
        this.bookingCode = bookingCode;
        this.user = user;
        this.departure = departure;
        this.adultQuantity = adults;
        this.childQuantity = children;
        this.ticketQuantity = adults + children;
        this.totalPrice = departure.priceFor(adults, children);   // SRS 8.8: giá tại thời điểm đặt
        this.status = BookingStatus.PENDING;                       // SRS 9.3: booking mới luôn PENDING
        this.bookedAt = now;
        this.expiresAt = expiresAt;
    }

    public boolean isPaymentOverdue(Instant now) { return status == BookingStatus.PENDING && expiresAt != null && !expiresAt.isAfter(now); }

    public void confirm() {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.CONFIRMED);
        status = BookingStatus.CONFIRMED;
        expiresAt = null;
    }

    public void complete(Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.COMPLETED);
        status = BookingStatus.COMPLETED;
        completedAt = now;
    }

    public void cancel(String reason, Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.CANCELLED);
        status = BookingStatus.CANCELLED;
        cancelledAt = now;
        cancelReason = reason;
        expiresAt = null;
    }

    public void expire(Instant now) {
        BookingStatus.MACHINE.assertTransition(status, BookingStatus.EXPIRED);
        status = BookingStatus.EXPIRED;
        cancelledAt = now;
        cancelReason = "Quá hạn thanh toán";
    }

    public boolean isOwnedBy(Long userId) { return user.getId().equals(userId); }

    /** Chỉ dùng cho dữ liệu mẫu lịch sử (seed). */
    public void seedState(BookingStatus status, Instant bookedAt, Instant completedAt) {
        this.status = status; this.bookedAt = bookedAt; this.completedAt = completedAt; this.expiresAt = null;
    }

    public Long getId() { return id; }
    public String getBookingCode() { return bookingCode; }
    public User getUser() { return user; }
    public TourDeparture getDeparture() { return departure; }
    public int getAdultQuantity() { return adultQuantity; }
    public int getChildQuantity() { return childQuantity; }
    public int getTicketQuantity() { return ticketQuantity; }
    public long getTotalPrice() { return totalPrice; }
    public BookingStatus getStatus() { return status; }
    public Instant getBookedAt() { return bookedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCancelledAt() { return cancelledAt; }
    public String getCancelReason() { return cancelReason; }
    public Instant getCompletedAt() { return completedAt; }
}
