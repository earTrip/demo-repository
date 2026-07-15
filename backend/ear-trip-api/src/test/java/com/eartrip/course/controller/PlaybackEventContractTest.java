package com.eartrip.course.controller;

import com.eartrip.common.ApiExceptionHandler;
import com.eartrip.course.dto.CourseDtos;
import com.eartrip.course.repository.CourseRepository;
import com.eartrip.course.service.PlaybackEventService;
import com.eartrip.payment.service.EntitlementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 이벤트 API의 '와이어 계약'을 고정한다.
 * 프론트(courseApi.js)·모바일(eventQueue.js)이 보내는 JSON 필드명이 여기서 어긋나면
 * 런타임에 조용히 400으로 떨어지고 완주율 계측이 통째로 유실된다 — 그걸 여기서 잡는다.
 */
@ExtendWith(MockitoExtension.class)
class PlaybackEventContractTest {

    @Mock CourseRepository courseRepository;
    @Mock EntitlementService entitlementService;
    @Mock PlaybackEventService playbackEventService;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders
                .standaloneSetup(new CourseController(courseRepository, entitlementService, playbackEventService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("프론트가 보내는 {sessionId, sceneOrder, eventType} 바디를 받아 202로 기록한다")
    void acceptsClientContract() throws Exception {
        mvc.perform(post("/api/courses/1/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"sess-1\",\"sceneOrder\":3,\"eventType\":\"SCENE_ENTER\"}"))
                .andExpect(status().isAccepted());

        var captor = ArgumentCaptor.forClass(CourseDtos.PlaybackEventRequest.class);
        verify(playbackEventService).record(eq(1L), captor.capture());
        assertThat(captor.getValue().sessionId()).isEqualTo("sess-1");
        assertThat(captor.getValue().sceneOrder()).isEqualTo(3);
    }

    @Test
    @DisplayName("COURSE_* 이벤트는 sceneOrder 없이도 기록된다")
    void allowsNullSceneOrderForCourseEvents() throws Exception {
        mvc.perform(post("/api/courses/1/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"sess-1\",\"eventType\":\"COURSE_START\"}"))
                .andExpect(status().isAccepted());

        verify(playbackEventService).record(eq(1L), any());
    }

    @Test
    @DisplayName("{type, sceneId} 형태(구 프론트 바디)는 eventType 누락으로 400 — 계측이 조용히 유실되지 않게")
    void rejectsLegacyFieldNames() throws Exception {
        mvc.perform(post("/api/courses/1/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SCENE_ENTER\",\"sceneId\":3,\"sessionId\":\"sess-1\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(playbackEventService);
    }

    @Test
    @DisplayName("sessionId 누락은 400 (@NotNull)")
    void rejectsMissingSessionId() throws Exception {
        mvc.perform(post("/api/courses/1/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sceneOrder\":1,\"eventType\":\"SCENE_ENTER\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(playbackEventService);
    }
}
