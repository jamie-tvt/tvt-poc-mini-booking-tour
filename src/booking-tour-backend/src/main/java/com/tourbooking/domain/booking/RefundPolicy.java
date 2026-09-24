package com.tourbooking.domain.booking;

import java.time.Duration;
import java.time.Instant;

/** Chính sách hoàn tiền khi khách huỷ (SRS 9.6 — số liệu do mentor chốt, lưu ở system_settings). */
public record RefundPolicy(int fullRefundDays, int partialRefundDays, int partialPercent) {

    public int percentFor(Instant now, Instant departureStart) {
        long days = Duration.between(now, departureStart).toDays();
        if (days >= fullRefundDays) return 100;
        if (days >= partialRefundDays) return partialPercent;
        return 0;
    }

    public static long amount(long paid, int percent) { return paid * percent / 100; }
}
