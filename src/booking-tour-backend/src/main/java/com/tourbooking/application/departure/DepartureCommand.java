package com.tourbooking.application.departure;

import java.time.Instant;

public record DepartureCommand(Instant startAt, Instant endAt, int capacity, Long adultPrice, Long childPrice, Long tourGuideId) {}
