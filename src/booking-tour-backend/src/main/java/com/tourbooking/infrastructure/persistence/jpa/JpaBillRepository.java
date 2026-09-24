package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.payment.Bill;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaBillRepository extends JpaRepository<Bill, Long> {
    Optional<Bill> findByBookingId(Long bookingId);
}
