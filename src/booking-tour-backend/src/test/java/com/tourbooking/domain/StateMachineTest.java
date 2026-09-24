package com.tourbooking.domain;

import static org.assertj.core.api.Assertions.*;

import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.payment.PaymentStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class StateMachineTest {

    @ParameterizedTest
    @CsvSource({"PENDING,CONFIRMED,true", "PENDING,EXPIRED,true", "PENDING,CANCELLED,true", "CONFIRMED,COMPLETED,true",
            "CONFIRMED,CANCELLED,true", "PENDING,COMPLETED,false", "COMPLETED,CANCELLED,false", "EXPIRED,CONFIRMED,false",
            "CANCELLED,CONFIRMED,false", "CONFIRMED,EXPIRED,false"})
    void booking_transitions_follow_SRS_9_3(BookingStatus from, BookingStatus to, boolean allowed) {
        assertThat(BookingStatus.MACHINE.can(from, to)).isEqualTo(allowed);
    }

    @Test
    void paid_payment_can_only_be_refunded() {
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.PAID, PaymentStatus.REFUNDED)).isTrue();
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.PAID, PaymentStatus.FAILED)).isFalse();
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.PAID, PaymentStatus.CANCELLED)).isFalse();
    }

    @Test
    void departure_cannot_reopen_after_completion() {
        assertThatThrownBy(() -> DepartureStatus.MACHINE.assertTransition(DepartureStatus.COMPLETED, DepartureStatus.OPEN))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.INVALID_TRANSITION));
    }
}
