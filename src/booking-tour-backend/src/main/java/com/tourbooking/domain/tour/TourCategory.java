package com.tourbooking.domain.tour;

import jakarta.persistence.*;

@Entity
@Table(name = "tour_categories")
public class TourCategory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;

    protected TourCategory() {}
    public TourCategory(String name) { this.name = name; }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void rename(String name) { this.name = name; }
}
