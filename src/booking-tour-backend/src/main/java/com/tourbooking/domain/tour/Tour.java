package com.tourbooking.domain.tour;

import com.tourbooking.domain.common.BusinessException;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tours")
public class Tour {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "tour_code", nullable = false, unique = true)
    private String tourCode;
    @Column(nullable = false)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    @Column(nullable = false)
    private String destination;
    @Column(nullable = false)
    private long price;
    @Column(name = "duration_days", nullable = false)
    private int durationDays;
    @Column(name = "max_guests", nullable = false)
    private int maxGuests;
    @Column(name = "cover_image_url")
    private String coverImageUrl;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TourStatus status;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id")
    private TourCategory category;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Tour() {}

    public Tour(String tourCode, Instant now) {
        this.tourCode = tourCode;
        this.status = TourStatus.DRAFT;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String tourCode, String title, String description, String destination, long price,
                       int durationDays, int maxGuests, String coverImageUrl, TourCategory category, Instant now) {
        this.tourCode = tourCode;
        this.title = title;
        this.description = description;
        this.destination = destination;
        this.price = price;
        this.durationDays = durationDays;
        this.maxGuests = maxGuests;
        this.coverImageUrl = coverImageUrl;
        this.category = category;
        this.updatedAt = now;
    }

    /** SRS 9.2: tour thiếu thông tin không được chuyển sang ACTIVE. */
    public void changeStatus(TourStatus next, Instant now) {
        if (next == TourStatus.ACTIVE) {
            if (isBlank(title) || isBlank(description) || isBlank(destination) || durationDays <= 0 || maxGuests <= 0) {
                throw BusinessException.rule("Tour còn thiếu thông tin bắt buộc nên chưa thể mở bán");
            }
        }
        this.status = next;
        this.updatedAt = now;
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }

    public boolean isPublic() { return status == TourStatus.ACTIVE; }

    public Long getId() { return id; }
    public String getTourCode() { return tourCode; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getDestination() { return destination; }
    public long getPrice() { return price; }
    public int getDurationDays() { return durationDays; }
    public int getMaxGuests() { return maxGuests; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public TourStatus getStatus() { return status; }
    public TourCategory getCategory() { return category; }
    public Instant getCreatedAt() { return createdAt; }
}
