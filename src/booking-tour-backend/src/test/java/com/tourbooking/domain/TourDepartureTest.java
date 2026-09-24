package com.tourbooking.domain;

import static org.assertj.core.api.Assertions.*;

import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.tour.Tour;
import com.tourbooking.domain.tour.TourCategory;
import com.tourbooking.domain.tour.TourStatus;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TourDepartureTest {
    private final Instant now = Instant.parse("2026-10-01T00:00:00Z");
    private TourDeparture dep;

    @BeforeEach
    void setUp() {
        Tour tour = new Tour("T-1", now);
        tour.update("T-1", "Tour", "Mô tả", "Cần Thơ", 1_000_000, 1, 10, null, new TourCategory("Cat"), now);
        tour.changeStatus(TourStatus.ACTIVE, now);
        dep = new TourDeparture(tour, now);
        dep.update(now.plus(Duration.ofDays(5)), now.plus(Duration.ofDays(6)), 3, 1_000_000, 700_000, null, now);
    }

    @Test
    void reserves_until_full_then_rejects_with_DEPARTURE_FULL() {
        dep.reserveSeats(2, now);
        dep.reserveSeats(1, now);
        assertThat(dep.availableSeats()).isZero();
        assertThatThrownBy(() -> dep.reserveSeats(1, now))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.DEPARTURE_FULL));
    }

    @Test
    void price_uses_adult_and_child_price_of_departure() {
        assertThat(dep.priceFor(2, 1)).isEqualTo(2_700_000);
    }

    @Test
    void cannot_book_after_departure_started() {
        assertThatThrownBy(() -> dep.reserveSeats(1, now.plus(Duration.ofDays(5))))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.BUSINESS_RULE));
    }

    @Test
    void capacity_cannot_drop_below_booked_seats() {
        dep.reserveSeats(2, now);
        assertThatThrownBy(() -> dep.update(dep.getStartAt(), dep.getEndAt(), 1, 1, 1, null, now)).isInstanceOf(BusinessException.class);
    }
}
