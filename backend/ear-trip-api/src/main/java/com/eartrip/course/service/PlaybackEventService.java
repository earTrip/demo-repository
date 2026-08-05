package com.eartrip.course.service;

import com.eartrip.course.domain.EventType;
import com.eartrip.course.domain.PlaybackEvent;
import com.eartrip.course.dto.CourseDtos;
import com.eartrip.course.repository.PlaybackEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PlaybackEventService {

    private final PlaybackEventRepository eventRepository;

    @Transactional
    public void record(Long courseId, CourseDtos.PlaybackEventRequest req) {
        eventRepository.save(
                PlaybackEvent.of(courseId, req.sceneOrder(), req.sessionId(), req.eventType()));
    }

    @Transactional(readOnly = true)
    public CourseDtos.CourseStats stats(Long courseId) {
        long starts = eventRepository.countByCourseIdAndEventType(courseId, EventType.COURSE_START);
        long completions = eventRepository.countByCourseIdAndEventType(courseId, EventType.COURSE_COMPLETE);
        double rate = starts == 0 ? 0.0 : (double) completions / starts;
        return new CourseDtos.CourseStats(starts, completions, rate);
    }
}
