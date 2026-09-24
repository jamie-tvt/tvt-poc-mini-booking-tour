package com.tourbooking.presentation.booking;

import com.tourbooking.application.booking.BookingService;
import com.tourbooking.application.payment.PaymentService;
import com.tourbooking.domain.booking.BookingStatus;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.*;
import com.tourbooking.presentation.common.Dtos.BillDto;
import com.tourbooking.presentation.common.Dtos.BookingDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class BookingController {
    public record CreateBookingRequest(@NotNull(message = "Vui lòng chọn đợt khởi hành") Long departureId,
                                       @Min(value = 1, message = "Cần ít nhất 1 vé người lớn") @Max(20) int adultQuantity,
                                       @Min(0) @Max(20) int childQuantity) {}
    public record CancelBookingRequest(@Size(max = 255) String reason) {}
    public record AdminStatusRequest(@NotNull BookingStatus status, @NotBlank(message = "Vui lòng nhập lý do") @Size(max = 255) String reason) {}

    private final BookingService bookings;
    private final PaymentService payments;
    private final DtoMapper map;

    public BookingController(BookingService bookings, PaymentService payments, DtoMapper map) {
        this.bookings = bookings;
        this.payments = payments;
        this.map = map;
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<BookingDto> create(@Valid @RequestBody CreateBookingRequest r, @AuthenticationPrincipal AuthUser me) {
        var b = bookings.create(me.id(), r.departureId(), r.adultQuantity(), r.childQuantity());
        return ApiResponse.ok(map.booking(b), "Đã giữ chỗ, vui lòng thanh toán", 201);
    }

    @GetMapping("/users/me/bookings")
    public ApiResponse<PageResponse<BookingDto>> mine(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) BookingStatus status,
                                                      @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(bookings.mine(me.id(), status, Paging.of(page, size)), map::bookingSummary));
    }

    @GetMapping("/bookings/{id}")
    public ApiResponse<BookingDto> get(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.booking(bookings.get(id, me)));
    }

    @PostMapping("/bookings/{id}/cancel")
    public ApiResponse<BookingDto> cancel(@PathVariable Long id, @RequestBody(required = false) @Valid CancelBookingRequest r,
                                          @AuthenticationPrincipal AuthUser me) {
        var b = bookings.cancelByCustomer(id, me.id(), r == null ? null : r.reason());
        return ApiResponse.ok(map.booking(b), "Đã huỷ đơn đặt tour", 200);
    }

    @GetMapping("/bookings/{id}/bill")
    public ApiResponse<BillDto> bill(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        bookings.get(id, me);
        return ApiResponse.ok(payments.bill(id).map(b -> map.bill(b, payments.forBooking(id)))
                .orElseThrow(() -> BusinessException.notFound("hoá đơn")));
    }

    @GetMapping("/admin/bookings")
    public ApiResponse<PageResponse<BookingDto>> search(@RequestParam(required = false) BookingStatus status, @RequestParam(required = false) String keyword,
                                                        @RequestParam(required = false) Long departureId,
                                                        @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(bookings.search(status, departureId, keyword, Paging.of(page, size)), map::bookingSummary));
    }

    @PutMapping("/admin/bookings/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BookingDto> adminStatus(@PathVariable Long id, @Valid @RequestBody AdminStatusRequest r, @AuthenticationPrincipal AuthUser me) {
        if (r.status() != BookingStatus.CANCELLED) throw BusinessException.rule("Quản trị viên chỉ được huỷ đơn; trạng thái khác đổi theo nghiệp vụ");
        return ApiResponse.ok(map.booking(bookings.cancelByAdmin(id, me.id(), r.reason())), "Đã huỷ đơn", 200);
    }
}
