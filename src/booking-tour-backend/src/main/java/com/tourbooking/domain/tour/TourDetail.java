package com.tourbooking.domain.tour;

import jakarta.persistence.*;

/** Một điểm trong lịch trình tour (bảng tour_details của intern). */
@Entity
@Table(name = "tour_details")
public class TourDetail {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "tour_id", nullable = false)
    private Long tourId;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "place_id")
    private Place place;
    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected TourDetail() {}
    public TourDetail(Long tourId, Place place, int displayOrder) { this.tourId = tourId; this.place = place; this.displayOrder = displayOrder; }

    public Long getId() { return id; }
    public Long getTourId() { return tourId; }
    public Place getPlace() { return place; }
    public int getDisplayOrder() { return displayOrder; }
}
