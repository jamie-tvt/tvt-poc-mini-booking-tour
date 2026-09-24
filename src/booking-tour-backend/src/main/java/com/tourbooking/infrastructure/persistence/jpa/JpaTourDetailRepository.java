package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.tour.TourDetail;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaTourDetailRepository extends JpaRepository<TourDetail, Long> {
    List<TourDetail> findByTourIdOrderByDisplayOrder(Long tourId);

    @Modifying(flushAutomatically = true)
    @Query("delete from TourDetail d where d.tourId = :tourId")
    void deleteByTourId(@Param("tourId") Long tourId);

    boolean existsByPlaceId(Long placeId);
}
