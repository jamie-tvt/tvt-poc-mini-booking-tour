package com.tourbooking.application.tour;

import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.tour.Place;
import com.tourbooking.domain.tour.TourCategory;
import com.tourbooking.infrastructure.persistence.jpa.JpaPlaceRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourCategoryRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourDetailRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Danh mục tour và địa điểm (dữ liệu tham chiếu). */
@Service
public class CatalogService {
    private final JpaTourCategoryRepository categories;
    private final JpaPlaceRepository places;
    private final JpaTourRepository tours;
    private final JpaTourDetailRepository details;

    public CatalogService(JpaTourCategoryRepository categories, JpaPlaceRepository places, JpaTourRepository tours, JpaTourDetailRepository details) {
        this.categories = categories;
        this.places = places;
        this.tours = tours;
        this.details = details;
    }

    @Transactional(readOnly = true)
    public List<TourCategory> categories() { return categories.findAll(Sort.by("name")); }

    @Transactional
    public TourCategory createCategory(String name) {
        if (categories.existsByNameIgnoreCase(name.trim())) throw new BusinessException(ErrorCode.CONFLICT, "Danh mục đã tồn tại");
        return categories.save(new TourCategory(name.trim()));
    }

    @Transactional
    public TourCategory renameCategory(Long id, String name) {
        TourCategory c = categories.findById(id).orElseThrow(() -> BusinessException.notFound("danh mục"));
        if (!c.getName().equalsIgnoreCase(name.trim()) && categories.existsByNameIgnoreCase(name.trim())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Danh mục đã tồn tại");
        }
        c.rename(name.trim());
        return c;
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (tours.existsByCategoryId(id)) throw new BusinessException(ErrorCode.CONFLICT, "Danh mục còn tour nên không xoá được");
        categories.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<Place> places() { return places.findAll(Sort.by("name")); }

    @Transactional
    public Place createPlace(String name, String description) { return places.save(new Place(name.trim(), description)); }

    @Transactional
    public Place updatePlace(Long id, String name, String description) {
        Place p = places.findById(id).orElseThrow(() -> BusinessException.notFound("địa điểm"));
        p.update(name.trim(), description);
        return p;
    }

    @Transactional
    public void deletePlace(Long id) {
        if (details.existsByPlaceId(id)) throw new BusinessException(ErrorCode.CONFLICT, "Địa điểm đang nằm trong lịch trình tour");
        places.deleteById(id);
    }
}
