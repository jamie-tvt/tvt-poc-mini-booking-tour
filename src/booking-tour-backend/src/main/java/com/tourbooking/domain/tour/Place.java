package com.tourbooking.domain.tour;

import jakarta.persistence.*;

@Entity
@Table(name = "places")
public class Place {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    private String description;

    protected Place() {}
    public Place(String name, String description) { this.name = name; this.description = description; }

    public void update(String name, String description) { this.name = name; this.description = description; }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
}
