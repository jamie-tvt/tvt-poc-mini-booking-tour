package com.tourbooking.application.review;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.review.Review;
import com.tourbooking.domain.review.ReviewStatus;
import com.tourbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaReviewRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** SRS 4.9 + 9.7: chỉ khách đã hoàn thành tour mới đánh giá; mỗi booking một đánh giá (UNIQUE ở DB). */
@Service
public class ReviewService {
    private final JpaReviewRepository reviews;
    private final JpaBookingRepository bookings;
    private final AuditService audit;
    private final TimeProvider time;

    public ReviewService(JpaReviewRepository reviews, JpaBookingRepository bookings, AuditService audit, TimeProvider time) {
        this.reviews = reviews;
        this.bookings = bookings;
        this.audit = audit;
        this.time = time;
    }

    @Transactional
    public Review create(Long userId, Long bookingId, int rating, String content) {
        Booking b = bookings.findById(bookingId).filter(x -> x.isOwnedBy(userId))
                .orElseThrow(() -> BusinessException.notFound("đơn đặt tour"));
        if (b.getStatus() != BookingStatus.COMPLETED) throw BusinessException.rule("Bạn chỉ đánh giá được sau khi hoàn thành chuyến đi");
        if (reviews.existsByBookingId(bookingId)) throw new BusinessException(ErrorCode.ALREADY_REVIEWED, "Bạn đã đánh giá chuyến đi này");
        Review r = reviews.save(new Review(userId, b.getDeparture().getTour().getId(), bookingId, rating, content.trim(), time.now()));
        audit.log(userId, "CREATE", "review", r.getId(), "rating=" + rating);
        return r;
    }

    @Transactional(readOnly = true)
    public Page<Review> forTour(Long tourId, Pageable pageable) {
        return reviews.findByTourIdAndStatusOrderByCreatedAtDesc(tourId, ReviewStatus.VISIBLE, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Review> all(Pageable pageable) { return reviews.findAllByOrderByCreatedAtDesc(pageable); }

    @Transactional
    public Review setVisibility(Long id, ReviewStatus status, Long actorId) {
        Review r = reviews.findById(id).orElseThrow(() -> BusinessException.notFound("đánh giá"));
        r.setVisibility(status, time.now());
        audit.log(actorId, status == ReviewStatus.HIDDEN ? "HIDE" : "SHOW", "review", id, null);
        return r;
    }

    @Transactional(readOnly = true)
    public boolean hasReview(Long bookingId) { return reviews.existsByBookingId(bookingId); }
}
