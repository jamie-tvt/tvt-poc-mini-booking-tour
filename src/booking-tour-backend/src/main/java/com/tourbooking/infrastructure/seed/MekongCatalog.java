package com.tourbooking.infrastructure.seed;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;

/**
 * Catalog 200 tour miền Tây (seed/mekong-catalog.json) — sinh bởi src/seed-catalog/generate.mjs, không sửa tay.
 * Bản demo offline (offline-demo/mock/db.ts) đọc CHÍNH file này nên dữ liệu hai bên luôn khớp.
 */
public record MekongCatalog(List<String> categories, List<PlaceRow> places, List<TourRow> tours, Map<String, String> credits) {

    public static final String RESOURCE = "/seed/mekong-catalog.json";

    public record PlaceRow(String province, String name, String description) {}

    public record TourRow(String code, String title, String destination, String category, long price, int durationDays,
                          int maxGuests, String description, List<String> places, List<String> images, List<DepartureRow> departures) {}

    /** daysAhead: số ngày tính từ hôm nay (giờ VN) — đợt khởi hành lúc 7 giờ sáng. */
    public record DepartureRow(int daysAhead, int capacity) {}

    public static MekongCatalog load() {
        try (InputStream in = MekongCatalog.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("Thiếu " + RESOURCE);
            return new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false).readValue(in, MekongCatalog.class);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
