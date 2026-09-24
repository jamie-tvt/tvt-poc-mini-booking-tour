package com.tourbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.tourbooking.application.booking.BookingExpiryJob;
import com.tourbooking.domain.user.Role;
import com.tourbooking.infrastructure.integration.mockgateway.MockPaymentGateway;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDepartureRepository;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PaymentAndExpiryIT extends IntegrationTestBase {
    @Autowired MockPaymentGateway gateway;
    @Autowired BookingExpiryJob expiryJob;
    @Autowired JpaTourDepartureRepository departureRepo;

    @Test
    void webhook_rejects_bad_signature_and_is_idempotent() {
        var dep = newDeparture(10, null, Duration.ofDays(10));
        String t = login(newUser(Role.CUSTOMER));
        long bookingId = createBooking(t, dep.getId(), 2);
        JsonNode payment = post("/api/v1/bookings/" + bookingId + "/payment", t, null).getBody().path("data");
        long paymentId = payment.path("id").asLong();
        assertThat(payment.path("checkoutUrl").asText()).endsWith("/pay/mock/" + paymentId);

        String[] signed = gateway.buildSignedEvent(paymentId, payment.path("amount").asLong(), true);
        var forged = postRaw("/api/v1/payments/webhook/mock", signed[0], "X-Mock-Signature", "deadbeef");
        assertThat(forged.getStatusCode().value()).isEqualTo(401);
        assertThat(forged.getBody().path("code").asText()).isEqualTo("INVALID_SIGNATURE");
        assertThat(get("/api/v1/bookings/" + bookingId, t).getBody().path("data").path("status").asText()).isEqualTo("PENDING");

        assertThat(postRaw("/api/v1/payments/webhook/mock", signed[0], "X-Mock-Signature", signed[1]).getStatusCode().value()).isEqualTo(200);
        // Cổng gửi lại đúng sự kiện đó → 200, không xử lý lần hai
        assertThat(postRaw("/api/v1/payments/webhook/mock", signed[0], "X-Mock-Signature", signed[1]).getStatusCode().value()).isEqualTo(200);

        JsonNode booking = get("/api/v1/bookings/" + bookingId, t).getBody().path("data");
        assertThat(booking.path("status").asText()).isEqualTo("CONFIRMED");
        assertThat(booking.path("paymentStatus").asText()).isEqualTo("PAID");
        assertThat(booking.path("bill").path("payments").size()).isEqualTo(1);
        assertThat(booking.path("refundPreview").path("percent").asInt()).isEqualTo(100);
    }

    @Test
    void failed_payment_can_be_retried_before_expiry() {
        var dep = newDeparture(10, null, Duration.ofDays(10));
        String t = login(newUser(Role.CUSTOMER));
        long bookingId = createBooking(t, dep.getId(), 1);
        long p1 = post("/api/v1/bookings/" + bookingId + "/payment", t, null).getBody().path("data").path("id").asLong();
        post("/api/v1/payments/mock/" + p1 + "/complete", t, "{\"result\":\"FAILED\"}");
        JsonNode b = get("/api/v1/bookings/" + bookingId, t).getBody().path("data");
        assertThat(b.path("status").asText()).isEqualTo("PENDING");
        assertThat(b.path("canPay").asBoolean()).isTrue();

        long p2 = post("/api/v1/bookings/" + bookingId + "/payment", t, null).getBody().path("data").path("id").asLong();
        assertThat(p2).isNotEqualTo(p1);
        post("/api/v1/payments/mock/" + p2 + "/complete", t, "{\"result\":\"SUCCESS\"}");
        assertThat(get("/api/v1/bookings/" + bookingId, t).getBody().path("data").path("status").asText()).isEqualTo("CONFIRMED");
    }

    @Test
    void unpaid_booking_expires_and_releases_seats() {
        var dep = newDeparture(5, null, Duration.ofDays(10));
        String t = login(newUser(Role.CUSTOMER));
        long bookingId = createBooking(t, dep.getId(), 3);
        assertThat(departureRepo.findById(dep.getId()).orElseThrow().getBookedSeats()).isEqualTo(3);

        clock.setOffsetMinutes(16);   // quá hạn 15 phút
        expiryJob.run();

        JsonNode b = get("/api/v1/bookings/" + bookingId, t).getBody().path("data");
        assertThat(b.path("status").asText()).isEqualTo("EXPIRED");
        assertThat(b.path("canPay").asBoolean()).isFalse();
        assertThat(departureRepo.findById(dep.getId()).orElseThrow().getBookedSeats()).isZero();
        var pay = post("/api/v1/bookings/" + bookingId + "/payment", t, null);
        assertThat(pay.getStatusCode().value()).isEqualTo(422);
    }

    @Test
    void cancel_confirmed_booking_refunds_by_policy() {
        var dep = newDeparture(10, null, Duration.ofDays(5));   // còn 5 ngày → hoàn 50%
        String t = login(newUser(Role.CUSTOMER));
        long bookingId = createBooking(t, dep.getId(), 2);
        long p = post("/api/v1/bookings/" + bookingId + "/payment", t, null).getBody().path("data").path("id").asLong();
        post("/api/v1/payments/mock/" + p + "/complete", t, "{\"result\":\"SUCCESS\"}");

        JsonNode cancelled = post("/api/v1/bookings/" + bookingId + "/cancel", t, "{\"reason\":\"Bận việc\"}").getBody().path("data");
        assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");
        assertThat(cancelled.path("bill").path("payments").get(0).path("status").asText()).isEqualTo("REFUNDED");
        assertThat(cancelled.path("bill").path("payments").get(0).path("refundAmount").asLong()).isEqualTo(1_000_000);
        assertThat(departureRepo.findById(dep.getId()).orElseThrow().getBookedSeats()).isZero();
    }
}
