package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.tour.Tour;
import com.tourbooking.domain.tour.TourStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JpaTourRepository extends JpaRepository<Tour, Long>, JpaSpecificationExecutor<Tour> {
    boolean existsByTourCodeIgnoreCase(String code);
    boolean existsByCategoryId(Long categoryId);
    long countByStatus(TourStatus status);
}
