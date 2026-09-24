package com.tourbooking.presentation.common;

import com.tourbooking.application.payment.PaymentService;
import com.tourbooking.application.review.ReviewService;
import com.tourbooking.application.systemsetting.SettingService;
import com.tourbooking.application.tour.TourSummary;
import com.tourbooking.domain.audit.AuditLog;
import com.tourbooking.domain.booking.Booking;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.booking.RefundPolicy;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.notification.Notification;
import com.tourbooking.domain.payment.Bill;
import com.tourbooking.domain.payment.Payment;
import com.tourbooking.domain.payment.PaymentProvider;
import com.tourbooking.domain.payment.PaymentStatus;
import com.tourbooking.domain.review.Review;
import com.tourbooking.domain.systemsetting.SystemSetting;
import com.tourbooking.domain.tour.*;
import com.tourbooking.domain.user.User;
import com.tourbooking.infrastructure.config.AppProperties;
import com.tourbooking.presentation.common.Dtos.*;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class DtoMapper {
    private final PaymentService payments;
    private final ReviewService reviews;
    private final SettingService settings;
    private final TimeProvider time;
    private final AppProperties props;

    public DtoMapper(PaymentService payments, ReviewService reviews, SettingService settings, TimeProvider time, AppProperties props) {
        this.payments = payments;
        this.reviews = reviews;
        this.settings = settings;
        this.time = time;
        this.props = props;
    }

    public UserDto user(User u) {
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAddress(), u.getRole(), u.isActive(), u.getCreatedAt());
    }

    public CategoryDto category(TourCategory c) { return new CategoryDto(c.getId(), c.getName()); }
    public PlaceDto place(Place p) { return new PlaceDto(p.getId(), p.getName(), p.getDescription()); }

    public ItineraryItemDto itinerary(TourDetail d) {
        return new ItineraryItemDto(d.getId(), d.getPlace().getId(), d.getPlace().getName(), d.getPlace().getDescription(), d.getDisplayOrder());
    }

    public TourImageDto image(TourImage i) { return new TourImageDto(i.getId(), i.getImageUrl(), i.getSortOrder()); }

    public TourSummaryDto tourSummary(TourSummary s) {
        Tour t = s.tour();
        return new TourSummaryDto(t.getId(), t.getTourCode(), t.getTitle(), t.getDestination(), t.getDurationDays(), t.getPrice(), s.fromPrice(),
                t.getCoverImageUrl(), t.getCategory().getId(), t.getCategory().getName(), t.getStatus(), s.nextDepartureAt(),
                s.openDepartureCount(), s.availableSeats(), s.ratingAverage(), s.ratingCount());
    }

    public TourDetailDto tourDetail(TourSummary s, List<TourImage> images, List<TourDetail> itinerary, List<TourDeparture> departures) {
        Tour t = s.tour();
        return new TourDetailDto(t.getId(), t.getTourCode(), t.getTitle(), t.getDestination(), t.getDurationDays(), t.getPrice(), s.fromPrice(),
                t.getCoverImageUrl(), t.getCategory().getId(), t.getCategory().getName(), t.getStatus(), s.nextDepartureAt(),
                s.openDepartureCount(), s.availableSeats(), s.ratingAverage(), s.ratingCount(), t.getDescription(), t.getMaxGuests(),
                images.stream().map(this::image).toList(), itinerary.stream().map(this::itinerary).toList(),
                departures.stream().map(this::departure).toList());
    }

    public DepartureDto departure(TourDeparture d) {
        return new DepartureDto(d.getId(), d.getTour().getId(), d.getTour().getTitle(), d.getStartAt(), d.getEndAt(), d.getCapacity(),
                d.getBookedSeats(), d.availableSeats(), d.getAdultPrice(), d.getChildPrice(), d.getStatus(),
                d.getTourGuide() == null ? null : d.getTourGuide().getId(),
                d.getTourGuide() == null ? null : d.getTourGuide().getFullName(), d.getCancelReason());
    }

    /** Danh sách: không kèm hoá đơn để tránh N+1 truy vấn. */
    public BookingDto bookingSummary(Booking b) { return booking(b, false); }

    public BookingDto booking(Booking b) { return booking(b, true); }

    private BookingDto booking(Booking b, boolean withBill) {
        Instant now = time.now();
        List<Payment> ps = payments.forBooking(b.getId());
        PaymentStatus paymentStatus = ps.stream().max(Comparator.comparing(Payment::getCreatedAt)).map(Payment::getStatus).orElse(null);
        TourDeparture d = b.getDeparture();
        boolean beforeStart = d.getStartAt().isAfter(now);
        boolean canPay = b.getStatus() == BookingStatus.PENDING && !b.isPaymentOverdue(now);
        boolean canCancel = beforeStart && (b.getStatus() == BookingStatus.PENDING || b.getStatus() == BookingStatus.CONFIRMED);
        boolean canReview = b.getStatus() == BookingStatus.COMPLETED && !reviews.hasReview(b.getId());
        RefundPreviewDto preview = null;
        if (canCancel && b.getStatus() == BookingStatus.CONFIRMED) {
            long paid = ps.stream().filter(p -> p.getStatus() == PaymentStatus.PAID).mapToLong(Payment::getAmount).sum();
            int percent = settings.refundPolicy().percentFor(now, d.getStartAt());
            preview = new RefundPreviewDto(percent, RefundPolicy.amount(paid, percent));
        }
        BillDto bill = null;
        if (withBill) bill = payments.bill(b.getId()).map(x -> bill(x, ps)).orElse(null);
        User u = b.getUser();
        return new BookingDto(b.getId(), b.getBookingCode(), b.getStatus(), b.getAdultQuantity(), b.getChildQuantity(), b.getTicketQuantity(),
                b.getTotalPrice(), b.getBookedAt(), b.getExpiresAt(), b.getCancelledAt(), b.getCancelReason(), departure(d),
                d.getTour().getId(), d.getTour().getTitle(), d.getTour().getCoverImageUrl(),
                new CustomerDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone()), paymentStatus, bill,
                canPay, canCancel, canReview, preview);
    }

    public BillDto bill(Bill bill, List<Payment> ps) {
        return new BillDto(bill.getId(), bill.getBillCode(), bill.getAmount(), bill.getCreatedAt(), ps.stream().map(p -> payment(p, null)).toList());
    }

    public PaymentDto payment(Payment p, String checkoutUrl) {
        Booking b = p.getBill().getBooking();
        String url = checkoutUrl;
        if (url == null && p.getStatus() == PaymentStatus.PENDING && p.getProvider() == PaymentProvider.MOCK) {
            url = props.frontendUrl() + "/pay/mock/" + p.getId();
        }
        return new PaymentDto(p.getId(), b.getId(), b.getBookingCode(), p.getAmount(), p.getRefundAmount(), p.getStatus(), p.getProvider(),
                p.getTransactionCode(), p.getPaymentMethod(), p.getNote(), p.getCreatedAt(), p.getPaidAt(), url, b.getUser().getFullName());
    }

    public ReviewDto review(Review r) {
        return new ReviewDto(r.getId(), r.getBookingId(), r.getTourId(), r.getUserId(), r.getUserName(), r.getRating(), r.getContent(),
                r.getStatus(), r.getCreatedAt());
    }

    public NotificationDto notification(Notification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getContent(), n.getBookingId(), n.isRead(), n.getCreatedAt());
    }

    public SettingDto setting(SystemSetting s) { return new SettingDto(s.getKey(), s.getValue(), s.getDescription()); }

    public AuditLogDto audit(AuditLog a) {
        return new AuditLogDto(a.getId(), a.getUserEmail(), a.getAction(), a.getEntityType(), a.getEntityId(), a.getResult(), a.getDetail(), a.getCreatedAt());
    }
}
