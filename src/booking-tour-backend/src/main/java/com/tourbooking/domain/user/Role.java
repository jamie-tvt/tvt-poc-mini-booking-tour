package com.tourbooking.domain.user;

public enum Role { CUSTOMER, TOUR_GUIDE, TOUR_MANAGER, ADMIN;
    public boolean isStaff() { return this == TOUR_MANAGER || this == ADMIN; }
}
