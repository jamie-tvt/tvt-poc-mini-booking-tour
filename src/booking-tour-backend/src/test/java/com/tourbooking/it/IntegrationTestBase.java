package com.tourbooking.it;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tourbooking.application.departure.DepartureCommand;
import com.tourbooking.application.departure.DepartureService;
import com.tourbooking.application.tour.TourCommand;
import com.tourbooking.application.tour.TourService;
import com.tourbooking.application.user.UserService;
import com.tourbooking.domain.departure.TourDeparture;
import com.tourbooking.domain.tour.TourCategory;
import com.tourbooking.domain.tour.TourStatus;
import com.tourbooking.domain.user.Role;
import com.tourbooking.domain.user.User;
import com.tourbooking.infrastructure.config.OffsetTimeProvider;
import com.tourbooking.infrastructure.persistence.jpa.JpaTourCategoryRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.*;
import org.testcontainers.containers.MySQLContainer;

/** MySQL thật trong Docker, dùng chung cho mọi test integration (khởi động một lần). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.seed-demo=false", "app.jobs.expiry-interval-ms=3600000", "app.demo-tools=true"})
public abstract class IntegrationTestBase {
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0").withDatabaseName("booking_tour");

    static { MYSQL.start(); }

    @Autowired protected TestRestTemplate http;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserService users;
    @Autowired protected TourService tours;
    @Autowired protected DepartureService departures;
    @Autowired protected JpaTourCategoryRepository categories;
    @Autowired protected OffsetTimeProvider clock;

    protected static final String PW = "12345678";
    private static User admin;

    @AfterEach
    void resetClock() { clock.setOffsetMinutes(0); }

    protected User newUser(Role role) {
        if (admin == null) admin = users.create("Admin IT", "admin-" + UUID.randomUUID() + "@it.test", PW, null, Role.ADMIN, null);
        return users.create(role + " IT", role.name().toLowerCase() + "-" + UUID.randomUUID() + "@it.test", PW, "0900000000", role, admin.getId());
    }

    protected TourDeparture newDeparture(int capacity, Long guideId, Duration startIn) {
        TourCategory cat = categories.save(new TourCategory("Cat " + UUID.randomUUID()));
        String code = "IT-" + UUID.randomUUID().toString().substring(0, 8);
        var tour = tours.create(new TourCommand(code, "Tour kiểm thử", "Mô tả", "Cần Thơ", 1, 50, 1_000_000, cat.getId(), null, TourStatus.ACTIVE), null);
        Instant start = Instant.now().plus(startIn);
        return departures.create(tour.getId(), new DepartureCommand(start, start.plus(Duration.ofHours(10)), capacity, null, null, guideId), null);
    }

    protected String login(User u) {
        JsonNode res = post("/api/v1/auth/login", null, "{\"email\":\"" + u.getEmail() + "\",\"password\":\"" + PW + "\"}").getBody();
        return res.path("data").path("accessToken").asText();
    }

    protected ResponseEntity<JsonNode> post(String path, String token, String body) { return call(HttpMethod.POST, path, token, body); }
    protected ResponseEntity<JsonNode> get(String path, String token) { return call(HttpMethod.GET, path, token, null); }

    protected ResponseEntity<JsonNode> call(HttpMethod method, String path, String token, String body) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        return http.exchange(path, method, new HttpEntity<>(body, h), JsonNode.class);
    }

    protected ResponseEntity<JsonNode> postRaw(String path, String body, String headerName, String headerValue) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (headerName != null) h.set(headerName, headerValue);
        return http.exchange(path, HttpMethod.POST, new HttpEntity<>(body, h), JsonNode.class);
    }

    protected long createBooking(String token, long departureId, int adults) {
        var res = post("/api/v1/bookings", token, "{\"departureId\":" + departureId + ",\"adultQuantity\":" + adults + ",\"childQuantity\":0}");
        if (res.getStatusCode().value() != 201) throw new AssertionError("Tạo booking lỗi: " + res.getBody());
        return res.getBody().path("data").path("id").asLong();
    }
}
