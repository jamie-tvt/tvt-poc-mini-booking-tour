package com.tourbooking.domain.tour;

import jakarta.persistence.*;

@Entity
@Table(name = "tour_images")
public class TourImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "tour_id", nullable = false)
    private Long tourId;
    @Column(name = "image_url", nullable = false)
    private String imageUrl;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected TourImage() {}
    public TourImage(Long tourId, String imageUrl, int sortOrder) { this.tourId = tourId; this.imageUrl = imageUrl; this.sortOrder = sortOrder; }

    public Long getId() { return id; }
    public Long getTourId() { return tourId; }
    public String getImageUrl() { return imageUrl; }
    public int getSortOrder() { return sortOrder; }
}
