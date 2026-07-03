package com.eartrip.course.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class Course {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String subtitle;
    private String region;
    private int durationMin;
    private double distanceKm;
    private String thumbKey;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL)
    @OrderBy("sceneOrder ASC")
    @Builder.Default
    private List<Scene> scenes = new ArrayList<>();
}
