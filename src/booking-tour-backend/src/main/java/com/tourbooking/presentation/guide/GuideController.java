package com.tourbooking.presentation.guide;

import com.tourbooking.application.departure.GuideService;
import com.tourbooking.domain.departure.DepartureStatus;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.ApiResponse;
import com.tourbooking.presentation.common.DtoMapper;
import com.tourbooking.presentation.common.Dtos.*;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/guide/departures")
public class GuideController {
    private final GuideService guide;
    private final DtoMapper map;

    public GuideController(GuideService guide, DtoMapper map) {
        this.guide = guide;
        this.map = map;
    }

    @GetMapping
    public ApiResponse<List<DepartureDto>> mine(@AuthenticationPrincipal AuthUser me, @RequestParam(required = false) DepartureStatus status) {
        return ApiResponse.ok(guide.mine(me.id(), status).stream().map(map::departure).toList());
    }

    @GetMapping("/{id}")
    public ApiResponse<GuideDepartureDetailDto> detail(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(guide.assigned(me.id(), id)));
    }

    @PostMapping("/{id}/start")
    public ApiResponse<GuideDepartureDetailDto> start(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(guide.start(me.id(), id)), "Tour đã bắt đầu", 200);
    }

    @PostMapping("/{id}/finish")
    public ApiResponse<GuideDepartureDetailDto> finish(@PathVariable Long id, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(detail(guide.finish(me.id(), id)), "Tour đã kết thúc, khách có thể đánh giá", 200);
    }

    /** Chỉ trả tên, SĐT, số vé — không trả email/địa chỉ (SRS gap #22: giới hạn dữ liệu HDV được xem). */
    private GuideDepartureDetailDto detail(TourDeparture d) {
        var passengers = guide.passengers(d.getId()).stream()
                .map(b -> new PassengerDto(b.getBookingCode(), b.getUser().getFullName(), b.getUser().getPhone(),
                        b.getAdultQuantity(), b.getChildQuantity(), b.getStatus())).toList();
        return new GuideDepartureDetailDto(map.departure(d), d.getTour().getTitle(), passengers);
    }
}
