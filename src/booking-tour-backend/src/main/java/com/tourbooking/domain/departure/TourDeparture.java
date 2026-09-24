package com.tourbooking.domain.departure;

import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.tour.Tour;
import com.tourbooking.domain.user.User;
import jakarta.persistence.*;
import java.time.Duration;
import java.time.Instant;

@Entity
@Table(name = "tour_departures")
public class TourDeparture {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tour_id")
    private Tour tour;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tour_guide_id")
    private User tourGuide;
    @Column(nullable = false)
    private int capacity;
    @Column(name = "booked_seats", nullable = false)
    private int bookedSeats;
    @Column(name = "adult_price", nullable = false)
    private long adultPrice;
    @Column(name = "child_price", nullable = false)
    private long childPrice;
    @Column(name = "start_at", nullable = false)
    private Instant startAt;
    @Column(name = "end_at", nullable = false)
    private Instant endAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DepartureStatus status;
    @Column(name = "cancel_reason")
    private String cancelReason;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TourDeparture() {}

    public TourDeparture(Tour tour, Instant now) {
        this.tour = tour;
        this.status = DepartureStatus.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(Instant startAt, Instant endAt, int capacity, long adultPrice, long childPrice, User guide, Instant now) {
        if (!endAt.isAfter(startAt)) throw BusinessException.rule("Thời gian kết thúc phải sau thời gian khởi hành");
        if (capacity < bookedSeats) throw BusinessException.rule("Sức chứa không được nhỏ hơn số chỗ đã đặt (" + bookedSeats + ")");
        if (bookedSeats > 0 && this.startAt != null && !this.startAt.equals(startAt)) {
            throw BusinessException.rule("Đợt đã có khách đặt nên không thể đổi ngày khởi hành (SRS UC-TDM-02 A3)");
        }
        if (status != DepartureStatus.OPEN && this.startAt != null) throw BusinessException.rule("Chỉ sửa được đợt đang mở bán");
        this.startAt = startAt;
        this.endAt = endAt;
        this.capacity = capacity;
        this.adultPrice = adultPrice;
        this.childPrice = childPrice;
        this.tourGuide = guide;
        this.updatedAt = now;
    }

    public int availableSeats() { return capacity - bookedSeats; }

    public boolean isBookable(Instant now) { return status == DepartureStatus.OPEN && startAt.isAfter(now) && tour.isPublic(); }

    /** Gọi khi đã khoá dòng (SELECT ... FOR UPDATE). */
    public void reserveSeats(int seats, Instant now) {
        if (!isBookable(now)) throw BusinessException.rule("Đợt khởi hành này không còn nhận đặt chỗ");
        if (seats > availableSeats()) {
            throw new BusinessException(ErrorCode.DEPARTURE_FULL,
                    availableSeats() == 0 ? "Đợt khởi hành đã hết chỗ" : "Chỉ còn " + availableSeats() + " chỗ cho đợt này");
        }
        bookedSeats += seats;
        updatedAt = now;
    }

    public void releaseSeats(int seats, Instant now) {
        bookedSeats = Math.max(0, bookedSeats - seats);
        updatedAt = now;
    }

    public long priceFor(int adults, int children) { return adultPrice * adults + childPrice * children; }

    public void start(Instant now, Duration window) {
        if (now.isBefore(startAt.minus(window))) throw BusinessException.rule("Chưa tới thời gian bắt đầu tour");
        DepartureStatus.MACHINE.assertTransition(status, DepartureStatus.IN_PROGRESS);
        status = DepartureStatus.IN_PROGRESS;
        updatedAt = now;
    }

    public void finish(Instant now) {
        DepartureStatus.MACHINE.assertTransition(status, DepartureStatus.COMPLETED);
        status = DepartureStatus.COMPLETED;
        updatedAt = now;
    }

    public void cancel(String reason, Instant now) {
        DepartureStatus.MACHINE.assertTransition(status, DepartureStatus.CANCELLED);
        status = DepartureStatus.CANCELLED;
        cancelReason = reason;
        updatedAt = now;
    }

    public boolean overlaps(Instant otherStart, Instant otherEnd) {
        return startAt.isBefore(otherEnd) && otherStart.isBefore(endAt);
    }

    /** Chỉ dùng cho dữ liệu mẫu lịch sử (seed). */
    public void seedState(DepartureStatus status, int bookedSeats) { this.status = status; this.bookedSeats = bookedSeats; }

    public Long getId() { return id; }
    public Tour getTour() { return tour; }
    public User getTourGuide() { return tourGuide; }
    public int getCapacity() { return capacity; }
    public int getBookedSeats() { return bookedSeats; }
    public long getAdultPrice() { return adultPrice; }
    public long getChildPrice() { return childPrice; }
    public Instant getStartAt() { return startAt; }
    public Instant getEndAt() { return endAt; }
    public DepartureStatus getStatus() { return status; }
    public String getCancelReason() { return cancelReason; }
}
