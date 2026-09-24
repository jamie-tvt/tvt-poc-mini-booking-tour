package com.tourbooking.domain.payment;

import com.tourbooking.domain.common.StateMachine;
import java.util.Map;
import java.util.Set;

/** SRS 9.5 + FAILED (SRS 9.9 có nhắc "thanh toán thất bại" nhưng thiếu trạng thái). */
public enum PaymentStatus {
    PENDING, PAID, FAILED, REFUNDED, CANCELLED;

    public static final StateMachine<PaymentStatus> MACHINE = new StateMachine<>("Thanh toán", Map.of(
            PENDING, Set.of(PAID, FAILED, CANCELLED),
            PAID, Set.of(REFUNDED),       // SRS 9.5: giao dịch thành công không được đổi thành thất bại
            FAILED, Set.of(),
            REFUNDED, Set.of(),
            CANCELLED, Set.of()));
}
