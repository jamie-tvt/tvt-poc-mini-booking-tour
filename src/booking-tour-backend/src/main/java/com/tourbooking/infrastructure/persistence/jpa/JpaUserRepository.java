package com.tourbooking.infrastructure.persistence.jpa;

import com.tourbooking.domain.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaUserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    @Query("select u from User u where u.role.name = :role order by u.fullName")
    List<User> findByRoleName(@Param("role") String role);

    @Query("""
            select u from User u
            where (:keyword is null or lower(u.fullName) like lower(concat('%', :keyword, '%')) or lower(u.email) like lower(concat('%', :keyword, '%')))
              and (:role is null or u.role.name = :role)
            """)
    Page<User> search(@Param("keyword") String keyword, @Param("role") String role, Pageable pageable);

    @Query("select count(u) from User u where u.role.name = :role")
    long countByRoleName(@Param("role") String role);
}
