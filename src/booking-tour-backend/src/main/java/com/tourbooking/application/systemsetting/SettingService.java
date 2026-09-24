package com.tourbooking.application.systemsetting;

import com.tourbooking.domain.booking.RefundPolicy;
import com.tourbooking.domain.common.BusinessException;
import com.tourbooking.domain.common.ErrorCode;
import com.tourbooking.domain.common.TimeProvider;
import com.tourbooking.domain.systemsetting.SystemSetting;
import com.tourbooking.infrastructure.persistence.jpa.JpaSystemSettingRepository;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tham số nghiệp vụ đổi được lúc chạy (SRS 7.5). Mọi giá trị đều là số nguyên. */
@Service
public class SettingService {
    public static final String PAYMENT_TIMEOUT = "booking.payment_timeout_minutes";
    public static final String CHILD_PERCENT = "pricing.child_percent";
    public static final String FULL_REFUND_DAYS = "cancel.full_refund_days";
    public static final String PARTIAL_REFUND_DAYS = "cancel.partial_refund_days";
    public static final String PARTIAL_REFUND_PERCENT = "cancel.partial_refund_percent";
    public static final String GUIDE_START_WINDOW = "guide.start_window_hours";

    private static final Map<String, int[]> RANGES = Map.of(
            PAYMENT_TIMEOUT, new int[] {1, 1440}, CHILD_PERCENT, new int[] {0, 100},
            FULL_REFUND_DAYS, new int[] {0, 365}, PARTIAL_REFUND_DAYS, new int[] {0, 365},
            PARTIAL_REFUND_PERCENT, new int[] {0, 100}, GUIDE_START_WINDOW, new int[] {0, 168});

    private final JpaSystemSettingRepository repo;
    private final TimeProvider time;

    public SettingService(JpaSystemSettingRepository repo, TimeProvider time) {
        this.repo = repo;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public int getInt(String key, int fallback) {
        return repo.findByKey(key).map(s -> {
            try { return Integer.parseInt(s.getValue().trim()); } catch (RuntimeException e) { return fallback; }
        }).orElse(fallback);
    }

    public Duration paymentTimeout() { return Duration.ofMinutes(getInt(PAYMENT_TIMEOUT, 15)); }
    public int childPercent() { return getInt(CHILD_PERCENT, 70); }
    public Duration guideStartWindow() { return Duration.ofHours(getInt(GUIDE_START_WINDOW, 24)); }

    public RefundPolicy refundPolicy() {
        return new RefundPolicy(getInt(FULL_REFUND_DAYS, 7), getInt(PARTIAL_REFUND_DAYS, 3), getInt(PARTIAL_REFUND_PERCENT, 50));
    }

    @Transactional(readOnly = true)
    public List<SystemSetting> list() { return repo.findAllByOrderByKeyAsc(); }

    @Transactional
    public void update(Map<String, String> values, Long actorId) {
        values.forEach((key, value) -> {
            SystemSetting s = repo.findByKey(key).orElseThrow(() -> BusinessException.notFound("tham số " + key));
            int v;
            try { v = Integer.parseInt(value.trim()); }
            catch (RuntimeException e) { throw new BusinessException(ErrorCode.BAD_REQUEST, key + " phải là số nguyên"); }
            int[] r = RANGES.getOrDefault(key, new int[] {Integer.MIN_VALUE, Integer.MAX_VALUE});
            if (v < r[0] || v > r[1]) throw new BusinessException(ErrorCode.BAD_REQUEST, key + " phải nằm trong khoảng " + r[0] + "–" + r[1]);
            s.update(String.valueOf(v), actorId, time.now());
        });
        if (getInt(PARTIAL_REFUND_DAYS, 3) > getInt(FULL_REFUND_DAYS, 7)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Mốc hoàn một phần phải nhỏ hơn hoặc bằng mốc hoàn đủ");
        }
    }
}
