import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Circle, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchCourse } from "../api/courseApi";
import { usePlayerStore } from "../store/playerStore";
import QaOverlay from "../qa/QaOverlay";

const measuredIcon = L.divIcon({
  className: "",
  html: `<div class="pin-measured"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** 번호 핀 (시안의 파란 원형 마커) */
function numberIcon(n, active) {
  return L.divIcon({
    className: "",
    html: `<div class="pin-number ${active ? "pin-number--active" : ""}">${n}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 30],
  });
}

function FitToRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [46, 46] });
  }, [points, map]);
  return null;
}

export default function MapScreen({ courseId = 1 }) {
  const [course, setCourseData] = useState(null);
  const [query, setQuery] = useState("");
  const [measured, setMeasured] = useState({}); // sceneId → { measuredLat, measuredLng }
  const track = usePlayerStore((s) => s.track);
  const qaMode = new URLSearchParams(window.location.search).get("qa") === "1";

  useEffect(() => { fetchCourse(courseId).then(setCourseData); }, [courseId]);

  const scenes = course?.scenes ?? [];
  const points = useMemo(() => scenes.map((s) => [s.lat, s.lng]), [scenes]);
  const activeSceneId = track?.sceneId;

  return (
    <div className="screen screen--map">
      <div className="map-top">
        <h1 className="brand"><span className="hear">EAR </span><span className="busan">TRIP</span></h1>
        <div className="search-box">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input placeholder="검색창" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="장소 검색" />
        </div>
      </div>

      <div className="map-wrap">
        <MapContainer center={[35.0966, 129.0306]} zoom={16} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          <FitToRoute points={points} />

          {points.length > 1 && (
            <Polyline positions={points} pathOptions={{ color: "#2f6bff", weight: 4, dashArray: "10 8", lineCap: "round" }} />
          )}

          {scenes.map((s) => (
            <Circle
              key={`r-${s.sceneId}`}
              center={[s.lat, s.lng]}
              radius={s.radiusM}
              /* dwell(체류 트리거) 씬은 주황으로 구분 — 밀집 지역 오탐 방지 반경임을 지도에서 바로 확인 */
              pathOptions={
                s.triggerType === "dwell"
                  ? { color: "#e8873a", weight: 1, fillColor: "#e8873a", fillOpacity: 0.1 }
                  : { color: "#2f6bff", weight: 1, fillColor: "#2f6bff", fillOpacity: 0.08 }
              }
            />
          ))}

          {scenes.map((s) => (
            <Marker key={s.sceneId} position={[s.lat, s.lng]} icon={numberIcon(s.order, s.sceneId === activeSceneId)}>
              <Tooltip direction="top" offset={[0, -28]}>
                {`S${s.order} ${s.title} · 반경 ${s.radiusM}m · ${s.triggerType === "dwell" ? `${s.dwellSec ?? 3}초 체류` : "진입 즉시"}`}
              </Tooltip>
            </Marker>
          ))}

          {/* QA 재보정 측정점 (초록) */}
          {qaMode && Object.entries(measured).map(([id, m]) =>
            m?.measuredLat ? (
              <Marker key={`m-${id}`} position={[m.measuredLat, m.measuredLng]} icon={measuredIcon}>
                <Tooltip direction="bottom">측정점 (오차 {m.errorM}m)</Tooltip>
              </Marker>
            ) : null
          )}
        </MapContainer>

        {qaMode && <QaOverlay scenes={scenes} onMeasuredChange={(r) => setMeasured({ ...r })} />}

        <div className="route-legend" aria-label="경로 범례">
          <div className="route-legend__title">Route Legend</div>
          <div className="route-legend__row">
            <span className="legend-pin">1</span>–<span className="legend-pin">{scenes.length || 5}</span> stops
          </div>
          <div className="route-legend__row"><span className="legend-dash" /> AI 추천 코스</div>
          <div className="route-legend__row">🚶 도보</div>
          <div className="route-legend__row">🚌 대중교통</div>
        </div>
      </div>
    </div>
  );
}
