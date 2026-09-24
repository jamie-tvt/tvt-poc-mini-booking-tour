package com.tourbooking.application.admin;

import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.tour.TourStatus;
import com.tourbooking.domain.user.Role;
import com.tourbooking.infrastructure.persistence.jpa.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    public record Dashboard(Map<String, Long> tours, Map<String, Long> departures, Map<String, Long> bookings,
                            Map<String, Long> revenue, Map<String, Long> users, List<Booking> recentBookings) {}

    private final JpaTourRepository tours;
    private final JpaTourDepartureRepository departures;
    private final JpaBookingRepository bookings;
    private final JpaPaymentRepository payments;
    private final JpaUserRepository users;
    private final TimeProvider time;

    public DashboardService(JpaTourRepository tours, JpaTourDepartureRepository departures, JpaBookingRepository bookings,
                            JpaPaymentRepository payments, JpaUserRepository users, TimeProvider time) {
        this.tours = tours;
        this.departures = departures;
        this.bookings = bookings;
        this.payments = payments;
        this.users = users;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public Dashboard build() {
        Map<String, Long> b = new LinkedHashMap<>();
        for (BookingStatus s : BookingStatus.values()) b.put(s.name(), bookings.countByStatus(s));
        long collected = payments.sumCollected();
        long refunded = payments.sumRefunded();
        return new Dashboard(
                Map.of("total", tours.count(), "active", tours.countByStatus(TourStatus.ACTIVE)),
                Map.of("upcoming", departures.countUpcoming(time.now()), "inProgress", departures.countByStatus(DepartureStatus.IN_PROGRESS)),
                b,
                Map.of("paid", collected - refunded, "refunded", refunded),
                Map.of("total", users.count(), "customers", users.countByRoleName(Role.CUSTOMER.name())),
                bookings.search(null, null, null, PageRequest.of(0, 8)).getContent());
    }
}
