package com.tourbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.tourbooking.domain.user.Role;
import java.time.Duration;
import org.junit.jupiter.api.Test;

/** Luồng đầu–cuối: đặt → thanh toán → HDV bắt đầu/kết thúc → khách đánh giá (một lần). */
class GuideAndReviewFlowIT extends IntegrationTestBase {

    @Test
    void full_trip_from_booking_to_review() {
        var guideUser = newUser(Role.TOUR_GUIDE);
        var otherGuide = newUser(Role.TOUR_GUIDE);
        var dep = newDeparture(10, guideUser.getId(), Duration.ofHours(12));
        String customer = login(newUser(Role.CUSTOMER));
        long bookingId = createBooking(customer, dep.getId(), 2);

        // Chưa hoàn thành tour thì không được đánh giá
        var early = post("/api/v1/reviews", customer, "{\"bookingId\":" + bookingId + ",\"rating\":5,\"content\":\"Rất tuyệt vời, sẽ quay lại\"}");
        assertThat(early.getStatusCode().value()).isEqualTo(422);

        long p = post("/api/v1/bookings/" + bookingId + "/payment", customer, null).getBody().path("data").path("id").asLong();
        post("/api/v1/payments/mock/" + p + "/complete", customer, "{\"result\":\"SUCCESS\"}");

        String guide = login(guideUser);
        assertThat(post("/api/v1/guide/departures/" + dep.getId() + "/start", login(otherGuide), null).getStatusCode().value()).isEqualTo(403);
        JsonNode detail = get("/api/v1/guide/departures/" + dep.getId(), guide).getBody().path("data");
        assertThat(detail.path("passengers").size()).isEqualTo(1);
        assertThat(detail.path("passengers").get(0).has("email")).isFalse();

        assertThat(post("/api/v1/guide/departures/" + dep.getId() + "/finish", guide, null).getStatusCode().value()).isEqualTo(409);
        assertThat(post("/api/v1/guide/departures/" + dep.getId() + "/start", guide, null).getStatusCode().value()).isEqualTo(200);
        assertThat(post("/api/v1/guide/departures/" + dep.getId() + "/finish", guide, null).getStatusCode().value()).isEqualTo(200);

        JsonNode booking = get("/api/v1/bookings/" + bookingId, customer).getBody().path("data");
        assertThat(booking.path("status").asText()).isEqualTo("COMPLETED");
        assertThat(booking.path("canReview").asBoolean()).isTrue();

        var review = post("/api/v1/reviews", customer, "{\"bookingId\":" + bookingId + ",\"rating\":5,\"content\":\"Rất tuyệt vời, sẽ quay lại\"}");
        assertThat(review.getStatusCode().value()).isEqualTo(201);
        var again = post("/api/v1/reviews", customer, "{\"bookingId\":" + bookingId + ",\"rating\":4,\"content\":\"Đánh giá lần hai nè\"}");
        assertThat(again.getBody().path("code").asText()).isEqualTo("ALREADY_REVIEWED");

        JsonNode tour = get("/api/v1/tours/" + dep.getTour().getId(), null).getBody().path("data");
        assertThat(tour.path("ratingCount").asInt()).isEqualTo(1);
        assertThat(get("/api/v1/notifications/unread-count", customer).getBody().path("data").path("count").asInt()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void guide_cannot_be_assigned_to_overlapping_departures() {
        var guideUser = newUser(Role.TOUR_GUIDE);
        var first = newDeparture(10, guideUser.getId(), Duration.ofDays(20));
        String manager = login(newUser(Role.TOUR_MANAGER));
        String body = "{\"startAt\":\"" + first.getStartAt().plus(Duration.ofHours(2)) + "\",\"endAt\":\"" + first.getEndAt().plus(Duration.ofHours(2))
                + "\",\"capacity\":10,\"tourGuideId\":" + guideUser.getId() + "}";
        var res = post("/api/v1/tours/" + first.getTour().getId() + "/departures", manager, body);
        assertThat(res.getStatusCode().value()).isEqualTo(409);
    }

    @Test
    void cancelling_departure_cancels_bookings_and_refunds_in_full() {
        var dep = newDeparture(10, null, Duration.ofDays(2));
        String customer = login(newUser(Role.CUSTOMER));
        long bookingId = createBooking(customer, dep.getId(), 1);
        long p = post("/api/v1/bookings/" + bookingId + "/payment", customer, null).getBody().path("data").path("id").asLong();
        post("/api/v1/payments/mock/" + p + "/complete", customer, "{\"result\":\"SUCCESS\"}");

        String manager = login(newUser(Role.TOUR_MANAGER));
        var res = call(org.springframework.http.HttpMethod.PUT, "/api/v1/departures/" + dep.getId() + "/cancel", manager, "{\"reason\":\"Bão\"}");
        assertThat(res.getBody().path("data").path("status").asText()).isEqualTo("CANCELLED");
        JsonNode b = get("/api/v1/bookings/" + bookingId, customer).getBody().path("data");
        assertThat(b.path("status").asText()).isEqualTo("CANCELLED");
        assertThat(b.path("bill").path("payments").get(0).path("refundAmount").asLong()).isEqualTo(1_000_000);
    }
}
