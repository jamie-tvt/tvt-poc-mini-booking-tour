package com.tourbooking.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.tourbooking.domain.booking.RefundPolicy;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RefundPolicyTest {
    private final RefundPolicy policy = new RefundPolicy(7, 3, 50);
    private final Instant now = Instant.parse("2026-10-01T00:00:00Z");

    @ParameterizedTest(name = "còn {0} giờ → hoàn {1}%")
    @CsvSource({"480,100", "168,100", "167,50", "72,50", "71,0", "1,0"})
    void percent_depends_on_hours_before_departure(long hours, int expected) {
        assertThat(policy.percentFor(now, now.plus(Duration.ofHours(hours)))).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"1300000,100,1300000", "1300000,50,650000", "1300000,0,0", "999,50,499"})
    void amount_rounds_down_to_whole_dong(long paid, int percent, long expected) {
        assertThat(RefundPolicy.amount(paid, percent)).isEqualTo(expected);
    }
}
