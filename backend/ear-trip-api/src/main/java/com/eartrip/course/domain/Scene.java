package com.eartrip.course.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor @Builder
public class Scene {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    private int sceneOrder;
    private String title;
    private double lat;
    private double lng;
    @Column(name = "radius_m", nullable = false)
    private int radiusM;
    private String audioUrl;
}
