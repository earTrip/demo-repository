import { Directory, File, Paths } from 'expo-file-system';

// SDK 54+ 신규 File/Directory API 기준 (구 FileSystem.downloadAsync는 deprecated).
// new Directory(...)를 모듈 최상단에서 실행하면 웹에서 모듈 로드 시점에 바로 크래시난다
// (Directory 생성자가 validatePath를 호출하는데 웹 구현체엔 없음) — 함수 안에서 지연 생성.

/** 코스 시작 시 전 지점 오디오를 미리 받아 오프라인 재생 보장 (걷는 중 통신 불안정 대비) */
export async function downloadCourseAudio(scenes) {
  const audioDir = new Directory(Paths.document, 'audio');
  await audioDir.create({ intermediates: true, idempotent: true }).catch(() => {});

  const srcMap = new Map(); // sceneId -> 로컬 file:// URI
  for (const s of scenes) {
    const ext = s.audioUrl.split('.').pop().split('?')[0] || 'mp3';
    const file = new File(audioDir, `s${s.sceneId}.${ext}`);
    if (!file.exists) {
      await File.downloadFileAsync(s.audioUrl, file);
    }
    srcMap.set(s.sceneId, file.uri);
  }
  return srcMap;
}
