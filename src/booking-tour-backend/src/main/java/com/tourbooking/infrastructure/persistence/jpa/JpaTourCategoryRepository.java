package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.tour.TourCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaTourCategoryRepository extends JpaRepository<TourCategory, Long> {
    boolean existsByNameIgnoreCase(String name);
}
