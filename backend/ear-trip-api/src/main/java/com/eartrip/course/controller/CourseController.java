package com.eartrip.course.controller;

import com.eartrip.course.domain.Course;
import com.eartrip.course.dto.CourseDtos;
import com.eartrip.course.repository.CourseRepository;
import com.eartrip.course.service.PlaybackEventService;
import com.eartrip.payment.service.EntitlementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;
    private final EntitlementService entitlementService;
    private final PlaybackEventService playbackEventService;

    @GetMapping
    @Transactional(readOnly = true)
    public List<CourseDtos.Summary> list(@RequestParam(required = false) String region) {
        return courseRepository.findAllWithScenes().stream()
                .filter(c -> region == null || region.isBlank() || region.equals(c.getRegion()))
                .map(CourseDtos.Summary::from)
                .toList();
    }

    /** 씬별 잠금 여부를 서버가 판정해 내려줌 — 프론트는 locked만 따른다 */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public CourseDtos.Detail detail(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable Long id) {
        Course c = courseRepository.findByIdWithScenes(id)
                .orElseThrow(() -> new IllegalArgumentException("코스 없음: " + id));

        boolean owned = entitlementService.hasAccess(jwt.getSubject(), id);

        List<CourseDtos.SceneView> scenes = c.getScenes().stream()
                .map(s -> CourseDtos.SceneView.of(s,
                        owned || EntitlementService.FREE_SCENE_ORDERS.contains(s.getSceneOrder())))
                .toList();

        return new CourseDtos.Detail(c.getId(), c.getTitle(), c.getRegion(),
                c.getDurationMin(), c.getDistanceKm(), owned, scenes);
    }

    /** 완주율 계측 이벤트 기록 — 모바일 오프라인 큐(eventQueue.js)가 posting */
    @PostMapping("/{id}/events")
    public ResponseEntity<Void> recordEvent(@PathVariable Long id,
                                            @Valid @RequestBody CourseDtos.PlaybackEventRequest req) {
        playbackEventService.record(id, req);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/stats")
    public CourseDtos.CourseStats stats(@PathVariable Long id) {
        return playbackEventService.stats(id);
    }
}
