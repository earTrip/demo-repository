import { usePlayerStore } from "../store/playerStore";

const Icon = {
  prev: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>,
  next: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>,
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>,
};

export default function MiniPlayer() {
  const { track, course, isPlaying, toggle, next, prev } = usePlayerStore();
  if (!track) return null;

  return (
    <div className="mini-player" role="region" aria-label="재생 중">
      <div className={`mini-player__thumb thumb--${track.thumb ?? "beach"}`} />
      <div className="mini-player__info">
        <div className="mini-player__title">{track.title}</div>
        <div className="mini-player__sub">{course?.title ?? ""}</div>
      </div>
      <button className="mini-player__ctrl" aria-label="처음부터" onClick={prev}>{Icon.prev}</button>
      <button className="mini-player__ctrl mini-player__ctrl--main" aria-label={isPlaying ? "일시정지" : "재생"} onClick={toggle}>
        {isPlaying ? Icon.pause : Icon.play}
      </button>
      <button className="mini-player__ctrl" aria-label="다음 씬" onClick={next}>{Icon.next}</button>
      <button className="mini-player__ctrl" aria-label="재생 목록">{Icon.menu}</button>
    </div>
  );
}
