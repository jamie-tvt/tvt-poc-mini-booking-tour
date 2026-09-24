package com.tourbooking.application.tour;

import java.time.Instant;

public record TourSearchFilter(String keyword, Long categoryId, Long minPrice, Long maxPrice,
                               Instant departFrom, Instant departTo, String sort) {}
