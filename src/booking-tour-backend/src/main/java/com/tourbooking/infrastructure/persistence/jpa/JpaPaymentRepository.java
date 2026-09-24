package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.payment.Payment;
import com.tourbooking.domain.payment.PaymentStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaPaymentRepository extends JpaRepository<Payment, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    List<Payment> findByBillIdOrderByCreatedAtAsc(Long billId);

    @Query("select p from Payment p where p.bill.booking.id = :bookingId order by p.createdAt")
    List<Payment> findByBookingId(@Param("bookingId") Long bookingId);

    boolean existsByTransactionCode(String code);

    /** Projection — xem ghi chú ở JpaBookingRepository.findDepartureId. */
    @Query("select p.bill.booking.id from Payment p where p.id = :id")
    Optional<Long> findBookingId(@Param("id") Long id);

    @Query("select p.id from Payment p where p.bill.booking.id = :bookingId order by p.createdAt")
    List<Long> findIdsByBookingId(@Param("bookingId") Long bookingId);

    @Query("select p.amount from Payment p where p.id = :id")
    Optional<Long> findAmount(@Param("id") Long id);

    @Query("select p from Payment p where (:status is null or p.status = :status) order by p.createdAt desc")
    Page<Payment> search(@Param("status") PaymentStatus status, Pageable pageable);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.status in ('PAID','REFUNDED')")
    long sumCollected();

    @Query("select coalesce(sum(p.refundAmount), 0) from Payment p where p.status = 'REFUNDED'")
    long sumRefunded();
}
