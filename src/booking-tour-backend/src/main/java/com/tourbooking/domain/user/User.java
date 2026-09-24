package com.tourbooking.domain.user;

import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id")
    private UserRole role;
    @Column(name = "full_name", nullable = false)
    private String fullName;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    private String phone;
    private String address;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected User() {}

    public User(UserRole role, String fullName, String email, String passwordHash, String phone, Instant createdAt) {
        this.role = role;
        this.fullName = fullName;
        this.email = email.toLowerCase();
        this.passwordHash = passwordHash;
        this.phone = phone;
        this.createdAt = createdAt;
    }

    public void assertCanLogin() {
        if (!active) throw new BusinessException(ErrorCode.ACCOUNT_DISABLED, "Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên");
    }

    public void updateProfile(String fullName, String phone, String address) {
        this.fullName = fullName;
        this.phone = phone;
        this.address = address;
    }

    public void changeRole(UserRole role) { this.role = role; }
    public void setActive(boolean active) { this.active = active; }
    public void changePassword(String hash) { this.passwordHash = hash; }

    public Long getId() { return id; }
    public Role getRole() { return role.toRole(); }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
