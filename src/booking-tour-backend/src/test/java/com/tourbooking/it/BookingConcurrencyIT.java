package com.tourbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.tourbooking.domain.user.Role;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDepartureRepository;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** SRS 8.1/8.8: nhiều người cùng đặt chỗ cuối — chỉ đúng một người thành công. */
class BookingConcurrencyIT extends IntegrationTestBase {
    @Autowired JpaTourDepartureRepository departureRepo;

    @Test
    void ten_customers_race_for_the_last_seat_only_one_wins() throws Exception {
        var dep = newDeparture(1, null, Duration.ofDays(10));
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < 10; i++) tokens.add(login(newUser(Role.CUSTOMER)));

        ExecutorService pool = Executors.newFixedThreadPool(10);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (String t : tokens) {
            results.add(pool.submit(() -> {
                go.await();
                return post("/api/v1/bookings", t, "{\"departureId\":" + dep.getId() + ",\"adultQuantity\":1,\"childQuantity\":0}")
                        .getStatusCode().value();
            }));
        }
        go.countDown();
        List<Integer> codes = new ArrayList<>();
        for (Future<Integer> f : results) codes.add(f.get(30, TimeUnit.SECONDS));
        pool.shutdown();

        assertThat(codes).filteredOn(c -> c == 201).hasSize(1);
        assertThat(codes).filteredOn(c -> c == 409).hasSize(9);
        assertThat(departureRepo.findById(dep.getId()).orElseThrow().getBookedSeats()).isEqualTo(1);
    }

    @Test
    void booking_more_than_available_returns_DEPARTURE_FULL_with_remaining_seats() {
        var dep = newDeparture(3, null, Duration.ofDays(10));
        String t = login(newUser(Role.CUSTOMER));
        var res = post("/api/v1/bookings", t, "{\"departureId\":" + dep.getId() + ",\"adultQuantity\":4,\"childQuantity\":0}");
        assertThat(res.getStatusCode().value()).isEqualTo(409);
        assertThat(res.getBody().path("code").asText()).isEqualTo("DEPARTURE_FULL");
        assertThat(res.getBody().path("message").asText()).contains("3 chỗ");
    }
}
