package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.tour.TourImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaTourImageRepository extends JpaRepository<TourImage, Long> {
    List<TourImage> findByTourIdOrderBySortOrderAscIdAsc(Long tourId);
}
