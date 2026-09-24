package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.departure.TourDeparture;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaTourDepartureRepository extends JpaRepository<TourDeparture, Long> {

    /** SELECT ... FOR UPDATE — hai giao dịch đặt cùng đợt phải xếp hàng, không thể cùng thấy "còn 1 chỗ". */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from TourDeparture d where d.id = :id")
    Optional<TourDeparture> findByIdForUpdate(@Param("id") Long id);

    List<TourDeparture> findByTourIdOrderByStartAtAsc(Long tourId);

    @Query("select d from TourDeparture d where d.tour.id = :tourId and d.status = 'OPEN' and d.startAt > :now order by d.startAt")
    List<TourDeparture> findOpenUpcoming(@Param("tourId") Long tourId, @Param("now") Instant now);

    @Query("select d from TourDeparture d where d.tour.id in :tourIds and d.status = 'OPEN' and d.startAt > :now order by d.startAt")
    List<TourDeparture> findOpenUpcomingForTours(@Param("tourIds") Collection<Long> tourIds, @Param("now") Instant now);

    @Query("select d from TourDeparture d where d.tourGuide.id = :guideId and (:status is null or d.status = :status) order by d.startAt")
    List<TourDeparture> findByGuide(@Param("guideId") Long guideId, @Param("status") DepartureStatus status);

    @Query("""
            select d from TourDeparture d where d.tourGuide.id = :guideId and d.id <> :excludeId
              and d.status in ('OPEN','IN_PROGRESS') and d.startAt < :end and :start < d.endAt
            """)
    List<TourDeparture> findGuideOverlaps(@Param("guideId") Long guideId, @Param("excludeId") Long excludeId,
                                          @Param("start") Instant start, @Param("end") Instant end);

    long countByTourId(Long tourId);
    long countByStatus(DepartureStatus status);

    @Query("select count(d) from TourDeparture d where d.status = 'OPEN' and d.startAt > :now")
    long countUpcoming(@Param("now") Instant now);
}
