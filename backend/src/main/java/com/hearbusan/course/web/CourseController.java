package com.hearbusan.course.web;

import com.hearbusan.course.dto.CourseResponse;
import com.hearbusan.course.dto.CourseStats;
import com.hearbusan.course.dto.CourseSummaryDto;
import com.hearbusan.course.dto.PlaybackEventRequest;
import com.hearbusan.course.service.CourseQueryService;
import com.hearbusan.course.service.CourseService;
import com.hearbusan.course.service.PlaybackEventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseQueryService courseQueryService;
    private final CourseService courseService;
    private final PlaybackEventService eventService;

    public CourseController(CourseQueryService courseQueryService,
                             CourseService courseService,
                             PlaybackEventService eventService) {
        this.courseQueryService = courseQueryService;
        this.courseService = courseService;
        this.eventService = eventService;
    }

    /** 홈 화면 장소 목록. region 파라미터로 지역 칩 필터링 */
    @GetMapping
    public List<CourseSummaryDto> list(@RequestParam(required = false) String region) {
        return courseQueryService.findSummaries(region);
    }

    // 오프라인 사전 다운로드용: 코스 + 전 지점 좌표/오디오 URL
    @GetMapping("/{id}")
    public CourseResponse getCourse(@PathVariable Long id) {
        return courseService.getCourse(id);
    }

    @PostMapping("/{id}/events")
    public ResponseEntity<Void> recordEvent(@PathVariable Long id,
                                            @Valid @RequestBody PlaybackEventRequest req) {
        eventService.record(id, req);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/stats")
    public CourseStats stats(@PathVariable Long id) {
        return eventService.stats(id);
    }
}
