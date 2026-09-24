package com.tourbooking.presentation.payment;

import com.tourbooking.application.payment.PaymentService;
import com.tourbooking.domain.payment.PaymentStatus;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.*;
import com.tourbooking.presentation.common.Dtos.PaymentDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {
    public enum MockResult { SUCCESS, FAILED }
    public record MockCompleteRequest(@NotNull MockResult result) {}
    public record ReasonRequest(@Size(max = 255) String reason) {}

    private final PaymentService payments;
    private final DtoMapper map;

    public PaymentController(PaymentService payments, DtoMapper map) {
        this.payments = payments;
        this.map = map;
    }

    @PostMapping("/bookings/{bookingId}/payment")
    public ApiResponse<PaymentDto> initiate(@PathVariable Long bookingId, @AuthenticationPrincipal AuthUser me) {
        var c = payments.initiate(bookingId, me.id());
        return ApiResponse.ok(map.payment(c.payment(), c.checkoutUrl()));
    }

    @GetMapping("/payments/{id}")
    public ApiResponse<PaymentDto> get(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.get(id, me), null));
    }

    @PostMapping("/payments/mock/{id}/complete")
    public ApiResponse<PaymentDto> mockComplete(@PathVariable Long id, @Valid @RequestBody MockCompleteRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.mockComplete(id, me.id(), r.result() == MockResult.SUCCESS), null));
    }

    /** Webhook nhận nguyên văn body để kiểm chữ ký trên đúng các byte cổng đã ký. */
    @PostMapping(value = "/payments/webhook/mock", consumes = "application/json")
    public ApiResponse<Map<String, Boolean>> mockWebhook(@RequestBody String raw, @RequestHeader(value = "X-Mock-Signature", required = false) String sig) {
        payments.handleWebhook(raw, sig);
        return ApiResponse.ok(Map.of("received", true));
    }

    @PostMapping(value = "/payments/stripe/webhook")
    public ApiResponse<Map<String, Boolean>> stripeWebhook(@RequestBody String raw, @RequestHeader(value = "Stripe-Signature", required = false) String sig) {
        payments.handleWebhook(raw, sig);
        return ApiResponse.ok(Map.of("received", true));
    }

    @GetMapping("/admin/payments")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<PaymentDto>> search(@RequestParam(required = false) PaymentStatus status,
                                                        @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(payments.search(status, Paging.of(page, size)), p -> map.payment(p, null)));
    }

    @PostMapping("/payments/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PaymentDto> verify(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.verifyManually(id, me.id()), null), "Đã xác minh thanh toán", 200);
    }

    @PostMapping("/payments/{id}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PaymentDto> refund(@PathVariable Long id, @RequestBody(required = false) ReasonRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.refund(id, me.id(), r == null ? null : r.reason()), null), "Đã hoàn tiền", 200);
    }

    @PostMapping("/payments/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PaymentDto> cancel(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.payment(payments.cancel(id, me.id()), null), "Đã huỷ giao dịch", 200);
    }
}
