package com.tourbooking.domain.payment;

import com.tourbooking.domain.booking.Booking;
import jakarta.persistence.*;
import java.time.Instant;

/** Hoá đơn sinh cùng lúc với booking (số tiền phải trả). Mỗi booking một bill; bill có nhiều lần thanh toán. */
@Entity
@Table(name = "bills")
public class Bill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "booking_id", unique = true)
    private Booking booking;
    @Column(name = "bill_code", nullable = false, unique = true)
    private String billCode;
    @Column(nullable = false)
    private long amount;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Bill() {}
    public Bill(Booking booking, String billCode, long amount, Instant now) {
        this.booking = booking; this.billCode = billCode; this.amount = amount; this.createdAt = now;
    }

    public Long getId() { return id; }
    public Booking getBooking() { return booking; }
    public String getBillCode() { return billCode; }
    public long getAmount() { return amount; }
    public Instant getCreatedAt() { return createdAt; }
}
