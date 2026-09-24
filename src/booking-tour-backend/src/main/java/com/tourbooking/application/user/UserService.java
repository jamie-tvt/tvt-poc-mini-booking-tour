package com.tourbooking.application.user;

import com.tourbooking.application.audit.AuditService;
import com.tourbooking.application.auth.AuthService;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.user.Role;
import com.tourbooking.domain.user.User;
import com.tourbooking.infrastructure.persistence.jpa.JpaUserRepository;
import com.tourbooking.infrastructure.persistence.jpa.JpaUserRoleRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final JpaUserRepository users;
    private final JpaUserRoleRepository roles;
    private final PasswordEncoder encoder;
    private final AuthService auth;
    private final AuditService audit;
    private final TimeProvider time;

    public UserService(JpaUserRepository users, JpaUserRoleRepository roles, PasswordEncoder encoder, AuthService auth,
                       AuditService audit, TimeProvider time) {
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.auth = auth;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public User get(Long id) { return users.findById(id).orElseThrow(() -> BusinessException.notFound("tài khoản")); }

    @Transactional
    public User updateMe(Long id, String fullName, String phone, String address) {
        User u = get(id);
        u.updateProfile(fullName.trim(), blank(phone), blank(address));
        return u;
    }

    @Transactional(readOnly = true)
    public Page<User> search(String keyword, Role role, Pageable pageable) {
        return users.search(blank(keyword), role == null ? null : role.name(), pageable);
    }

    @Transactional(readOnly = true)
    public List<User> guides() { return users.findByRoleName(Role.TOUR_GUIDE.name()); }

    @Transactional
    public User create(String fullName, String email, String password, String phone, Role role, Long actorId) {
        if (users.existsByEmailIgnoreCase(email)) throw new BusinessException(ErrorCode.EMAIL_EXISTS, "Email này đã được đăng ký");
        User u = users.save(new User(roles.findByName(role.name()).orElseThrow(), fullName.trim(), email.trim(),
                encoder.encode(password), blank(phone), time.now()));
        audit.log(actorId, "CREATE", "user", u.getId(), "role=" + role);
        return u;
    }

    @Transactional
    public User update(Long id, String fullName, String phone, Role role, Long actorId) {
        User u = get(id);
        if (id.equals(actorId) && role != u.getRole()) throw BusinessException.rule("Không thể tự đổi vai trò của chính mình");
        u.updateProfile(fullName.trim(), blank(phone), u.getAddress());
        if (role != u.getRole()) {
            audit.log(actorId, "CHANGE_ROLE", "user", id, u.getRole() + " → " + role);
            u.changeRole(roles.findByName(role.name()).orElseThrow());
        }
        return u;
    }

    @Transactional
    public User setActive(Long id, boolean active, Long actorId) {
        if (id.equals(actorId) && !active) throw BusinessException.rule("Không thể tự khoá tài khoản của chính mình");
        User u = get(id);
        u.setActive(active);
        if (!active) auth.revokeAll(id);
        audit.log(actorId, active ? "UNLOCK" : "LOCK", "user", id, null);
        return u;
    }

    private static String blank(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
