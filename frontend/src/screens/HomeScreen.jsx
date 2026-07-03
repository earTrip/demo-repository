import { useEffect, useState } from "react";
import { fetchCourses } from "../api/courseApi";
import { REGIONS, MOCK_SCHEDULE } from "../data/mockCourses";
import { usePlayerStore } from "../store/playerStore";

const REGION_ICON = { pin: "📍", city: "🏢", fish: "🐟", bridge: "🌉", dots: "🧭" };
const NUM = ["①", "②", "③", "④", "⑤"];

export default function HomeScreen({ onStartCourse }) {
  const [courses, setCourses] = useState([]);
  const [region, setRegion] = useState("busan");
  const [query, setQuery] = useState("");
  const setTrack = usePlayerStore((s) => s.setTrack);
  const setCourse = usePlayerStore((s) => s.setCourse);
  const play = usePlayerStore((s) => s.play);

  useEffect(() => { fetchCourses().then(setCourses); }, []);

  const filtered = (region === "busan" || region === "more"
    ? courses
    : courses.filter((c) => REGIONS.find((r) => r.key === region)?.label === c.region)
  ).filter((c) => c.title.includes(query) || c.subtitle.includes(query));

  const handlePlay = (c) => {
    setCourse({ id: c.id, title: c.title, region: c.region });
    setTrack({ sceneId: 0, title: c.title, subtitle: c.subtitle, thumb: c.thumb });
    play();
    onStartCourse?.(c.id);
  };

  return (
    <div className="screen">
      <h1 className="brand"><span className="hear">EAR </span><span className="busan">TRIP</span></h1>

      <div className="search-box">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input placeholder="검색창" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="장소 검색" />
      </div>

      {/* 지역 칩 */}
      <div className="region-row" role="tablist" aria-label="지역 선택">
        {REGIONS.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={region === r.key}
            className={`region ${region === r.key ? "region--active" : ""}`}
            onClick={() => setRegion(r.key)}
          >
            <span className="region__circle">{REGION_ICON[r.icon]}</span>
            <span className="region__label">{r.label}</span>
          </button>
        ))}
      </div>

      {/* 장소 목록 */}
      <h2 className="section-title">장소 목록</h2>
      <div className="place-row">
        {filtered.map((c, i) => (
          <button key={c.id} className="place-card" onClick={() => handlePlay(c)}>
            <div className={`place-card__thumb thumb--${c.thumb}`}>
              <span className="place-card__no">{NUM[i] ?? i + 1}</span>
            </div>
            <div className="place-card__body">
              <div>
                <div className="place-card__title">{c.title}</div>
                <div className="place-card__meta">{c.subtitle}</div>
              </div>
              <span className="btn-play" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 오늘 일정 + AI 추천 코스 */}
      <div className="home-grid">
        <div>
          <h2 className="section-title">오늘 일정</h2>
          <div className="schedule-card">
            {MOCK_SCHEDULE.map((s) => (
              <div key={s.id} className="schedule-item">
                <span className="schedule-item__dot" />
                <div className="schedule-item__txt">
                  <div className="schedule-item__title">{s.title}</div>
                  <div className="schedule-item__meta">{s.meta}</div>
                </div>
                <div className={`schedule-item__thumb thumb--${s.thumb}`} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title">AI 추천 코스</h2>
          <div className="ai-card">
            <div className="ai-card__badge">🥾 추천 코스</div>
            <div className="ai-route">
              <svg viewBox="0 0 200 150" aria-hidden>
                <path d="M40 35 L150 60 L60 105 L155 125" fill="none" stroke="#2f6bff" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
              </svg>
              <div className="ai-node ai-node--start" style={{ left: "20%", top: "23%" }}>
                <span className="ai-node__icon">📍</span>3시 시장
              </div>
              <div className="ai-node ai-node--transit" style={{ left: "75%", top: "40%" }}>
                <span className="ai-node__icon">🚌</span>버스 이동
              </div>
              <div className="ai-node" style={{ left: "30%", top: "70%" }}>
                <span className="ai-node__icon">🌉</span>광안대교
              </div>
              <div className="ai-node ai-node--end" style={{ left: "78%", top: "84%" }}>
                <span className="ai-node__icon">🏠</span>귀가
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
