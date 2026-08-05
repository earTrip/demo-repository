// 코스 시작 시 전 지점 오디오를 미리 받아 오프라인 재생 보장 (시장 내 통신 불안정 대비)
// 네이티브(React Native)에서는 expo-file-system/react-native-fs 로 로컬 경로 캐싱으로 교체
export async function prefetchAudio(scenes) {
  const srcMap = new Map(); // sceneId -> 재생 가능한 src
  await Promise.all(
    scenes.map(async (s) => {
      if (!s.audioUrl) return; // 잠금 씬: 서버가 audioUrl을 내리지 않음
      try {
        const res = await fetch(s.audioUrl);
        const blob = await res.blob();
        srcMap.set(s.sceneId, URL.createObjectURL(blob));
      } catch {
        // 실패 시 원본 URL로 폴백(데모/부분 오프라인)
        srcMap.set(s.sceneId, s.audioUrl);
      }
    })
  );
  return srcMap;
}
