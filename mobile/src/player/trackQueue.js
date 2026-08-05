import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// AudioPlaylist는 트랙별 메타데이터/잠금화면 연동을 지원하지 않아(플레이어 단위로만 가능),
// 단일 AudioPlayer + 자체 큐로 구성한다. 웹의 AudioQueue.js와 동일한 "재생 중이면 큐잉,
// 완주 후 다음 재생" 동작을 유지한다.
let player = null;
let queue = []; // { scene, src, courseTitle }
let current = null;
let onSceneCompleteCb = null;

// 화면(React)이 현재 재생 씬·진행률을 구독한다. trackQueue는 모듈 싱글턴이라
// 스토어를 거치지 않고 여기서 바로 스냅샷을 흘려보낸다(플레이어 화면의 자막·진행바 구동).
const subscribers = new Set();
let lastStatus = { positionSec: 0, durationSec: 0, playing: false };

function snapshot() {
  return {
    scene: current?.scene ?? null,
    courseTitle: current?.courseTitle ?? null,
    positionSec: lastStatus.positionSec,
    durationSec: lastStatus.durationSec,
    isPlaying: lastStatus.playing,
  };
}

function emit() {
  const s = snapshot();
  for (const cb of subscribers) cb(s);
}

/** 재생 상태 구독. 구독 즉시 현재 스냅샷을 1회 전달하고, 해제 함수를 반환한다. */
export function subscribePlayback(cb) {
  subscribers.add(cb);
  cb(snapshot());
  return () => subscribers.delete(cb);
}

export async function setupPlayer(onSceneComplete) {
  onSceneCompleteCb = onSceneComplete;
  await setAudioModeAsync({ shouldPlayInBackground: true, playsInSilentMode: true });
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', (status) => {
    lastStatus = {
      positionSec: status.currentTime ?? 0,
      durationSec: status.duration ?? 0,
      playing: status.playing ?? false,
    };
    emit();
    if (status.didJustFinish) _advance();
  });
}

/** 재생 중이면 자동으로 큐 뒤에 붙는다 = "걷는 속도 적응"(끊지 않음) */
export function enqueueScene(scene, localUri, courseTitle) {
  queue.push({ scene, src: localUri, courseTitle });
  if (!current) _next();
}

function _advance() {
  if (current) onSceneCompleteCb?.(current.scene.sceneId);
  _next();
}

function _next() {
  const item = queue.shift();
  if (!item) {
    current = null;
    lastStatus = { positionSec: 0, durationSec: 0, playing: false };
    emit();
    return;
  }
  current = item;
  player.replace(item.src);
  // Android는 setActiveForLockScreen 없이는 배경 재생이 ~3분 후 중단됨(공식 문서 명시).
  player.setActiveForLockScreen(true, { title: item.scene.title, artist: item.courseTitle });
  player.play();
  emit(); // 씬 전환을 즉시 반영 — 재생 status(currentTime 등)는 곧 뒤따른다.
}

export function pause() {
  player?.pause();
  lastStatus = { ...lastStatus, playing: false };
  emit();
}

export function resume() {
  if (!current) return;
  player?.play();
  lastStatus = { ...lastStatus, playing: true };
  emit();
}

/** 현재 트랙을 건너뛰고 큐의 다음 트랙으로 (완주 콜백은 발생시키지 않음) */
export function skipNext() {
  const item = queue.shift();
  if (!item) return;
  current = item;
  player.replace(item.src);
  player.setActiveForLockScreen(true, { title: item.scene.title, artist: item.courseTitle });
  player.play();
  emit();
}

export function restartCurrent() {
  if (!current) return;
  player.seekTo(0);
  player.play();
  lastStatus = { ...lastStatus, positionSec: 0, playing: true };
  emit();
}

/** 진행바 탭 탐색 — 초 단위. 재생 중이 아니면 무시(현재 트랙이 없을 때). */
export function seekTo(sec) {
  if (!current) return;
  player.seekTo(Math.max(0, sec));
}
