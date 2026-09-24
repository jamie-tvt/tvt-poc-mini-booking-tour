package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.review.Review;
import com.tourbooking.domain.review.ReviewStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByBookingId(Long bookingId);
    Page<Review> findByTourIdAndStatusOrderByCreatedAtDesc(Long tourId, ReviewStatus status, Pageable pageable);
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** [tourId, avg, count] cho các review đang hiển thị. */
    @Query("select r.tourId, avg(r.rating), count(r) from Review r where r.status = 'VISIBLE' and r.tourId in :tourIds group by r.tourId")
    List<Object[]> ratingStats(@Param("tourIds") Collection<Long> tourIds);
}
