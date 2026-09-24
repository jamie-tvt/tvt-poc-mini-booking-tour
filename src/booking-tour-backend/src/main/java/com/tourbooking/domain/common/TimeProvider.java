package com.tourbooking.domain.common;

import java.time.Instant;

/** Đồng hồ nghiệp vụ. Tách khỏi Instant.now() để demo và test "dời thời gian" được. */
public interface TimeProvider {
    Instant now();
}
