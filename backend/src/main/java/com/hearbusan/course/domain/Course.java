package com.hearbusan.course.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "course")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String subtitle;
    private String region;
    private Integer durationMin;
    private Double distanceKm;
    private String thumbKey;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sceneOrder ASC")
    private List<Scene> scenes = new ArrayList<>();

    protected Course() {}

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getSubtitle() { return subtitle; }
    public String getRegion() { return region; }
    public Integer getDurationMin() { return durationMin; }
    public Double getDistanceKm() { return distanceKm; }
    public String getThumbKey() { return thumbKey; }
    public List<Scene> getScenes() { return scenes; }
}
