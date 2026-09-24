INSERT INTO user_roles (name) VALUES ('CUSTOMER'), ('TOUR_GUIDE'), ('TOUR_MANAGER'), ('ADMIN');

INSERT INTO permissions (name, description) VALUES
 ('TOUR_READ', 'Xem tour'), ('TOUR_WRITE', 'Tạo, sửa, ẩn tour'),
 ('DEPARTURE_WRITE', 'Quản lý đợt khởi hành'), ('BOOKING_MANAGE', 'Xử lý đơn đặt tour'),
 ('PAYMENT_MANAGE', 'Xác minh, hoàn tiền'), ('USER_MANAGE', 'Quản lý tài khoản'),
 ('SETTING_MANAGE', 'Cấu hình hệ thống'), ('GUIDE_OPERATE', 'Cập nhật trạng thái đợt được phân công');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM user_roles r JOIN permissions p
 ON (r.name = 'CUSTOMER' AND p.name = 'TOUR_READ')
 OR (r.name = 'TOUR_GUIDE' AND p.name IN ('TOUR_READ','GUIDE_OPERATE'))
 OR (r.name = 'TOUR_MANAGER' AND p.name IN ('TOUR_READ','TOUR_WRITE','DEPARTURE_WRITE','BOOKING_MANAGE'))
 OR (r.name = 'ADMIN');

INSERT INTO system_settings (setting_key, setting_value, description, updated_at) VALUES
 ('booking.payment_timeout_minutes', '15', 'Hạn thanh toán của booking chờ thanh toán (phút)', NOW(6)),
 ('pricing.child_percent', '70', 'Giá vé trẻ em = % giá người lớn khi đợt không nhập giá riêng', NOW(6)),
 ('cancel.full_refund_days', '7', 'Huỷ trước ngày khởi hành ít nhất N ngày: hoàn 100%', NOW(6)),
 ('cancel.partial_refund_days', '3', 'Huỷ trước ít nhất N ngày (dưới mốc hoàn đủ): hoàn một phần', NOW(6)),
 ('cancel.partial_refund_percent', '50', 'Tỷ lệ hoàn một phần (%)', NOW(6)),
 ('guide.start_window_hours', '24', 'HDV được bắt đầu tour trước giờ khởi hành tối đa N giờ', NOW(6));
