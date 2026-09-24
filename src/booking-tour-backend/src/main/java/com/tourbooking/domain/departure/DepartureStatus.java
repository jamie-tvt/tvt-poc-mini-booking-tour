package com.tourbooking.domain.departure;

import com.tourbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** SRS 9.4 — gộp 3 bộ tên trạng thái trong SRS thành một enum. */
public enum DepartureStatus {
    OPEN, IN_PROGRESS, COMPLETED, CANCELLED;

    public static final StateMachine<DepartureStatus> MACHINE = new StateMachine<>("Đợt khởi hành", Map.of(
            OPEN, Set.of(IN_PROGRESS, CANCELLED),
            IN_PROGRESS, Set.of(COMPLETED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of()));
}
