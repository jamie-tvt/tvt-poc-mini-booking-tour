package com.tourbooking.application.departure;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.application.booking.BookingLifecycle;
import com.tourbooking.application.systemsetting.SettingService;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.tour.Tour;
import com.tourbooking.domain.user.Role;
import com.tourbooking.domain.user.User;
import com.tourbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDepartureRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaUserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DepartureService {
    private final JpaTourDepartureRepository departures;
    private final JpaTourRepository tours;
    private final JpaUserRepository users;
    private final JpaBookingRepository bookings;
    private final BookingLifecycle lifecycle;
    private final SettingService settings;
    private final AuditService audit;
    private final TimeProvider time;

    public DepartureService(JpaTourDepartureRepository departures, JpaTourRepository tours, JpaUserRepository users,
                            JpaBookingRepository bookings, BookingLifecycle lifecycle, SettingService settings,
                            AuditService audit, TimeProvider time) {
        this.departures = departures;
        this.tours = tours;
        this.users = users;
        this.bookings = bookings;
        this.lifecycle = lifecycle;
        this.settings = settings;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public List<TourDeparture> forTour(Long tourId, boolean all) {
        return all ? departures.findByTourIdOrderByStartAtAsc(tourId) : departures.findOpenUpcoming(tourId, time.now());
    }

    @Transactional(readOnly = true)
    public TourDeparture get(Long id) { return departures.findById(id).orElseThrow(() -> BusinessException.notFound("đợt khởi hành")); }

    @Transactional
    public TourDeparture create(Long tourId, DepartureCommand c, Long actorId) {
        Tour tour = tours.findById(tourId).orElseThrow(() -> BusinessException.notFound("tour"));
        Instant now = time.now();
        if (!c.startAt().isAfter(now)) throw BusinessException.rule("Ngày khởi hành phải ở tương lai");
        if (c.capacity() > tour.getMaxGuests()) throw BusinessException.rule("Sức chứa vượt số khách tối đa của tour (" + tour.getMaxGuests() + ")");
        TourDeparture d = new TourDeparture(tour, now);
        apply(d, tour, c, null, now);
        d = departures.save(d);
        audit.log(actorId, "CREATE", "departure", d.getId(), tour.getTourCode() + " " + c.startAt());
        return d;
    }

    @Transactional
    public TourDeparture update(Long id, DepartureCommand c, Long actorId) {
        TourDeparture d = departures.findByIdForUpdate(id).orElseThrow(() -> BusinessException.notFound("đợt khởi hành"));
        if (c.capacity() > d.getTour().getMaxGuests()) throw BusinessException.rule("Sức chứa vượt số khách tối đa của tour (" + d.getTour().getMaxGuests() + ")");
        apply(d, d.getTour(), c, id, time.now());
        audit.log(actorId, "UPDATE", "departure", id, "guide=" + c.tourGuideId() + ", capacity=" + c.capacity());
        return d;
    }

    private void apply(TourDeparture d, Tour tour, DepartureCommand c, Long selfId, Instant now) {
        long adult = c.adultPrice() != null ? c.adultPrice() : tour.getPrice();
        long child = c.childPrice() != null ? c.childPrice() : adult * settings.childPercent() / 100;
        User guide = null;
        if (c.tourGuideId() != null) {
            guide = users.findById(c.tourGuideId()).filter(u -> u.getRole() == Role.TOUR_GUIDE)
                    .orElseThrow(() -> BusinessException.rule("Người được phân công không phải hướng dẫn viên"));
            // SRS 9.8: một HDV không phụ trách hai đợt trùng thời gian
            if (!departures.findGuideOverlaps(guide.getId(), selfId == null ? -1L : selfId, c.startAt(), c.endAt()).isEmpty()) {
                throw new BusinessException(ErrorCode.CONFLICT, "Hướng dẫn viên " + guide.getFullName() + " đã có lịch trùng thời gian");
            }
        }
        d.update(c.startAt(), c.endAt(), c.capacity(), adult, child, guide, now);
    }

    /** Huỷ đợt: huỷ mọi booking còn hiệu lực, hoàn 100% tiền đã thu, báo cho khách. */
    @Transactional
    public TourDeparture cancel(Long id, String reason, Long actorId) {
        Instant now = time.now();
        TourDeparture d = departures.findByIdForUpdate(id).orElseThrow(() -> BusinessException.notFound("đợt khởi hành"));
        d.cancel(reason, now);
        int count = 0;
        for (Long bookingId : bookings.findIdsByDepartureAndStatuses(id, List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED))) {
            Booking locked = bookings.findByIdForUpdate(bookingId).orElseThrow();
            lifecycle.cancel(locked, "Đợt khởi hành bị huỷ: " + reason, 100, now);
            count++;
        }
        audit.log(actorId, "CANCEL", "departure", id, reason + " — huỷ " + count + " booking");
        return d;
    }
}
