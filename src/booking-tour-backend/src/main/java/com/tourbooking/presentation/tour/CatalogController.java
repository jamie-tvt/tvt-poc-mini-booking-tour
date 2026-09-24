package com.tourbooking.presentation.tour;

import com.tourbooking.application.tour.CatalogService;
import com.tourbooking.presentation.common.ApiResponse;
import com.tourbooking.presentation.common.DtoMapper;
import com.tourbooking.presentation.common.Dtos.CategoryDto;
import com.tourbooking.presentation.common.Dtos.PlaceDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {
    public record CategoryRequest(@NotBlank(message = "Vui lòng nhập tên danh mục") @Size(max = 80) String name) {}
    public record PlaceRequest(@NotBlank(message = "Vui lòng nhập tên địa điểm") @Size(max = 120) String name, @Size(max = 2000) String description) {}

    private final CatalogService catalog;
    private final DtoMapper map;

    public CatalogController(CatalogService catalog, DtoMapper map) {
        this.catalog = catalog;
        this.map = map;
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryDto>> categories() { return ApiResponse.ok(catalog.categories().stream().map(map::category).toList()); }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<CategoryDto> createCategory(@Valid @RequestBody CategoryRequest r) {
        return ApiResponse.ok(map.category(catalog.createCategory(r.name())), "Đã tạo danh mục", 201);
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<CategoryDto> renameCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest r) {
        return ApiResponse.ok(map.category(catalog.renameCategory(id, r.name())));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        catalog.deleteCategory(id);
        return ApiResponse.ok(null, "Đã xoá danh mục", 200);
    }

    @GetMapping("/places")
    public ApiResponse<List<PlaceDto>> places() { return ApiResponse.ok(catalog.places().stream().map(map::place).toList()); }

    @PostMapping("/places")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<PlaceDto> createPlace(@Valid @RequestBody PlaceRequest r) {
        return ApiResponse.ok(map.place(catalog.createPlace(r.name(), r.description())), "Đã tạo địa điểm", 201);
    }

    @PutMapping("/places/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<PlaceDto> updatePlace(@PathVariable Long id, @Valid @RequestBody PlaceRequest r) {
        return ApiResponse.ok(map.place(catalog.updatePlace(id, r.name(), r.description())));
    }

    @DeleteMapping("/places/{id}")
    @PreAuthorize("hasAnyRole('TOUR_MANAGER','ADMIN')")
    public ApiResponse<Void> deletePlace(@PathVariable Long id) {
        catalog.deletePlace(id);
        return ApiResponse.ok(null, "Đã xoá địa điểm", 200);
    }
}
