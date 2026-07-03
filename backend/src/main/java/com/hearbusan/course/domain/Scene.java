package com.hearbusan.course.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "scene")
public class Scene {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    private Integer sceneOrder;
    private String title;

    private Double lat;
    private Double lng;

    @Column(name = "radius_m")
    private Integer radiusM;        // 진입 판정 반경

    @Column(name = "exit_radius_m")
    private Integer exitRadiusM;    // 이탈 판정 반경 (> radiusM, 히스테리시스)

    private String audioUrl;

    @Column(length = 2000)
    private String fallbackText;    // 접근성/자막

    protected Scene() {}

    public Long getId() { return id; }
    public Integer getSceneOrder() { return sceneOrder; }
    public String getTitle() { return title; }
    public Double getLat() { return lat; }
    public Double getLng() { return lng; }
    public Integer getRadiusM() { return radiusM; }
    public Integer getExitRadiusM() { return exitRadiusM; }
    public String getAudioUrl() { return audioUrl; }
    public String getFallbackText() { return fallbackText; }
}
