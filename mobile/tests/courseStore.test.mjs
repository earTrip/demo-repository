// 실행: npm test (mobile/)
// courseStore는 expo-audio / AsyncStorage에 의존하므로 네이티브 계층만 목킹하고
// 스토어·지오펜스 트래커는 실제 구현을 그대로 구동한다.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const url = (p) => new URL(p, import.meta.url).href;

const enqueued = [];
const events = [];

// geo는 목킹이 아니라 실제 트래커를 쓴다 (확장자 없는 지정자를 잇기 위해 등록만).
const realGeo = await import(url('../src/utils/geo.js'));

mock.module(url('../src/utils/geo.js'), { namedExports: { ...realGeo } });
mock.module(url('../src/player/trackQueue.js'), {
  namedExports: {
    enqueueScene: (scene, src, title) => enqueued.push({ sceneId: scene.sceneId, src, title }),
    setupPlayer: async () => {},
  },
});
mock.module(url('../src/offline/eventQueue.js'), {
  namedExports: {
    logEvent: (courseId, payload) => events.push(payload),
    flushEvents: async () => {},
  },
});

const { useCourseStore } = await import(url('../src/store/courseStore.js'));

// 무료 1~2 / 잠금 3. 백엔드 SceneView.of는 잠금 씬의 audioUrl을 내리지 않으므로 srcMap에도 없다.
const COURSE = {
  id: 1,
  title: '새벽, 자갈치',
  scenes: [
    { sceneId: 1, order: 1, title: 'S1', lat: 35.0972, lng: 129.0298, radiusM: 25, locked: false },
    { sceneId: 2, order: 2, title: 'S2', lat: 35.0938, lng: 129.0272, radiusM: 30, locked: false },
    { sceneId: 3, order: 3, title: 'S3', lat: 35.0968, lng: 129.0300, radiusM: 20, locked: true },
  ],
};
const srcMap = new Map([[1, 'file://s1.mp3'], [2, 'file://s2.mp3']]);

const types = () => events.map((e) => e.eventType);
const reset = () => {
  enqueued.length = 0;
  events.length = 0;
};

test('잠금 씬 진입: 재생 큐잉 없이 페이월 콜백만 호출한다', () => {
  reset();
  let paywall = 0;
  useCourseStore.getState().init(COURSE, srcMap, 'sess-1', () => paywall++);

  const s3 = COURSE.scenes[2];
  useCourseStore.getState().onPosition(s3.lat, s3.lng, 10);

  assert.equal(paywall, 1, '페이월이 열려야 함');
  // 잠금 씬을 큐잉하면 player.replace(undefined)로 트랙 큐가 멈춰 이후 씬이 전부 재생되지 않는다.
  assert.deepEqual(enqueued, [], '잠금 씬은 큐잉되면 안 됨');
  assert.ok(!types().includes('SCENE_ENTER'), '잠금 씬은 SCENE_ENTER를 찍지 않음');
});

test('잠금 씬 진입 후에도 무료 씬은 정상 재생된다 (큐가 멈추지 않음)', () => {
  reset();
  useCourseStore.getState().init(COURSE, srcMap, 'sess-2', () => {});

  const s3 = COURSE.scenes[2];
  useCourseStore.getState().onPosition(s3.lat, s3.lng, 10); // 잠금 먼저
  const s1 = COURSE.scenes[0];
  useCourseStore.getState().onPosition(s1.lat, s1.lng, 10);

  assert.equal(enqueued.length, 1);
  assert.equal(enqueued[0].sceneId, 1);
  assert.equal(enqueued[0].src, 'file://s1.mp3');
});

test('완주는 진입이 아니라 재생 완료로 센다 (큐에 쌓인 상태에서 조기 발화 금지)', () => {
  reset();
  useCourseStore.getState().init(COURSE, srcMap, 'sess-3', () => {});

  // 지점 두 곳을 먼저 다 지나쳐 큐에만 쌓인 상태
  for (const s of [COURSE.scenes[0], COURSE.scenes[1]]) {
    useCourseStore.getState().onPosition(s.lat, s.lng, 10);
  }
  assert.equal(useCourseStore.getState().playedCount, 2);

  useCourseStore.getState().onSceneComplete(1);
  assert.ok(!types().includes('COURSE_COMPLETE'), 'S2가 아직 재생 중인데 완주로 잡으면 안 됨');

  useCourseStore.getState().onSceneComplete(2);
  assert.ok(types().includes('COURSE_COMPLETE'), '재생 가능한 씬을 다 들으면 완주');
  assert.equal(useCourseStore.getState().status, 'completed');
});

test('마지막 씬이 잠겨 있어도 완주가 잡힌다 (무료 구간만 걷는 사용자)', () => {
  reset();
  useCourseStore.getState().init(COURSE, srcMap, 'sess-4', () => {});

  for (const s of [COURSE.scenes[0], COURSE.scenes[1]]) {
    useCourseStore.getState().onPosition(s.lat, s.lng, 10);
  }
  useCourseStore.getState().onSceneComplete(1);
  useCourseStore.getState().onSceneComplete(2);

  assert.ok(types().includes('COURSE_COMPLETE'), '잠금 S3를 기다리면 영영 완주가 안 잡힌다');
});

test('SCENE_COMPLETE는 sceneId가 아니라 sceneOrder를 보낸다 (백엔드 @NotNull 계약)', () => {
  reset();
  useCourseStore.getState().init(COURSE, srcMap, 'sess-5', () => {});
  useCourseStore.getState().onPosition(COURSE.scenes[0].lat, COURSE.scenes[0].lng, 10);
  useCourseStore.getState().onSceneComplete(1);

  const done = events.find((p) => p.eventType === 'SCENE_COMPLETE');
  assert.ok(done, 'SCENE_COMPLETE 이벤트 존재');
  assert.equal(done.sceneOrder, 1);
  assert.ok(!('sceneId' in done), 'sceneId 필드를 보내면 400이다');
});
