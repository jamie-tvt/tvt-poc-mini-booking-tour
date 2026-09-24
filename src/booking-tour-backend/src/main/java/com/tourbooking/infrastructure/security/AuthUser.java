package com.tourbooking.infrastructure.security;

import com.tourbooking.domain.user.Role;

/** Principal trong SecurityContext. */
public record AuthUser(Long id, String email, String fullName, Role role) {
    public boolean isStaff() { return role.isStaff(); }
}
