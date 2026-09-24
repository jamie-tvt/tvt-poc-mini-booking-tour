package com.tourbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.tourbooking.application.booking.BookingService;
import com.tourbooking.domain.user.Role;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Bất biến: booked_seats của đợt = tổng vé các booking đang giữ chỗ (PENDING/CONFIRMED),
 * kể cả khi job hết hạn nhả chỗ đúng lúc khách khác đặt cùng đợt (tái hiện lỗi "nạp entity rồi mới khoá").
 */
class SeatInvariantIT extends IntegrationTestBase {
    @Autowired BookingService bookingService;
    @Autowired JdbcTemplate jdbc;

    @Test
    void expiry_and_new_bookings_racing_keep_seat_counter_consistent() throws Exception {
        var dep = newDeparture(12, null, Duration.ofDays(10));
        for (int i = 0; i < 6; i++) createBooking(login(newUser(Role.CUSTOMER)), dep.getId(), 1);
        clock.setOffsetMinutes(16);                       // 6 đơn trên đã quá hạn
        List<String> newcomers = new ArrayList<>();
        for (int i = 0; i < 6; i++) newcomers.add(login(newUser(Role.CUSTOMER)));
        List<Long> overdue = bookingService.overdueIds();

        ExecutorService pool = Executors.newFixedThreadPool(12);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> fs = new ArrayList<>();
        for (Long id : overdue) fs.add(pool.submit(() -> { go.await(); return bookingService.expireOne(id); }));
        for (String t : newcomers) fs.add(pool.submit(() -> {
            go.await();
            return post("/api/v1/bookings", t, "{\"departureId\":" + dep.getId() + ",\"adultQuantity\":1,\"childQuantity\":0}").getStatusCode().value();
        }));
        go.countDown();
        for (Future<?> f : fs) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        Integer booked = jdbc.queryForObject("select booked_seats from tour_departures where id = ?", Integer.class, dep.getId());
        Integer held = jdbc.queryForObject(
                "select coalesce(sum(ticket_quantity),0) from bookings where tour_departure_id = ? and status in ('PENDING','CONFIRMED')",
                Integer.class, dep.getId());
        assertThat(booked).isEqualTo(held);
        assertThat(jdbc.queryForObject("select count(*) from bookings where tour_departure_id = ? and status = 'EXPIRED'",
                Integer.class, dep.getId())).isGreaterThanOrEqualTo(overdue.size() > 0 ? 1 : 0);
    }
}
