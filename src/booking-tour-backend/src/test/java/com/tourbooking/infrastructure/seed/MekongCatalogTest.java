package com.tourbooking.infrastructure.seed;

import static org.assertj.core.api.Assertions.*;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/** Catalog 200 tour miền Tây: vừa cột DB (V1__init_schema.sql), địa điểm tham chiếu tồn tại, ảnh là link CDN Unsplash. */
class MekongCatalogTest {
    private final MekongCatalog catalog = MekongCatalog.load();

    @Test
    void has200ToursWithUniqueCodesAndTitles() {
        assertThat(catalog.tours()).hasSize(200);
        assertThat(catalog.tours().stream().map(MekongCatalog.TourRow::code).collect(Collectors.toSet())).hasSize(200);
        assertThat(catalog.tours().stream().map(MekongCatalog.TourRow::title).collect(Collectors.toSet())).hasSize(200);
        // Không đụng mã tour của 8 tour demo gốc (MT-CR-01 …)
        assertThat(catalog.tours()).allSatisfy(t -> assertThat(t.code()).matches("[A-Z]{2}-[A-Z]{2}-1\\d{2}"));
    }

    @Test
    void valuesFitDatabaseColumns() {
        assertThat(catalog.categories()).allSatisfy(c -> assertThat(c.length()).isLessThanOrEqualTo(80));
        assertThat(catalog.places()).allSatisfy(p -> assertThat(p.name().length()).isLessThanOrEqualTo(120));
        assertThat(catalog.tours()).allSatisfy(t -> {
            assertThat(t.code().length()).isLessThanOrEqualTo(20);
            assertThat(t.title().length()).isLessThanOrEqualTo(160);
            assertThat(t.destination().length()).isLessThanOrEqualTo(120);
            assertThat(t.description()).isNotBlank();
            assertThat(t.price()).isPositive();
            assertThat(t.durationDays()).isBetween(1, 4);
            assertThat(t.maxGuests()).isPositive();
        });
    }

    @Test
    void everyTourHasItineraryImagesAndFutureDepartures() {
        Set<String> placeNames = catalog.places().stream().map(MekongCatalog.PlaceRow::name).collect(Collectors.toSet());
        assertThat(catalog.tours()).allSatisfy(t -> {
            assertThat(t.places()).isNotEmpty().allSatisfy(p -> assertThat(placeNames).contains(p));
            assertThat(t.images()).hasSizeBetween(3, 6).doesNotHaveDuplicates().allSatisfy(url -> {
                assertThat(url).startsWith("https://images.unsplash.com/photo-").endsWith("?auto=format&fit=crop&w=1200&q=75");
                assertThat(url.length()).isLessThanOrEqualTo(255);
            });
            assertThat(t.departures()).hasSize(3).allSatisfy(d -> {
                assertThat(d.daysAhead()).isGreaterThanOrEqualTo(3);
                assertThat(d.capacity()).isEqualTo(t.maxGuests());
            });
        });
    }

    @Test
    void coversAllThirteenProvincesAndCreditsEveryPhoto() {
        assertThat(catalog.places().stream().map(MekongCatalog.PlaceRow::province).distinct()).hasSize(13);
        Set<String> used = new HashSet<>();
        catalog.tours().forEach(t -> t.images().forEach(u -> used.add(u.replaceAll(".*/photo-([0-9]+-[0-9a-f]+)\\?.*", "$1"))));
        assertThat(catalog.credits()).containsOnlyKeys(used);
        assertThat(catalog.credits().values()).allSatisfy(author -> assertThat(author).isNotBlank());
    }
}
