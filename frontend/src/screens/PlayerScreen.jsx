import { useCallback, useEffect, useState } from "react";
import { fetchCourse } from "../api/courseApi";
import { usePlayerStore } from "../store/playerStore";
import { useGeofencePlayer } from "../hooks/useGeofencePlayer";
import Paywall from "../payment/Paywall";

/**
 * 에피소드 플레이어.
 * 재생은 useGeofencePlayer가 단독으로 담당한다 — 실제 보행 중엔 GPS가, 데스크톱에선
 * 씬 탭이 진입을 시뮬레이트해 같은 경로(트래커 → AudioQueue → playerStore)를 탄다.
 * 화면이 별도 <audio>를 들면 MiniPlayer(스토어의 audioQueueRef를 제어)와 어긋난다.
 *
 * 잠금 판정은 서버 응답(scene.locked)만 신뢰 — 프론트에서 임의 해제 불가
 * (잠금 씬은 audioUrl 자체가 내려오지 않음).
 */
export default function PlayerScreen({ courseId = 1 }) {
  const [course, setCourse] = useState(null);
  const [paywall, setPaywall] = useState(false);

  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const toggle = usePlayerStore((s) => s.toggle);

  // 목록 표시는 시작 전에도 필요하므로 화면이 먼저 받아두고, start()가 그대로 재사용한다.
  const load = useCallback(() => fetchCourse(courseId).then(setCourse), [courseId]);
  useEffect(() => {
    load();
  }, [load]);

  const { status, playedCount, start, simulateEnter } = useGeofencePlayer(courseId, {
    course,
    onLockedEnter: () => setPaywall(true),
  });

  const started = status === "active" || status === "completed";

  // 오디오 언락(prime)은 사용자 제스처 안에서만 유효해 시작 버튼이 필요하다.
  // 시작 전 탭은 코스를 먼저 시작시킨 뒤 해당 씬을 시뮬레이트한다.
  const handleScene = async (scene) => {
    if (scene.locked) {
      setPaywall(true);
      return;
    }
    if (!started) await start();
    simulateEnter(scene);
  };

  const onPaywallClose = async () => {
    setPaywall(false);
    const fresh = await fetchCourse(courseId); // 결제 복귀 후 잠금 갱신
    setCourse(fresh);
    // 구매로 풀린 오디오는 아직 프리페치 전이라, 시작한 상태면 새 코스로 재시작한다.
    if (started) await start();
  };

  if (!course) {
    return <div className="screen" style={{ display: "grid", placeItems: "center" }}>불러오는 중...</div>;
  }

  const playable = course.scenes.filter((s) => !s.locked).length;

  return (
    <div className="screen">
      <h1 className="brand"><span className="hear">EAR </span><span className="busan">TRIP</span></h1>

      <div className={`player-hero thumb--market`}>
        <div className="player-hero__txt">
          <div className="player-hero__title">{course.title}</div>
          <div className="player-hero__meta">{course.region} · {course.durationMin}분 · {course.distanceKm}km</div>
        </div>
        {!course.owned && <span className="player-hero__badge">미리듣기</span>}
      </div>

      {!started ? (
        <button className="paywall__cta" style={{ marginTop: 12 }} onClick={start}>
          {status === "loading" ? "준비 중..." : "코스 시작 · 지점에 도착하면 자동 재생"}
        </button>
      ) : (
        <p className="section-title" style={{ marginBottom: 0 }}>
          {status === "completed" ? "완주했습니다" : `진행 중 · ${playedCount}/${playable}`}
        </p>
      )}

      <h2 className="section-title">씬 목록</h2>
      <ul className="scene-list">
        {course.scenes.map((s) => {
          const current = track?.sceneId === s.sceneId;
          return (
            <li key={s.sceneId}>
              <button
                className={`scene-item ${s.locked ? "scene-item--locked" : ""} ${current ? "scene-item--current" : ""}`}
                onClick={() => (current ? toggle() : handleScene(s))}
                aria-label={s.locked ? `${s.title} — 구매 후 이용 가능` : s.title}
              >
                <span className="scene-item__no">{s.order}</span>
                <span className="scene-item__body">
                  <span className="scene-item__title">{s.title}</span>
                  <span className="scene-item__sub">
                    <span className={`trigger-badge ${s.triggerType === "dwell" ? "trigger-badge--dwell" : ""}`}>
                      {s.triggerType === "dwell" ? `${s.dwellSec ?? 3}초 체류` : "진입 즉시"}
                    </span>
                    {s.estimatedSec != null && (
                      <span>
                        낭독 약 {s.estimatedSec >= 60 ? `${Math.floor(s.estimatedSec / 60)}분 ${s.estimatedSec % 60 || ""}${s.estimatedSec % 60 ? "초" : ""}`.trim() : `${s.estimatedSec}초`}
                      </span>
                    )}
                  </span>
                </span>
                <span className="scene-item__icon" aria-hidden>
                  {s.locked ? "🔒" : current && isPlaying ? "⏸" : "▶"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!course.owned && (
        <button className="paywall__cta" style={{ marginTop: 12 }} onClick={() => setPaywall(true)}>
          전체 이야기 듣기 · ₩6,900
        </button>
      )}

      {paywall && <Paywall courseTitle={course.title} onClose={onPaywallClose} />}
    </div>
  );
}
