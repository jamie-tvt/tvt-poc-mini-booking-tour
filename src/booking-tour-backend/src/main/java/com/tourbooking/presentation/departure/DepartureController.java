package com.tourbooking.presentation.departure;

import com.tourbooking.application.departure.DepartureCommand;
import com.tourbooking.application.departure.DepartureService;
import com.tourbooking.application.user.UserService;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.ApiResponse;
import com.tourbooking.presentation.common.DtoMapper;
import com.tourbooking.presentation.common.Dtos.DepartureDto;
import com.tourbooking.presentation.common.Dtos.UserDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class DepartureController {
    public record DepartureRequest(@NotNull(message = "Vui lòng chọn ngày giờ khởi hành") Instant startAt,
                                   @NotNull(message = "Vui lòng chọn ngày giờ kết thúc") Instant endAt,
                                   @Min(value = 1, message = "Sức chứa phải lớn hơn 0") @Max(500) int capacity,
                                   @PositiveOrZero Long adultPrice, @PositiveOrZero Long childPrice, Long tourGuideId) {}
    public record CancelRequest(@NotBlank(message = "Vui lòng nhập lý do huỷ") @Size(max = 255) String reason) {}

    private final DepartureService departures;
    private final UserService users;
    private final DtoMapper map;

    public DepartureController(DepartureService departures, UserService users, DtoMapper map) {
        this.departures = departures;
        this.users = users;
        this.map = map;
    }

    @GetMapping("/tours/{tourId}/departures")
    public ApiResponse<List<DepartureDto>> forTour(@PathVariable Long tourId, @RequestParam(defaultValue = "false") boolean all,
                                                   @AuthenticationPrincipal AuthUser me) {
        if (all && (me == null || !me.isStaff())) throw new BusinessException(ErrorCode.ACCESS_DENIED, "Chỉ quản lý tour xem được toàn bộ đợt");
        return ApiResponse.ok(departures.forTour(tourId, all).stream().map(map::departure).toList());
    }

    @GetMapping("/departures/{id}")
    public ApiResponse<DepartureDto> get(@PathVariable Long id) { return ApiResponse.ok(map.departure(departures.get(id))); }

    @PostMapping("/tours/{tourId}/departures")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<DepartureDto> create(@PathVariable Long tourId, @Valid @RequestBody DepartureRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.departure(departures.create(tourId, command(r), me.id())), "Đã tạo đợt khởi hành", 201);
    }

    @PutMapping("/departures/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<DepartureDto> update(@PathVariable Long id, @Valid @RequestBody DepartureRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.departure(departures.update(id, command(r), me.id())));
    }

    @PutMapping("/departures/{id}/cancel")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<DepartureDto> cancel(@PathVariable Long id, @Valid @RequestBody CancelRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.departure(departures.cancel(id, r.reason(), me.id())), "Đã huỷ đợt khởi hành", 200);
    }

    @GetMapping("/guides")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<List<UserDto>> guides() { return ApiResponse.ok(users.guides().stream().map(map::user).toList()); }

    private static DepartureCommand command(DepartureRequest r) {
        return new DepartureCommand(r.startAt(), r.endAt(), r.capacity(), r.adultPrice(), r.childPrice(), r.tourGuideId());
    }
}
