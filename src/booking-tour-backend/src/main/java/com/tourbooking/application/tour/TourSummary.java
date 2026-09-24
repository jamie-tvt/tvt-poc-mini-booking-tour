package com.tourbooking.application.tour;

import com.tourbooking.domain.tour.Tour;
import java.time.Instant;

/** Tour kèm số liệu tính từ các đợt đang mở bán và đánh giá. */
public record TourSummary(Tour tour, long fromPrice, Instant nextDepartureAt, int openDepartureCount, int availableSeats,
                          Double ratingAverage, long ratingCount) {}
