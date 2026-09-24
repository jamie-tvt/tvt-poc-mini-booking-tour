package com.tourbooking.application.departure;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.application.booking.BookingLifecycle;
import com.tourbooking.application.notification.NotificationService;
import com.tourbooking.application.systemsetting.SettingService;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.infrastructure.persistence.jpa.JpaBookingRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDepartureRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chức năng của hướng dẫn viên (SRS 3.1.3, 5.1). Chỉ thao tác trên đợt được phân công. */
@Service
public class GuideService {
    private final JpaTourDepartureRepository departures;
    private final JpaBookingRepository bookings;
    private final BookingLifecycle lifecycle;
    private final NotificationService notifications;
    private final SettingService settings;
    private final AuditService audit;
    private final TimeProvider time;

    public GuideService(JpaTourDepartureRepository departures, JpaBookingRepository bookings, BookingLifecycle lifecycle,
                        NotificationService notifications, SettingService settings, AuditService audit, TimeProvider time) {
        this.departures = departures;
        this.bookings = bookings;
        this.lifecycle = lifecycle;
        this.notifications = notifications;
        this.settings = settings;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public List<TourDeparture> mine(Long guideId, DepartureStatus status) { return departures.findByGuide(guideId, status); }

    @Transactional(readOnly = true)
    public TourDeparture assigned(Long guideId, Long departureId) {
        TourDeparture d = departures.findById(departureId).orElseThrow(() -> BusinessException.notFound("đợt khởi hành"));
        assertAssigned(d, guideId);
        return d;
    }

    @Transactional(readOnly = true)
    public List<Booking> passengers(Long departureId) {
        return bookings.findByDepartureAndStatuses(departureId, List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED));
    }

    @Transactional
    public TourDeparture start(Long guideId, Long departureId) {
        Instant now = time.now();
        TourDeparture d = departures.findByIdForUpdate(departureId).orElseThrow(() -> BusinessException.notFound("đợt khởi hành"));
        assertAssigned(d, guideId);
        d.start(now, settings.guideStartWindow());
        // SRS 9.4: đợt đang diễn ra thì khoá đặt vé → booking chưa thanh toán hết hiệu lực
        for (Long bookingId : bookings.findIdsByDepartureAndStatuses(departureId, List.of(BookingStatus.PENDING))) {
            lifecycle.expire(bookings.findByIdForUpdate(bookingId).orElseThrow(), now);
        }
        audit.log(guideId, "START", "departure", departureId, null);
        return d;
    }

    @Transactional
    public TourDeparture finish(Long guideId, Long departureId) {
        Instant now = time.now();
        TourDeparture d = departures.findByIdForUpdate(departureId).orElseThrow(() -> BusinessException.notFound("đợt khởi hành"));
        assertAssigned(d, guideId);
        d.finish(now);
        for (Long bookingId : bookings.findIdsByDepartureAndStatuses(departureId, List.of(BookingStatus.CONFIRMED))) {
            Booking locked = bookings.findByIdForUpdate(bookingId).orElseThrow();
            locked.complete(now);
            notifications.notify(locked.getUser().getId(), locked.getId(), "Cảm ơn bạn đã đồng hành",
                    "Tour " + d.getTour().getTitle() + " đã kết thúc. Hãy để lại đánh giá cho chuyến đi nhé.");
        }
        audit.log(guideId, "FINISH", "departure", departureId, null);
        return d;
    }

    private static void assertAssigned(TourDeparture d, Long guideId) {
        if (d.getTourGuide() == null || !d.getTourGuide().getId().equals(guideId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Bạn không được phân công cho đợt khởi hành này");
        }
    }
}
