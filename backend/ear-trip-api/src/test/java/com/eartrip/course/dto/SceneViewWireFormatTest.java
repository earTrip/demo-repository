package com.eartrip.course.dto;

import com.eartrip.course.domain.Scene;
import com.eartrip.course.domain.TriggerType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SceneView의 와이어 포맷을 고정한다.
 * 클라이언트 geo.js는 s.triggerType === "dwell" (소문자)로 비교하므로,
 * 직렬화가 대문자로 바뀌면 전 씬이 조용히 '진입 즉시'가 되어
 * 밀집 지역(S3·S4) 오탐 방지가 사라진다 — 런타임에 아무 에러도 안 난다.
 */
class SceneViewWireFormatTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private static Scene scene(TriggerType type, Integer dwellSec) {
        return Scene.builder()
                .id(3L).sceneOrder(3).title("버려지던 것들").landmark("곰장어 구이 골목")
                .lat(35.0968).lng(129.0300).radiusM(20)
                .triggerType(type).dwellSec(dwellSec).estimatedSec(45)
                .audioUrl("/audio/ep01_s3.mp3")
                .script("냄새 먼저 도착하셨죠.")
                .build();
    }

    @Test
    @DisplayName("dwell 씬은 triggerType을 소문자 \"dwell\"로 직렬화한다 (큐시트 B-1 앱 필드)")
    void serializesDwellLowercase() throws Exception {
        String json = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.DWELL, 3), true));

        assertThat(json).contains("\"triggerType\":\"dwell\"");
        assertThat(json).contains("\"dwellSec\":3");
    }

    @Test
    @DisplayName("enter 씬은 \"enter\"로 직렬화하고 dwellSec은 null")
    void serializesEnterLowercase() throws Exception {
        String json = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.ENTER, null), true));

        assertThat(json).contains("\"triggerType\":\"enter\"");
        assertThat(json).contains("\"dwellSec\":null");
    }

    @Test
    @DisplayName("잠금 씬도 트리거 정보는 내려준다 (지도 핀·반경 표시에 필요, audioUrl만 가린다)")
    void lockedSceneStillCarriesTrigger() throws Exception {
        String json = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.DWELL, 3), false));

        assertThat(json).contains("\"triggerType\":\"dwell\"");
        assertThat(json).contains("\"locked\":true");
        assertThat(json).contains("\"audioUrl\":null");
    }

    @Test
    @DisplayName("잠금 씬은 대본을 내려주지 않는다 — 자막만 읽어도 콘텐츠를 다 가져가므로")
    void lockedSceneHidesScript() throws Exception {
        String json = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.DWELL, 3), false));

        assertThat(json).contains("\"script\":null");
        assertThat(json).doesNotContain("냄새 먼저 도착하셨죠");
    }

    @Test
    @DisplayName("해제된 씬은 대본을 내려준다")
    void unlockedSceneCarriesScript() throws Exception {
        String json = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.DWELL, 3), true));

        assertThat(json).contains("냄새 먼저 도착하셨죠");
    }

    @Test
    @DisplayName("landmark는 잠금 여부와 무관하게 내려준다 — 보행 안내(NEXT STOP)에 필요")
    void landmarkAlwaysExposed() throws Exception {
        String locked = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.DWELL, 3), false));
        String unlocked = mapper.writeValueAsString(CourseDtos.SceneView.of(scene(TriggerType.DWELL, 3), true));

        assertThat(locked).contains("\"landmark\":\"곰장어 구이 골목\"");
        assertThat(unlocked).contains("\"landmark\":\"곰장어 구이 골목\"");
    }
}
