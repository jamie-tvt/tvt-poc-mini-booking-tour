package com.tourbooking.presentation.review;

import com.tourbooking.application.review.ReviewService;
import com.tourbooking.domain.review.ReviewStatus;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.*;
import com.tourbooking.presentation.common.Dtos.ReviewDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ReviewController {
    public record CreateReviewRequest(@NotNull Long bookingId, @Min(value = 1, message = "Số sao từ 1 đến 5") @Max(value = 5, message = "Số sao từ 1 đến 5") int rating,
                                      @NotBlank(message = "Vui lòng nhập nhận xét") @Size(min = 10, max = 2000, message = "Nhận xét từ 10 đến 2000 ký tự") String content) {}
    public record VisibilityRequest(@NotNull ReviewStatus status) {}

    private final ReviewService reviews;
    private final DtoMapper map;

    public ReviewController(ReviewService reviews, DtoMapper map) {
        this.reviews = reviews;
        this.map = map;
    }

    @GetMapping("/tours/{tourId}/reviews")
    public ApiResponse<PageResponse<ReviewDto>> forTour(@PathVariable Long tourId, @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(reviews.forTour(tourId, Paging.of(page, size)), map::review));
    }

    @PostMapping("/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<ReviewDto> create(@Valid @RequestBody CreateReviewRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.review(reviews.create(me.id(), r.bookingId(), r.rating(), r.content())), "Cảm ơn bạn đã đánh giá", 201);
    }

    @GetMapping("/admin/reviews")
    public ApiResponse<PageResponse<ReviewDto>> all(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(reviews.all(Paging.of(page, size)), map::review));
    }

    @PutMapping("/admin/reviews/{id}/visibility")
    public ApiResponse<ReviewDto> visibility(@PathVariable Long id, @Valid @RequestBody VisibilityRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.review(reviews.setVisibility(id, r.status(), me.id())));
    }
}
