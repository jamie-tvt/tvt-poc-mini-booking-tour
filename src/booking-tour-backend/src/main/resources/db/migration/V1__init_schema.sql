-- Booking Tour — schema v1 (POC mentor)
-- Dựa trên Database Design v1.1 của Team A; phần khác ghi "-- ≠ intern:" kèm lý do.

CREATE TABLE user_roles (
  id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL,
  CONSTRAINT uq_user_roles_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(64) NOT NULL,
  description VARCHAR(255) NULL,
  CONSTRAINT uq_permissions_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id       BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES user_roles(id),
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id),
  CONSTRAINT uq_rp UNIQUE (role_id, permission_id)          -- ≠ intern: chống gán trùng quyền
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id       BIGINT NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NULL,
  address       VARCHAR(255) NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME(6)  NOT NULL,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES user_roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ≠ intern: API doc lưu refresh token trong DB nhưng DB Design chưa có bảng
CREATE TABLE refresh_tokens (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT      NOT NULL,
  token_hash  VARCHAR(64) NOT NULL,           -- SHA-256, không lưu token thô
  family_id   VARCHAR(36) NOT NULL,           -- chuỗi xoay vòng; dùng lại token cũ → thu hồi cả chuỗi
  expires_at  DATETIME(6) NOT NULL,
  revoked_at  DATETIME(6) NULL,
  created_at  DATETIME(6) NOT NULL,
  CONSTRAINT uq_refresh_hash UNIQUE (token_hash),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_refresh_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tour_categories (
  id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE places (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tours (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  tour_code       VARCHAR(20)  NOT NULL,
  title           VARCHAR(160) NOT NULL,
  description     TEXT         NOT NULL,
  destination     VARCHAR(120) NOT NULL,       -- ≠ intern: SRS yêu cầu "điểm đến" nhưng DB chưa có cột
  price           BIGINT       NOT NULL,       -- ≠ intern: VND không có phần lẻ → BIGINT thay DECIMAL
  duration_days   INT          NOT NULL,
  max_guests      INT          NOT NULL,       -- SRS 9.2 "số khách tối đa"
  cover_image_url VARCHAR(255) NULL,
  status          VARCHAR(16)  NOT NULL,
  category_id     BIGINT       NOT NULL,
  created_at      DATETIME(6)  NOT NULL,
  updated_at      DATETIME(6)  NOT NULL,
  CONSTRAINT uq_tours_code UNIQUE (tour_code),
  CONSTRAINT fk_tours_category FOREIGN KEY (category_id) REFERENCES tour_categories(id),
  CONSTRAINT ck_tours_price CHECK (price >= 0),
  CONSTRAINT ck_tours_duration CHECK (duration_days > 0),
  CONSTRAINT ck_tours_max_guests CHECK (max_guests > 0),
  CONSTRAINT ck_tours_status CHECK (status IN ('DRAFT','ACTIVE','INACTIVE')),
  INDEX ix_tours_status (status),
  INDEX ix_tours_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tour_images (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  tour_id    BIGINT       NOT NULL,
  image_url  VARCHAR(255) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_images_tour FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tour_details (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tour_id       BIGINT NOT NULL,
  place_id      BIGINT NOT NULL,
  display_order INT    NOT NULL,
  CONSTRAINT fk_details_tour FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
  CONSTRAINT fk_details_place FOREIGN KEY (place_id) REFERENCES places(id),
  CONSTRAINT uq_details_order UNIQUE (tour_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tour_departures (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tour_id       BIGINT      NOT NULL,
  tour_guide_id BIGINT      NULL,              -- ≠ intern: NOT NULL ở DB Design nhưng SRS UC-TDM-01 cho phép chưa phân công
  capacity      INT         NOT NULL,
  booked_seats  INT         NOT NULL DEFAULT 0, -- ≠ intern: đếm chỗ đã giữ, khoá dòng khi đặt → chống oversell
  adult_price   BIGINT      NOT NULL,           -- ≠ intern: giá theo đợt + vé trẻ em
  child_price   BIGINT      NOT NULL,
  start_at      DATETIME(6) NOT NULL,
  end_at        DATETIME(6) NOT NULL,
  status        VARCHAR(16) NOT NULL,
  cancel_reason VARCHAR(255) NULL,
  created_at    DATETIME(6) NOT NULL,
  updated_at    DATETIME(6) NOT NULL,
  CONSTRAINT fk_dep_tour FOREIGN KEY (tour_id) REFERENCES tours(id),
  CONSTRAINT fk_dep_guide FOREIGN KEY (tour_guide_id) REFERENCES users(id),
  CONSTRAINT ck_dep_capacity CHECK (capacity > 0),
  CONSTRAINT ck_dep_seats CHECK (booked_seats >= 0 AND booked_seats <= capacity),
  CONSTRAINT ck_dep_time CHECK (end_at > start_at),
  CONSTRAINT ck_dep_price CHECK (adult_price >= 0 AND child_price >= 0),
  CONSTRAINT ck_dep_status CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  INDEX ix_dep_tour_start (tour_id, start_at),
  INDEX ix_dep_guide (tour_guide_id, start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_code      VARCHAR(16) NOT NULL,       -- ≠ intern: mã hiển thị cho khách thay vì lộ id
  user_id           BIGINT      NOT NULL,
  tour_departure_id BIGINT      NOT NULL,
  adult_quantity    INT         NOT NULL,
  child_quantity    INT         NOT NULL,
  ticket_quantity   INT         NOT NULL,
  total_price       BIGINT      NOT NULL,
  status            VARCHAR(16) NOT NULL,
  booked_at         DATETIME(6) NOT NULL,
  expires_at        DATETIME(6) NULL,           -- ≠ intern: hạn thanh toán của booking PENDING
  cancelled_at      DATETIME(6) NULL,
  cancel_reason     VARCHAR(255) NULL,
  completed_at      DATETIME(6) NULL,
  CONSTRAINT uq_bookings_code UNIQUE (booking_code),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_dep FOREIGN KEY (tour_departure_id) REFERENCES tour_departures(id),
  CONSTRAINT ck_bookings_qty CHECK (adult_quantity >= 1 AND child_quantity >= 0 AND ticket_quantity = adult_quantity + child_quantity),
  CONSTRAINT ck_bookings_total CHECK (total_price >= 0),
  CONSTRAINT ck_bookings_status CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','EXPIRED')),
  INDEX ix_bookings_user (user_id, booked_at),
  INDEX ix_bookings_status_exp (status, expires_at),
  INDEX ix_bookings_dep (tour_departure_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bills (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT      NOT NULL,
  bill_code  VARCHAR(20) NOT NULL,
  amount     BIGINT      NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT uq_bills_booking UNIQUE (booking_id),
  CONSTRAINT uq_bills_code UNIQUE (bill_code),
  CONSTRAINT fk_bills_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bill 1:N payment (theo mục 5 DB Design intern) để thanh toán lại sau khi thất bại
CREATE TABLE payments (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  bill_id          BIGINT      NOT NULL,
  amount           BIGINT      NOT NULL,
  refund_amount    BIGINT      NULL,
  provider         VARCHAR(16) NOT NULL,
  transaction_code VARCHAR(80) NULL,            -- UNIQUE → webhook gửi lại không tạo giao dịch thứ hai
  payment_method   VARCHAR(32) NULL,
  status           VARCHAR(16) NOT NULL,
  note             VARCHAR(255) NULL,
  created_at       DATETIME(6) NOT NULL,
  paid_at          DATETIME(6) NULL,
  CONSTRAINT uq_payments_txn UNIQUE (transaction_code),
  CONSTRAINT fk_payments_bill FOREIGN KEY (bill_id) REFERENCES bills(id),
  CONSTRAINT ck_payments_amount CHECK (amount >= 0),
  CONSTRAINT ck_payments_status CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED','CANCELLED')),
  INDEX ix_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT      NOT NULL,
  tour_id    BIGINT      NOT NULL,
  booking_id BIGINT      NOT NULL,
  rating     INT         NOT NULL,
  content    TEXT        NOT NULL,
  status     VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT uq_reviews_booking UNIQUE (booking_id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reviews_tour FOREIGN KEY (tour_id) REFERENCES tours(id),
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ck_reviews_status CHECK (status IN ('VISIBLE','HIDDEN')),
  INDEX ix_reviews_tour (tour_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  booking_id BIGINT       NULL,
  title      VARCHAR(160) NOT NULL,
  content    TEXT         NOT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at DATETIME(6)  NOT NULL,             -- ≠ intern: VARCHAR → DATETIME
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notif_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  INDEX ix_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT       NULL,                -- ≠ intern: NULL cho thao tác của hệ thống (job, webhook)
  action      VARCHAR(40)  NOT NULL,
  entity_type VARCHAR(40)  NOT NULL,
  entity_id   BIGINT       NULL,
  result      VARCHAR(16)  NOT NULL,
  detail      VARCHAR(500) NULL,
  created_at  DATETIME(6)  NOT NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  setting_key   VARCHAR(80)  NOT NULL,
  setting_value TEXT         NULL,
  description   VARCHAR(255) NULL,
  updated_by    BIGINT       NULL,
  updated_at    DATETIME(6)  NOT NULL,
  CONSTRAINT uq_settings_key UNIQUE (setting_key),
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
