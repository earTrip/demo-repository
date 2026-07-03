import { useState } from "react";
import { GATE, useQaSession } from "./useQaSession";

export default function QaOverlay({ scenes, onMeasuredChange }) {
  const qa = useQaSession(scenes);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleRecal = (s) => {
    qa.recalibrate(s);
    onMeasuredChange?.(qa.records); // 지도에 측정점 반영용 (선택)
  };

  const handleCopy = async () => {
    await qa.copyReport();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`qa-panel ${open ? "" : "qa-panel--min"}`}>
      <div className="qa-panel__head">
        <strong>현장 QA</strong>
        <span className={`qa-gate ${qa.passCount === scenes.length ? "qa-gate--pass" : ""}`}>
          {qa.passCount}/{scenes.length} PASS
        </span>
        <button className="qa-min" onClick={() => setOpen((o) => !o)} aria-label="접기/펼치기">
          {open ? "–" : "+"}
        </button>
      </div>

      {open && (
        <>
          <div className="qa-status">
            {qa.pos
              ? <>GPS ±{Math.round(qa.pos.accuracy)}m {qa.pos.accuracy > 10 && <em>(±10m 이하 대기 권장)</em>}</>
              : qa.active ? "위치 수신 중..." : "세션 미시작"}
          </div>

          {!qa.active ? (
            <button className="qa-btn qa-btn--primary" onClick={qa.start}>QA 세션 시작</button>
          ) : (
            <>
              <ul className="qa-list">
                {scenes.map((s) => {
                  const r = qa.records[s.sceneId] ?? {};
                  const pass = qa.isPass(r);
                  return (
                    <li key={s.sceneId} className={`qa-item ${pass ? "qa-item--pass" : ""}`}>
                      <div className="qa-item__row">
                        <span className="qa-item__name">S{s.order} {s.title}</span>
                        <span className="qa-item__result">
                          {r.errorM != null && <b className={r.errorM <= GATE.MAX_ERROR_M ? "ok" : "ng"}>{r.errorM}m</b>}
                          {r.delayS != null && <b className={r.delayS <= GATE.MAX_DELAY_S ? "ok" : "ng"}>{r.delayS}s</b>}
                          {pass && "✅"}
                        </span>
                      </div>
                      <div className="qa-item__row">
                        <button className="qa-btn" onClick={() => handleRecal(s)}>📍 재보정</button>
                        <button className="qa-btn" onClick={() => qa.markAudioStarted(s.sceneId)} disabled={r.errorM == null}>
                          🔊 오디오 시작됨
                        </button>
                      </div>
                      <input
                        className="qa-memo"
                        placeholder="현장 메모"
                        value={r.memo ?? ""}
                        onChange={(e) => qa.setMemo(s.sceneId, e.target.value)}
                      />
                    </li>
                  );
                })}
              </ul>
              <button className="qa-btn qa-btn--primary" onClick={handleCopy}>
                {copied ? "복사됨 ✓" : "📋 JSON 리포트 복사"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
