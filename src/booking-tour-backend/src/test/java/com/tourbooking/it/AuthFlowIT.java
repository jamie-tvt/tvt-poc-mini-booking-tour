package com.tourbooking.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.tourbooking.domain.user.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;

class AuthFlowIT extends IntegrationTestBase {

    @Test
    void register_login_refresh_rotation_and_reuse_detection() {
        String email = "khach-" + UUID.randomUUID() + "@it.test";
        var reg = post("/api/v1/auth/register", null,
                "{\"fullName\":\"Khách Mới\",\"email\":\"" + email + "\",\"password\":\"12345678\",\"confirmPassword\":\"12345678\"}");
        assertThat(reg.getStatusCode().value()).isEqualTo(201);
        assertThat(reg.getBody().path("data").path("role").asText()).isEqualTo("CUSTOMER");

        var dup = post("/api/v1/auth/register", null,
                "{\"fullName\":\"Khách Mới\",\"email\":\"" + email + "\",\"password\":\"12345678\",\"confirmPassword\":\"12345678\"}");
        assertThat(dup.getBody().path("code").asText()).isEqualTo("EMAIL_EXISTS");

        JsonNode login = post("/api/v1/auth/login", null, "{\"email\":\"" + email + "\",\"password\":\"12345678\"}").getBody().path("data");
        String access = login.path("accessToken").asText();
        String refresh1 = login.path("refreshToken").asText();
        assertThat(get("/api/v1/users/me", access).getBody().path("data").path("email").asText()).isEqualTo(email);

        JsonNode rotated = post("/api/v1/auth/refresh", null, "{\"refreshToken\":\"" + refresh1 + "\"}").getBody();
        assertThat(rotated.path("success").asBoolean()).isTrue();
        String refresh2 = rotated.path("data").path("refreshToken").asText();
        assertThat(refresh2).isNotEqualTo(refresh1);

        // Dùng lại token cũ → coi như bị đánh cắp: từ chối và thu hồi cả chuỗi (token mới cũng chết)
        var reuse = post("/api/v1/auth/refresh", null, "{\"refreshToken\":\"" + refresh1 + "\"}");
        assertThat(reuse.getStatusCode().value()).isEqualTo(401);
        assertThat(reuse.getBody().path("code").asText()).isEqualTo("INVALID_REFRESH_TOKEN");
        assertThat(post("/api/v1/auth/refresh", null, "{\"refreshToken\":\"" + refresh2 + "\"}").getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void wrong_password_and_validation_errors_use_ApiResponse_format() {
        var bad = post("/api/v1/auth/login", null, "{\"email\":\"nobody@it.test\",\"password\":\"x\"}");
        assertThat(bad.getStatusCode().value()).isEqualTo(401);
        assertThat(bad.getBody().path("code").asText()).isEqualTo("INVALID_CREDENTIALS");
        assertThat(bad.getBody().path("requestId").asText()).isNotBlank();

        var invalid = post("/api/v1/auth/register", null, "{\"fullName\":\"\",\"email\":\"sai\",\"password\":\"1\",\"confirmPassword\":\"1\"}");
        assertThat(invalid.getStatusCode().value()).isEqualTo(400);
        assertThat(invalid.getBody().path("errors").size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void role_guards_on_api_not_only_on_ui() {
        String customer = login(newUser(Role.CUSTOMER));
        assertThat(get("/api/v1/users/me", null).getStatusCode().value()).isEqualTo(401);
        assertThat(get("/api/v1/admin/users", customer).getStatusCode().value()).isEqualTo(403);
        assertThat(call(HttpMethod.POST, "/api/v1/categories", customer, "{\"name\":\"X\"}").getStatusCode().value()).isEqualTo(403);
        String manager = login(newUser(Role.TOUR_MANAGER));
        assertThat(get("/api/v1/admin/users", manager).getStatusCode().value()).isEqualTo(403);
        assertThat(get("/api/v1/admin/bookings", manager).getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void locked_account_is_rejected_immediately() {
        var u = newUser(Role.CUSTOMER);
        String token = login(u);
        users.setActive(u.getId(), false, null);
        var res = get("/api/v1/users/me", token);
        assertThat(res.getStatusCode().value()).isEqualTo(403);
        assertThat(res.getBody().path("code").asText()).isEqualTo("ACCOUNT_DISABLED");
    }
}
