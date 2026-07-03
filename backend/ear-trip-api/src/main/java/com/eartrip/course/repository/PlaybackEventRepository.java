package com.eartrip.course.repository;

import com.eartrip.course.domain.EventType;
import com.eartrip.course.domain.PlaybackEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaybackEventRepository extends JpaRepository<PlaybackEvent, Long> {
    long countByCourseIdAndEventType(Long courseId, EventType eventType);
}
