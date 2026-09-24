package com.tourbooking.infrastructure.security;

import com.tourbooking.infrastructure.config.AppProperties;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final String API = "/api/v1";

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter, SecurityErrorWriter errors) throws Exception {
        http.csrf(c -> c.disable())            // API stateless dùng Bearer token, không dùng cookie → không cần CSRF token
            .cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(errors.entryPoint()).accessDeniedHandler(errors.accessDenied()))
            .authorizeHttpRequests(a -> a
                    .requestMatchers("/docs/**", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health").permitAll()
                    .requestMatchers(API + "/auth/register", API + "/auth/login", API + "/auth/refresh", API + "/auth/logout").permitAll()
                    .requestMatchers(HttpMethod.GET, API + "/tours", API + "/tours/*", API + "/tours/*/itinerary", API + "/tours/*/images",
                            API + "/tours/*/departures", API + "/tours/*/reviews", API + "/departures/*",
                            API + "/categories", API + "/places", API + "/demo/clock").permitAll()
                    .requestMatchers(HttpMethod.POST, API + "/payments/webhook/mock", API + "/payments/stripe/webhook").permitAll()
                    .requestMatchers(API + "/admin/**").hasAnyRole("ADMIN", "TOUR_MANAGER")   // chi tiết hơn bằng @PreAuthorize
                    .requestMatchers(API + "/manager/**").hasAnyRole("ADMIN", "TOUR_MANAGER")
                    .requestMatchers(API + "/guide/**").hasRole("TOUR_GUIDE")
                    .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.stream(props.corsOrigins().split(",")).map(String::trim).toList());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id"));
        cfg.setExposedHeaders(List.of("X-Request-Id"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
