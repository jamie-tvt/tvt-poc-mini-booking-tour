package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaBookingRepository extends JpaRepository<Booking, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    boolean existsByBookingCode(String code);

    /*
     * Truy vấn chỉ lấy id (projection) để biết cần khoá dòng nào mà KHÔNG nạp entity vào persistence context.
     * Nếu nạp entity trước rồi mới SELECT ... FOR UPDATE, Hibernate trả lại đúng instance cũ (dữ liệu trước khi khoá)
     * → ghi đè mất cập nhật của giao dịch khác (lost update).
     */
    @Query("select b.departure.id from Booking b where b.id = :id")
    Optional<Long> findDepartureId(@Param("id") Long id);

    @Query("select b.user.id from Booking b where b.id = :id")
    Optional<Long> findOwnerId(@Param("id") Long id);

    @Query("select b.id from Booking b where b.departure.id = :departureId and b.status in :statuses order by b.bookedAt")
    List<Long> findIdsByDepartureAndStatuses(@Param("departureId") Long departureId, @Param("statuses") List<BookingStatus> statuses);

    @Query("select b from Booking b where b.user.id = :userId and (:status is null or b.status = :status) order by b.bookedAt desc")
    Page<Booking> findMine(@Param("userId") Long userId, @Param("status") BookingStatus status, Pageable pageable);

    @Query("""
            select b from Booking b
            where (:status is null or b.status = :status)
              and (:departureId is null or b.departure.id = :departureId)
              and (:keyword is null or lower(b.bookingCode) like lower(concat('%', :keyword, '%'))
                   or lower(b.user.fullName) like lower(concat('%', :keyword, '%'))
                   or lower(b.departure.tour.title) like lower(concat('%', :keyword, '%')))
            order by b.bookedAt desc
            """)
    Page<Booking> search(@Param("status") BookingStatus status, @Param("departureId") Long departureId,
                         @Param("keyword") String keyword, Pageable pageable);

    @Query("select b.id from Booking b where b.status = 'PENDING' and b.expiresAt <= :now")
    List<Long> findOverdueIds(@Param("now") Instant now);

    @Query("select b from Booking b where b.departure.id = :departureId and b.status in :statuses order by b.bookedAt")
    List<Booking> findByDepartureAndStatuses(@Param("departureId") Long departureId, @Param("statuses") List<BookingStatus> statuses);

    long countByStatus(BookingStatus status);
    boolean existsByDepartureTourId(Long tourId);
}
