package com.tourbooking.presentation.common;

import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.payment.PaymentProvider;
import com.tourbooking.domain.payment.PaymentStatus;
import com.tourbooking.domain.review.ReviewStatus;
import com.tourbooking.domain.tour.TourStatus;
import com.tourbooking.domain.user.Role;
import java.time.Instant;
import java.util.List;

/** Response DTO — khớp mục 3 của docs/technical/api-contracts.md. */
public final class Dtos {
    private Dtos() {}

    public record UserDto(Long id, String fullName, String email, String phone, String address, Role role, boolean active, Instant createdAt) {}
    public record AuthTokensDto(String accessToken, String refreshToken, long expiresIn, UserDto user) {}
    public record CategoryDto(Long id, String name) {}
    public record PlaceDto(Long id, String name, String description) {}
    public record ItineraryItemDto(Long id, Long placeId, String placeName, String placeDescription, int displayOrder) {}
    public record TourImageDto(Long id, String imageUrl, int sortOrder) {}

    public record TourSummaryDto(Long id, String tourCode, String title, String destination, int durationDays, long price, long fromPrice,
                                 String coverImageUrl, Long categoryId, String categoryName, TourStatus status, Instant nextDepartureAt,
                                 int openDepartureCount, int availableSeats, Double ratingAverage, long ratingCount) {}

    public record TourDetailDto(Long id, String tourCode, String title, String destination, int durationDays, long price, long fromPrice,
                                String coverImageUrl, Long categoryId, String categoryName, TourStatus status, Instant nextDepartureAt,
                                int openDepartureCount, int availableSeats, Double ratingAverage, long ratingCount,
                                String description, int maxGuests, List<TourImageDto> images, List<ItineraryItemDto> itinerary,
                                List<DepartureDto> departures) {}

    public record DepartureDto(Long id, Long tourId, String tourTitle, Instant startAt, Instant endAt, int capacity, int bookedSeats,
                               int availableSeats, long adultPrice, long childPrice, DepartureStatus status, Long tourGuideId,
                               String tourGuideName, String cancelReason) {}

    public record CustomerDto(Long id, String fullName, String email, String phone) {}
    public record RefundPreviewDto(int percent, long amount) {}

    public record BookingDto(Long id, String bookingCode, BookingStatus status, int adultQuantity, int childQuantity, int ticketQuantity,
                             long totalPrice, Instant bookedAt, Instant expiresAt, Instant cancelledAt, String cancelReason,
                             DepartureDto departure, Long tourId, String tourTitle, String tourCoverImageUrl, CustomerDto customer,
                             PaymentStatus paymentStatus, BillDto bill, boolean canPay, boolean canCancel, boolean canReview,
                             RefundPreviewDto refundPreview) {}

    public record BillDto(Long id, String billCode, long amount, Instant createdAt, List<PaymentDto> payments) {}

    public record PaymentDto(Long id, Long bookingId, String bookingCode, long amount, Long refundAmount, PaymentStatus status,
                             PaymentProvider provider, String transactionCode, String paymentMethod, String note, Instant createdAt,
                             Instant paidAt, String checkoutUrl, String customerName) {}

    public record ReviewDto(Long id, Long bookingId, Long tourId, Long userId, String userName, int rating, String content,
                            ReviewStatus status, Instant createdAt) {}

    public record NotificationDto(Long id, String title, String content, Long bookingId, boolean read, Instant createdAt) {}
    public record PassengerDto(String bookingCode, String fullName, String phone, int adultQuantity, int childQuantity, BookingStatus status) {}
    public record GuideDepartureDetailDto(DepartureDto departure, String tourTitle, List<PassengerDto> passengers) {}
    public record SettingDto(String key, String value, String description) {}
    public record AuditLogDto(Long id, String userEmail, String action, String entityType, Long entityId, String result, String detail, Instant createdAt) {}
}
