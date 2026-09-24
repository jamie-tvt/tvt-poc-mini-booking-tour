package com.tourbooking.domain.booking;

import com.tourbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** SRS 9.3 + EXPIRED (mentor bổ sung cho booking quá hạn thanh toán). */
public enum BookingStatus {
    PENDING, CONFIRMED, COMPLETED, CANCELLED, EXPIRED;

    public static final StateMachine<BookingStatus> MACHINE = new StateMachine<>("Đơn đặt tour", Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED, EXPIRED),
            CONFIRMED, Set.of(COMPLETED, CANCELLED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of(),
            EXPIRED, Set.of()));

    public boolean holdsSeats() { return this == PENDING || this == CONFIRMED; }
}
