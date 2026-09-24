package com.tourbooking.presentation.tour;

import com.tourbooking.application.departure.DepartureService;
import com.tourbooking.application.tour.TourCommand;
import com.tourbooking.application.tour.TourSearchFilter;
import com.tourbooking.application.tour.TourService;
import com.tourbooking.application.tour.TourSummary;
import com.tourbooking.domain.tour.TourStatus;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.*;
import com.tourbooking.presentation.common.Dtos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class TourController {
    public record TourRequest(@NotBlank(message = "Vui lòng nhập mã tour") @Size(max = 20) @Pattern(regexp = "^[A-Za-z0-9-]+$", message = "Mã tour chỉ gồm chữ, số và dấu gạch") String tourCode,
                              @NotBlank(message = "Vui lòng nhập tên tour") @Size(max = 160) String title,
                              @NotBlank(message = "Vui lòng nhập mô tả") String description,
                              @NotBlank(message = "Vui lòng nhập điểm đến") @Size(max = 120) String destination,
                              @Min(value = 1, message = "Số ngày tối thiểu là 1") @Max(60) int durationDays,
                              @Min(value = 1, message = "Số khách tối đa phải lớn hơn 0") @Max(500) int maxGuests,
                              @PositiveOrZero(message = "Giá không được âm") long price,
                              @NotNull(message = "Vui lòng chọn danh mục") Long categoryId,
                              @Size(max = 255) String coverImageUrl, TourStatus status) {}
    public record ItineraryRequest(@NotNull List<@Valid Item> items) {
        public record Item(@NotNull Long placeId, @Min(1) int displayOrder) {}
    }
    public record ImageRequest(@NotBlank @Size(max = 255) String imageUrl) {}

    private final TourService tours;
    private final DepartureService departures;
    private final DtoMapper map;

    public TourController(TourService tours, DepartureService departures, DtoMapper map) {
        this.tours = tours;
        this.departures = departures;
        this.map = map;
    }

    @GetMapping("/tours")
    public ApiResponse<PageResponse<TourSummaryDto>> search(@RequestParam(required = false) String keyword, @RequestParam(required = false) Long categoryId,
                                                            @RequestParam(required = false) Long minPrice, @RequestParam(required = false) Long maxPrice,
                                                            @RequestParam(required = false) String departFrom, @RequestParam(required = false) String departTo,
                                                            @RequestParam(required = false) String sort,
                                                            @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        var p = Paging.of(page, size);
        var result = tours.searchPublic(new TourSearchFilter(keyword, categoryId, minPrice, maxPrice, dateParam(departFrom, false), dateParam(departTo, true), sort),
                p.getPageNumber(), p.getPageSize());
        return ApiResponse.ok(PageResponse.of(result, map::tourSummary));
    }

    @GetMapping("/tours/{id}")
    public ApiResponse<TourDetailDto> detail(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        boolean staff = me != null && me.isStaff();
        return ApiResponse.ok(detailDto(tours.summary(id, staff), staff));
    }

    @GetMapping("/manager/tours")
    public ApiResponse<PageResponse<TourSummaryDto>> manage(@RequestParam(required = false) String keyword, @RequestParam(required = false) TourStatus status,
                                                            @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        var p = Paging.of(page, size);
        return ApiResponse.ok(PageResponse.of(tours.searchManager(keyword, status, p.getPageNumber(), p.getPageSize()), map::tourSummary));
    }

    @PostMapping("/tours")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<TourDetailDto> create(@Valid @RequestBody TourRequest r, @AuthenticationPrincipal AuthUser me) {
        var t = tours.create(command(r), me.id());
        return ApiResponse.ok(detailDto(tours.summary(t.getId(), true), true), "Đã tạo tour", 201);
    }

    @PutMapping("/tours/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<TourDetailDto> update(@PathVariable Long id, @Valid @RequestBody TourRequest r, @AuthenticationPrincipal AuthUser me) {
        tours.update(id, command(r), me.id());
        return ApiResponse.ok(detailDto(tours.summary(id, true), true));
    }

    @DeleteMapping("/tours/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<Map<String, Object>> delete(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        boolean deleted = tours.delete(id, me.id());
        return deleted ? ApiResponse.ok(Map.of("deleted", true), "Đã xoá tour", 200)
                : ApiResponse.ok(Map.of("deleted", false, "status", "INACTIVE"), "Tour đã có lịch khởi hành nên được chuyển sang ngừng bán", 200);
    }

    @GetMapping("/tours/{id}/itinerary")
    public ApiResponse<List<ItineraryItemDto>> itinerary(@PathVariable Long id) {
        return ApiResponse.ok(tours.itinerary(id).stream().map(map::itinerary).toList());
    }

    @PutMapping("/tours/{id}/itinerary")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<List<ItineraryItemDto>> replaceItinerary(@PathVariable Long id, @Valid @RequestBody ItineraryRequest r, @AuthenticationPrincipal AuthUser me) {
        var items = r.items().stream().map(i -> new TourService.ItineraryItem(i.placeId(), i.displayOrder())).toList();
        return ApiResponse.ok(tours.replaceItinerary(id, items, me.id()).stream().map(map::itinerary).toList());
    }

    @GetMapping("/tours/{id}/images")
    public ApiResponse<List<TourImageDto>> images(@PathVariable Long id) { return ApiResponse.ok(tours.images(id).stream().map(map::image).toList()); }

    @PostMapping("/tours/{id}/images")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<TourImageDto> addImage(@PathVariable Long id, @Valid @RequestBody ImageRequest r) {
        return ApiResponse.ok(map.image(tours.addImage(id, r.imageUrl())), "Đã thêm ảnh", 201);
    }

    @DeleteMapping("/tours/{id}/images/{imageId}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<Void> deleteImage(@PathVariable Long id, @PathVariable Long imageId) {
        tours.deleteImage(id, imageId);
        return ApiResponse.ok(null, "Đã xoá ảnh", 200);
    }

    private TourDetailDto detailDto(TourSummary s, boolean staff) {
        Long id = s.tour().getId();
        return map.tourDetail(s, tours.images(id), tours.itinerary(id), departures.forTour(id, false));
    }

    /** Nhận "2026-10-05" (ngày theo giờ Việt Nam, như ô chọn ngày trên web) hoặc ISO instant đầy đủ. */
    static Instant dateParam(String v, boolean endOfDay) {
        if (v == null || v.isBlank()) return null;
        try {
            if (v.length() == 10) {
                var day = java.time.LocalDate.parse(v);
                var zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
                return endOfDay ? day.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1) : day.atStartOfDay(zone).toInstant();
            }
            return Instant.parse(v);
        } catch (java.time.format.DateTimeParseException e) {
            throw new com.tourbooking.domain.common.BusinessException(com.tourbooking.domain.common.ErrorCode.BAD_REQUEST, "Ngày không đúng định dạng YYYY-MM-DD");
        }
    }

    private static TourCommand command(TourRequest r) {
        return new TourCommand(r.tourCode(), r.title(), r.description(), r.destination(), r.durationDays(), r.maxGuests(), r.price(),
                r.categoryId(), r.coverImageUrl(), r.status());
    }
}
