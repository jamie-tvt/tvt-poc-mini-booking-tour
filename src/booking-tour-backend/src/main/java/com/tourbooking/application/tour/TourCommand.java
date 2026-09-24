package com.tourbooking.application.tour;

import com.tourbooking.domain.tour.TourStatus;

public record TourCommand(String tourCode, String title, String description, String destination, int durationDays,
                          int maxGuests, long price, Long categoryId, String coverImageUrl, TourStatus status) {}
