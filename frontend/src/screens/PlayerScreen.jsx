import { useEffect, useRef, useState, useCallback } from "react";
import { fetchCourse } from "../api/courseApi";
import { usePlayerStore } from "../store/playerStore";
import Paywall from "../payment/Paywall";

/**
 * 에피소드 플레이어.
 * 잠금 판정은 서버 응답(scene.locked)만 신뢰 — 프론트에서 임의 해제 불가
 * (잠금 씬은 audioUrl 자체가 내려오지 않음).
 */
export default function PlayerScreen({ courseId = 1 }) {
  const [course, setCourse] = useState(null);
  const [paywall, setPaywall] = useState(false);
  const audioRef = useRef(null);
  const { track, setTrack, setCourse: setPlayerCourse, isPlaying, play, pause } = usePlayerStore();

  const load = useCallback(() => fetchCourse(courseId).then(setCourse), [courseId]);
  useEffect(() => { load(); }, [load]);

  const handleScene = (scene) => {
    if (scene.locked) { setPaywall(true); return; }

    setPlayerCourse({ id: course.id, title: course.title, region: course.region });
    setTrack({ sceneId: scene.sceneId, title: scene.title, order: scene.order, thumb: "market" });

    const audio = audioRef.current;
    audio.src = scene.audioUrl;
    audio.play().then(play).catch(() => {});
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) { audio.pause(); pause(); }
    else { audio.play().then(play).catch(() => {}); }
  };

  if (!course) return <div className="screen" style={{ display: "grid", placeItems: "center" }}>불러오는 중...</div>;

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

      <h2 className="section-title">씬 목록</h2>
      <ul className="scene-list">
        {course.scenes.map((s) => {
          const current = track?.sceneId === s.sceneId;
          return (
            <li key={s.sceneId}>
              <button
                className={`scene-item ${s.locked ? "scene-item--locked" : ""} ${current ? "scene-item--current" : ""}`}
                onClick={() => (current ? togglePlay() : handleScene(s))}
                aria-label={s.locked ? `${s.title} — 구매 후 이용 가능` : s.title}
              >
                <span className="scene-item__no">{s.order}</span>
                <span className="scene-item__title">{s.title}</span>
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

      <audio ref={audioRef} onEnded={pause} />

      {paywall && (
        <Paywall
          courseTitle={course.title}
          onClose={() => { setPaywall(false); load(); /* 결제 복귀 후 잠금 갱신 */ }}
        />
      )}
    </div>
  );
}
