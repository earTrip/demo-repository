package com.hearbusan.course.service;

import com.hearbusan.course.dto.CourseSummaryDto;
import com.hearbusan.course.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/** 홈 화면 "장소 목록"용 조회 전용 서비스 (CQS 분리) */
@Service
@Transactional(readOnly = true)
public class CourseQueryService {

    private final CourseRepository courseRepository;

    public CourseQueryService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<CourseSummaryDto> findSummaries(String region) {
        AtomicInteger no = new AtomicInteger(1);
        return courseRepository.findAllWithScenes().stream()
                .filter(c -> region == null || region.isBlank() || region.equals(c.getRegion()))
                .map(c -> new CourseSummaryDto(
                        c.getId(),
                        no.getAndIncrement(),
                        c.getTitle(),
                        c.getSubtitle(),
                        c.getRegion(),
                        c.getDurationMin(),
                        c.getDistanceKm(),
                        c.getScenes().size(),
                        c.getThumbKey()
                ))
                .toList();
    }
}
