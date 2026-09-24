package com.tourbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.tourbooking.application.departure.DepartureCommand;
import com.tourbooking.application.tour.TourCommand;
import com.tourbooking.domain.tour.Tour;
import com.tourbooking.domain.tour.TourCategory;
import com.tourbooking.domain.tour.TourStatus;
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * F1: tìm tour gõ không dấu ("phu quoc", "can tho", "dong thap") phải ra tour có dấu — khoá hành vi collation MySQL.
 * F2: lọc theo khoảng ngày thì nextDepartureAt trên thẻ là đợt nằm TRONG khoảng lọc.
 * Mỗi tour có danh mục riêng để kết quả không lẫn với tour của test khác.
 */
class TourSearchIT extends IntegrationTestBase {
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private record Created(Tour tour, TourCategory cat) {}

    private Created newTour(String title, String destination) {
        TourCategory cat = categories.save(new TourCategory("Cat " + UUID.randomUUID()));
        String code = "IT-" + UUID.randomUUID().toString().substring(0, 8);
        Tour t = tours.create(new TourCommand(code, title, "Mô tả", destination, 1, 30, 900_000, cat.getId(), null, TourStatus.ACTIVE), null);
        return new Created(t, cat);
    }

    private List<String> codes(String query) {
        JsonNode res = get("/api/v1/tours?" + query + "&size=100", null).getBody();
        List<String> out = new ArrayList<>();
        res.path("data").path("content").forEach(n -> out.add(n.path("tourCode").asText()));
        return out;
    }

    @Test
    void keyword_without_diacritics_matches_vietnamese_title_and_destination() {
        var pq = newTour("Phú Quốc – Nam đảo và cáp treo Hòn Thơm", "Kiên Giang");
        var ct = newTour("Chợ nổi Cái Răng – Vườn trái cây", "Cần Thơ");
        var dt = newTour("Đồng Tháp – Vườn quốc gia Tràm Chim", "Đồng Tháp");

        assertThat(codes("keyword=phu quoc&categoryId=" + pq.cat().getId())).containsExactly(pq.tour().getTourCode());
        assertThat(codes("keyword=Phú Quốc&categoryId=" + pq.cat().getId())).containsExactly(pq.tour().getTourCode());
        assertThat(codes("keyword=can tho&categoryId=" + ct.cat().getId())).containsExactly(ct.tour().getTourCode());
        assertThat(codes("keyword=cho noi&categoryId=" + ct.cat().getId())).containsExactly(ct.tour().getTourCode());
        // Chữ đ/Đ ↔ d/D
        assertThat(codes("keyword=dong thap&categoryId=" + dt.cat().getId())).containsExactly(dt.tour().getTourCode());
        assertThat(codes("keyword=ĐỒNG THÁP&categoryId=" + dt.cat().getId())).containsExactly(dt.tour().getTourCode());
        assertThat(codes("keyword=nam dao&categoryId=" + pq.cat().getId())).containsExactly(pq.tour().getTourCode());
        // Ô tìm kiếm của quản lý cũng bỏ dấu
        assertThat(tours.searchManager("dong thap", null, 0, 100).getContent()).extracting(x -> x.tour().getTourCode())
                .contains(dt.tour().getTourCode());
        // Không khớp thì không ra
        assertThat(codes("keyword=ha long&categoryId=" + pq.cat().getId())).isEmpty();
    }

    @Test
    void date_filter_shows_first_departure_inside_the_range_on_card() {
        var c = newTour("Tour lọc ngày", "Cần Thơ");
        LocalDate today = LocalDate.now(VN);
        Instant d10 = today.plusDays(10).atTime(7, 0).atZone(VN).toInstant();
        Instant d24 = today.plusDays(24).atTime(7, 0).atZone(VN).toInstant();
        Instant d38 = today.plusDays(38).atTime(7, 0).atZone(VN).toInstant();
        for (Instant s : List.of(d10, d24, d38)) {
            departures.create(c.tour().getId(), new DepartureCommand(s, s.plus(Duration.ofHours(10)), 20, null, null, null), null);
        }

        JsonNode all = get("/api/v1/tours?categoryId=" + c.cat().getId(), null).getBody().path("data").path("content");
        assertThat(Instant.parse(all.get(0).path("nextDepartureAt").asText())).isEqualTo(d10);

        String range = "departFrom=" + today.plusDays(20) + "&departTo=" + today.plusDays(30);
        for (String sort : List.of("nextDeparture", "price,asc")) {
            JsonNode inRange = get("/api/v1/tours?categoryId=" + c.cat().getId() + "&" + range + "&sort=" + sort, null)
                    .getBody().path("data").path("content");
            assertThat(inRange).hasSize(1);
            assertThat(Instant.parse(inRange.get(0).path("nextDepartureAt").asText())).isEqualTo(d24);
        }

        JsonNode onlyFrom = get("/api/v1/tours?categoryId=" + c.cat().getId() + "&departFrom=" + today.plusDays(30), null)
                .getBody().path("data").path("content");
        assertThat(Instant.parse(onlyFrom.get(0).path("nextDepartureAt").asText())).isEqualTo(d38);
    }
}
