package com.tourbooking.domain.review;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reviews")
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @org.hibernate.annotations.Formula("(select u.full_name from users u where u.id = user_id)")
    private String userName;
    @Column(name = "tour_id", nullable = false)
    private Long tourId;
    @Column(name = "booking_id", nullable = false, unique = true)
    private Long bookingId;
    @Column(nullable = false)
    private int rating;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewStatus status;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Review() {}
    public Review(Long userId, Long tourId, Long bookingId, int rating, String content, Instant now) {
        this.userId = userId; this.tourId = tourId; this.bookingId = bookingId;
        this.rating = rating; this.content = content; this.status = ReviewStatus.VISIBLE;
        this.createdAt = now; this.updatedAt = now;
    }

    public void setVisibility(ReviewStatus status, Instant now) { this.status = status; this.updatedAt = now; }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public Long getTourId() { return tourId; }
    public Long getBookingId() { return bookingId; }
    public int getRating() { return rating; }
    public String getContent() { return content; }
    public ReviewStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
