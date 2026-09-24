package com.tourbooking.presentation.admin;

import com.tourbooking.application.admin.DashboardService;
import com.tourbooking.application.audit.AuditService;
import com.tourbooking.application.systemsetting.SettingService;
import com.tourbooking.application.user.UserService;
import com.tourbooking.domain.user.Role;
import com.tourbooking.infrastructure.security.AuthUser;
import com.tourbooking.presentation.common.*;
import com.tourbooking.presentation.common.Dtos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    public record CreateUserRequest(@NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 120) String fullName,
                                    @NotBlank @Email(message = "Email không hợp lệ") String email,
                                    @NotBlank @Size(min = 8, max = 72, message = "Mật khẩu tối thiểu 8 ký tự") String password,
                                    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
                                    @NotNull Role role) {}
    public record UpdateUserRequest(@NotBlank @Size(max = 120) String fullName,
                                    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ") String phone,
                                    @NotNull Role role) {}
    public record ActiveRequest(boolean active) {}
    public record SettingsRequest(@NotEmpty List<@Valid Item> items) {
        public record Item(@NotBlank String key, @NotBlank String value) {}
    }
    public record DashboardDto(Map<String, Long> tours, Map<String, Long> departures, Map<String, Long> bookings,
                               Map<String, Long> revenue, Map<String, Long> users, List<BookingDto> recentBookings) {}

    private final UserService users;
    private final SettingService settings;
    private final DashboardService dashboard;
    private final AuditService audit;
    private final DtoMapper map;

    public AdminController(UserService users, SettingService settings, DashboardService dashboard, AuditService audit, DtoMapper map) {
        this.users = users;
        this.settings = settings;
        this.dashboard = dashboard;
        this.audit = audit;
        this.map = map;
    }

    @GetMapping("/dashboard")
    public ApiResponse<DashboardDto> dashboard() {
        var d = dashboard.build();
        return ApiResponse.ok(new DashboardDto(d.tours(), d.departures(), d.bookings(), d.revenue(), d.users(),
                d.recentBookings().stream().map(map::bookingSummary).toList()));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<UserDto>> users(@RequestParam(required = false) String keyword, @RequestParam(required = false) Role role,
                                                    @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(users.search(keyword, role, Paging.of(page, size)), map::user));
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDto> create(@Valid @RequestBody CreateUserRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(users.create(r.fullName(), r.email(), r.password(), r.phone(), r.role(), me.id())), "Đã tạo tài khoản", 201);
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDto> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(users.update(id, r.fullName(), r.phone(), r.role(), me.id())));
    }

    @PutMapping("/users/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserDto> active(@PathVariable Long id, @RequestBody ActiveRequest r, @AuthenticationPrincipal AuthUser me) {
        return ApiResponse.ok(map.user(users.setActive(id, r.active(), me.id())), r.active() ? "Đã mở khoá" : "Đã khoá tài khoản", 200);
    }

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<SettingDto>> settings() { return ApiResponse.ok(settings.list().stream().map(map::setting).toList()); }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<SettingDto>> updateSettings(@Valid @RequestBody SettingsRequest r, @AuthenticationPrincipal AuthUser me) {
        Map<String, String> values = new LinkedHashMap<>();
        r.items().forEach(i -> values.put(i.key(), i.value()));
        settings.update(values, me.id());
        return ApiResponse.ok(settings.list().stream().map(map::setting).toList(), "Đã lưu cấu hình", 200);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PageResponse<AuditLogDto>> audit(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return ApiResponse.ok(PageResponse.of(audit.list(Paging.of(page, size == null ? 30 : size)), map::audit));
    }
}
