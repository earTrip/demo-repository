import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import PlayerScreen from "./screens/PlayerScreen";
import MiniPlayer from "./components/MiniPlayer";
import BottomNav from "./components/BottomNav";
import PaymentResult from "./payment/PaymentResult";
import "./styles/app.css";

const Placeholder = ({ label }) => (
  <div className="screen" style={{ display: "grid", placeItems: "center", color: "var(--ink-soft)" }}>
    {label} — 준비 중
  </div>
);

export default function App() {
  const [tab, setTab] = useState("home");
  const [courseId, setCourseId] = useState(1);

  return (
    <div className="app-shell">
      {tab === "home" && (
        <HomeScreen onStartCourse={(id) => { setCourseId(id); setTab("player"); }} />
      )}
      {tab === "player" && <PlayerScreen courseId={courseId} />}
      {tab === "map" && <MapScreen courseId={courseId} />}
      {tab === "my" && <Placeholder label="마이페이지" />}

      <PaymentResult />
      <MiniPlayer />
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  );
}
