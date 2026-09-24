package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.user.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaUserRoleRepository extends JpaRepository<UserRole, Long> {
    Optional<UserRole> findByName(String name);
}
