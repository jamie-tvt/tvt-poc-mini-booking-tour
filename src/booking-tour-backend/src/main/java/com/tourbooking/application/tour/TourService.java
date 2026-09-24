package com.tourbooking.application.tour;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.tour.*;
import com.tourbooking.infrastructure.persistence.jpa.*;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TourService {
    public record ItineraryItem(Long placeId, int displayOrder) {}

    private final JpaTourRepository tours;
    private final JpaTourCategoryRepository categories;
    private final JpaPlaceRepository places;
    private final JpaTourDetailRepository details;
    private final JpaTourImageRepository images;
    private final JpaTourDepartureRepository departures;
    private final JpaReviewRepository reviews;
    private final AuditService audit;
    private final TimeProvider time;

    public TourService(JpaTourRepository tours, JpaTourCategoryRepository categories, JpaPlaceRepository places,
                       JpaTourDetailRepository details, JpaTourImageRepository images, JpaTourDepartureRepository departures,
                       JpaReviewRepository reviews, AuditService audit, TimeProvider time) {
        this.tours = tours;
        this.categories = categories;
        this.places = places;
        this.details = details;
        this.images = images;
        this.departures = departures;
        this.reviews = reviews;
        this.audit = audit;
        this.time = time;
    }

    // ---------------------------------------------------------------- public
    @Transactional(readOnly = true)
    public Page<TourSummary> searchPublic(TourSearchFilter f, int page, int size) {
        Instant now = time.now();
        Specification<Tour> spec = publicSpec(f, now);
        String sort = f.sort() == null ? "nextDeparture" : f.sort();
        if (!sort.equals("nextDeparture")) {
            Sort s = switch (sort) {
                case "price,asc" -> Sort.by("price").ascending();
                case "price,desc" -> Sort.by("price").descending();
                default -> Sort.by("createdAt").descending();
            };
            Page<Tour> p = tours.findAll(spec, PageRequest.of(page, size, s.and(Sort.by("id"))));
            return new PageImpl<>(summarize(p.getContent(), now, f.departFrom(), f.departTo()), p.getPageable(), p.getTotalElements());
        }
        // Sắp theo ngày khởi hành gần nhất: tính từ bảng đợt nên sắp trong bộ nhớ. Danh mục tour nhỏ (vài trăm) nên chấp nhận được;
        // khi lớn thì thêm cột next_departure_at cập nhật theo sự kiện.
        List<TourSummary> all = summarize(tours.findAll(spec), now, f.departFrom(), f.departTo());
        all.sort(Comparator.comparing((TourSummary t) -> t.nextDepartureAt() == null ? Instant.MAX : t.nextDepartureAt())
                .thenComparing(t -> t.tour().getId()));
        int from = Math.min(page * size, all.size());
        return new PageImpl<>(all.subList(from, Math.min(from + size, all.size())), PageRequest.of(page, size), all.size());
    }

    private Specification<Tour> publicSpec(TourSearchFilter f, Instant now) {
        return (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.equal(root.get("status"), TourStatus.ACTIVE));
            if (f.keyword() != null && !f.keyword().isBlank()) {
                String like = "%" + foldD(f.keyword()) + "%";
                ps.add(cb.or(cb.like(foldD(cb, root.get("title")), like), cb.like(foldD(cb, root.get("destination")), like),
                        cb.like(cb.lower(root.get("tourCode")), like)));
            }
            if (f.categoryId() != null) ps.add(cb.equal(root.get("category").get("id"), f.categoryId()));
            if (f.minPrice() != null) ps.add(cb.ge(root.get("price"), f.minPrice()));
            if (f.maxPrice() != null) ps.add(cb.le(root.get("price"), f.maxPrice()));
            if (f.departFrom() != null || f.departTo() != null) {
                Subquery<Long> sq = q.subquery(Long.class);
                Root<TourDeparture> d = sq.from(TourDeparture.class);
                List<Predicate> dp = new ArrayList<>();
                dp.add(cb.equal(d.get("tour"), root));
                dp.add(cb.equal(d.get("status"), com.tourbooking.domain.departure.DepartureStatus.OPEN));
                dp.add(cb.greaterThan(d.get("startAt"), now));
                if (f.departFrom() != null) dp.add(cb.greaterThanOrEqualTo(d.get("startAt"), f.departFrom()));
                if (f.departTo() != null) dp.add(cb.lessThanOrEqualTo(d.get("startAt"), f.departTo()));
                sq.select(d.get("id")).where(dp.toArray(Predicate[]::new));
                ps.add(cb.exists(sq));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    List<TourSummary> summarize(List<Tour> list, Instant now) { return summarize(list, now, null, null); }

    /**
     * Có lọc theo ngày (from/to) thì nextDepartureAt = đợt mở bán đầu tiên NẰM TRONG khoảng lọc (ưu tiên đợt còn chỗ),
     * để thẻ tour không hiện ngày ngoài khoảng người dùng vừa chọn. Giá "từ" và tổng chỗ trống giữ theo mọi đợt.
     */
    List<TourSummary> summarize(List<Tour> list, Instant now, Instant from, Instant to) {
        if (list.isEmpty()) return new ArrayList<>();
        Set<Long> ids = list.stream().map(Tour::getId).collect(Collectors.toSet());
        Map<Long, List<TourDeparture>> open = departures.findOpenUpcomingForTours(ids, now).stream()
                .collect(Collectors.groupingBy(d -> d.getTour().getId()));
        Map<Long, Object[]> ratings = reviews.ratingStats(ids).stream().collect(Collectors.toMap(r -> (Long) r[0], r -> r));
        List<TourSummary> out = new ArrayList<>();
        for (Tour t : list) {
            List<TourDeparture> ds = open.getOrDefault(t.getId(), List.of());
            List<TourDeparture> withSeats = ds.stream().filter(d -> d.availableSeats() > 0).toList();
            long fromPrice = withSeats.stream().mapToLong(TourDeparture::getAdultPrice).min().orElse(t.getPrice());
            Instant next = withSeats.stream().map(TourDeparture::getStartAt).findFirst().orElse(null);
            if (from != null || to != null) {
                List<TourDeparture> inRange = ds.stream().filter(d -> (from == null || !d.getStartAt().isBefore(from))
                        && (to == null || !d.getStartAt().isAfter(to))).toList();
                next = inRange.stream().filter(d -> d.availableSeats() > 0).map(TourDeparture::getStartAt).findFirst()
                        .orElse(inRange.isEmpty() ? null : inRange.get(0).getStartAt());
            }
            int seats = ds.stream().mapToInt(TourDeparture::availableSeats).sum();
            Object[] r = ratings.get(t.getId());
            out.add(new TourSummary(t, fromPrice, next, ds.size(), seats,
                    r == null ? null : Math.round(((Number) r[1]).doubleValue() * 10) / 10.0, r == null ? 0 : ((Number) r[2]).longValue()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public TourSummary summary(Long id, boolean viewerIsStaff) {
        Tour t = tours.findById(id).filter(x -> x.isPublic() || viewerIsStaff).orElseThrow(() -> BusinessException.notFound("tour"));
        return summarize(List.of(t), time.now()).get(0);
    }

    @Transactional(readOnly = true)
    public List<TourDetail> itinerary(Long tourId) { return details.findByTourIdOrderByDisplayOrder(tourId); }

    @Transactional(readOnly = true)
    public List<TourImage> images(Long tourId) { return images.findByTourIdOrderBySortOrderAscIdAsc(tourId); }

    // --------------------------------------------------------------- manager
    @Transactional(readOnly = true)
    public Page<TourSummary> searchManager(String keyword, TourStatus status, int page, int size) {
        Specification<Tour> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + foldD(keyword) + "%";
                ps.add(cb.or(cb.like(foldD(cb, root.get("title")), like), cb.like(cb.lower(root.get("tourCode")), like)));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        Page<Tour> p = tours.findAll(spec, PageRequest.of(page, size, Sort.by("updatedAt").descending()));
        return new PageImpl<>(summarize(p.getContent(), time.now()), p.getPageable(), p.getTotalElements());
    }

    @Transactional
    public Tour create(TourCommand c, Long actorId) {
        if (tours.existsByTourCodeIgnoreCase(c.tourCode())) throw new BusinessException(ErrorCode.DUPLICATE_CODE, "Mã tour đã tồn tại");
        Tour t = new Tour(c.tourCode().trim().toUpperCase(), time.now());
        apply(t, c);
        t = tours.save(t);
        audit.log(actorId, "CREATE", "tour", t.getId(), t.getTourCode());
        return t;
    }

    @Transactional
    public Tour update(Long id, TourCommand c, Long actorId) {
        Tour t = tours.findById(id).orElseThrow(() -> BusinessException.notFound("tour"));
        if (!t.getTourCode().equalsIgnoreCase(c.tourCode()) && tours.existsByTourCodeIgnoreCase(c.tourCode())) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE, "Mã tour đã tồn tại");
        }
        apply(t, c);
        audit.log(actorId, "UPDATE", "tour", id, "status=" + t.getStatus());
        return t;
    }

    private void apply(Tour t, TourCommand c) {
        TourCategory cat = categories.findById(c.categoryId()).orElseThrow(() -> BusinessException.notFound("danh mục"));
        Instant now = time.now();
        t.update(c.tourCode().trim().toUpperCase(), c.title().trim(), c.description().trim(), c.destination().trim(), c.price(),
                c.durationDays(), c.maxGuests(), blank(c.coverImageUrl()), cat, now);
        t.changeStatus(c.status() == null ? TourStatus.DRAFT : c.status(), now);
    }

    /** SRS UC-TM-03 A3 + 9.2: tour đã có đợt/booking thì chỉ ẩn, không xoá. */
    @Transactional
    public boolean delete(Long id, Long actorId) {
        Tour t = tours.findById(id).orElseThrow(() -> BusinessException.notFound("tour"));
        if (departures.countByTourId(id) == 0) {
            details.deleteByTourId(id);
            images.findByTourIdOrderBySortOrderAscIdAsc(id).forEach(images::delete);
            tours.delete(t);
            audit.log(actorId, "DELETE", "tour", id, t.getTourCode());
            return true;
        }
        t.changeStatus(TourStatus.INACTIVE, time.now());
        audit.log(actorId, "DEACTIVATE", "tour", id, "đã có đợt khởi hành nên chuyển INACTIVE");
        return false;
    }

    @Transactional
    public List<TourDetail> replaceItinerary(Long tourId, List<ItineraryItem> items, Long actorId) {
        tours.findById(tourId).orElseThrow(() -> BusinessException.notFound("tour"));
        Set<Integer> orders = new HashSet<>();
        for (ItineraryItem i : items) {
            if (!orders.add(i.displayOrder())) throw new BusinessException(ErrorCode.BAD_REQUEST, "Thứ tự trong lịch trình bị trùng");
        }
        details.deleteByTourId(tourId);
        for (ItineraryItem i : items) {
            Place p = places.findById(i.placeId()).orElseThrow(() -> BusinessException.notFound("địa điểm #" + i.placeId()));
            details.save(new TourDetail(tourId, p, i.displayOrder()));
        }
        audit.log(actorId, "UPDATE_ITINERARY", "tour", tourId, items.size() + " điểm");
        return details.findByTourIdOrderByDisplayOrder(tourId);
    }

    @Transactional
    public TourImage addImage(Long tourId, String url) {
        tours.findById(tourId).orElseThrow(() -> BusinessException.notFound("tour"));
        int order = images.findByTourIdOrderBySortOrderAscIdAsc(tourId).size();
        return images.save(new TourImage(tourId, url.trim(), order));
    }

    @Transactional
    public void deleteImage(Long tourId, Long imageId) {
        TourImage img = images.findById(imageId).filter(i -> i.getTourId().equals(tourId))
                .orElseThrow(() -> BusinessException.notFound("ảnh"));
        images.delete(img);
    }

    private static String blank(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    /*
     * Tìm không dấu: cột utf8mb4_unicode_ci đã so khớp bỏ dấu ("phu quoc" = "Phú Quốc") nhưng coi "đ" ≠ "d"
     * (TourSearchIT). Đổi đ → d ở cả hai vế rồi để collation lo phần dấu còn lại.
     */
    static String foldD(String keyword) { return keyword.trim().toLowerCase().replace('đ', 'd'); }

    private static Expression<String> foldD(CriteriaBuilder cb, Expression<String> column) {
        return cb.function("replace", String.class, cb.lower(column), cb.literal("đ"), cb.literal("d"));
    }
}
