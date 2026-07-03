import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// AudioPlaylist는 트랙별 메타데이터/잠금화면 연동을 지원하지 않아(플레이어 단위로만 가능),
// 단일 AudioPlayer + 자체 큐로 구성한다. 웹의 AudioQueue.js와 동일한 "재생 중이면 큐잉,
// 완주 후 다음 재생" 동작을 유지한다.
let player = null;
let queue = []; // { scene, src, courseTitle }
let current = null;
let onSceneCompleteCb = null;

export async function setupPlayer(onSceneComplete) {
  onSceneCompleteCb = onSceneComplete;
  await setAudioModeAsync({ shouldPlayInBackground: true, playsInSilentMode: true });
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', (status) => {
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
    return;
  }
  current = item;
  player.replace(item.src);
  // Android는 setActiveForLockScreen 없이는 배경 재생이 ~3분 후 중단됨(공식 문서 명시).
  player.setActiveForLockScreen(true, { title: item.scene.title, artist: item.courseTitle });
  player.play();
}

export function pause() {
  player?.pause();
}

export function resume() {
  if (current) player?.play();
}

/** 현재 트랙을 건너뛰고 큐의 다음 트랙으로 (완주 콜백은 발생시키지 않음) */
export function skipNext() {
  const item = queue.shift();
  if (!item) return;
  current = item;
  player.replace(item.src);
  player.setActiveForLockScreen(true, { title: item.scene.title, artist: item.courseTitle });
  player.play();
}

export function restartCurrent() {
  if (!current) return;
  player.seekTo(0);
  player.play();
}
