package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.tour.Place;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaPlaceRepository extends JpaRepository<Place, Long> {}
