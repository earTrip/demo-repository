/**
 * 순임(사투리) 보이스 생성 — Gemini TTS.
 *
 * 준비물: GEMINI_API_KEY (aistudio.google.com/apikey 에서 발급).
 * 실행 전 이 파일 맨 아래 `main()` 호출의 주석을 해제할 것.
 *
 *   GEMINI_API_KEY=여기에키 node scripts/generate-sunim-audio-gemini.js
 *
 * 스타일 지시문은 Google AI Studio "Text-to-Speech 사용해 보기" 데모에서
 * 검증된 문구를 그대로 사용 (부산 경상도 사투리, 60-70대 억센 할머니, 빠른 속도).
 * Node 18+ 내장 fetch 사용 — 별도 의존성 설치 불필요.
 */
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.1-flash-tts-preview';
const VOICE = 'Kore';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const STYLE_INSTRUCTION =
  '반드시 부산 경상도 사투리 억양으로 말해줘. 서울 표준어 억양 금지. ' +
  '문장 끝을 올렸다 내리꽂는 경상도 특유의 높낮이로, 부산 토박이처럼. ' +
  '60-70대 억센 할머니 느낌으로. 속도는 빠르게.';

/** 큐시트(귀로_듣는_자갈치_전체_큐시트.md, 씬4_녹음대본_파일럿.md)에서 뽑은 순임 대사만 */
const LINES = [
  {
    id: 's2_sunim',
    tag: '',
    text:
      '자다가 일나모 억수로 춥제. 근데 우얄끼고. 아 새끼들은 입 벌리고 기다리는데. ' +
      '등에 하나 업고, 큰 놈은 손잡고 걸리고. 그래 시장에 나왔다 아이가.',
  },
  {
    id: 's3_sunim',
    tag: '',
    text: '돈이 있나. 밑천이 있나. 남들 버리는 거 얻어다가 구워 팔았제. 그래 다 같이 버텼다 아이가. 그 시절을.',
  },
  {
    id: 's4_sunim_hogaek',
    tag: '[energetic, shouting like a real market vendor]',
    text: '오이소! 싱싱한 거 왔다! 보이소, 이 눈깔 좀 보소, 살아있다 아이가! 사이소!',
  },
  {
    id: 's4_sunim_hoesang',
    tag: '[very quiet, distant, fading away like a memory]',
    text: '오이소... 보이소...',
  },
  {
    id: 's4_sunim_naje',
    tag: '[low voice, holding back tears, subdued]',
    text: '미안하다 소리를... 나는 니한테 평생 못 했다. 장사한다꼬. 먹고산다꼬. 니 얼굴 제대로 볼 새도 없이.',
  },
  {
    id: 's5_sunim',
    tag: '[warm, gentle, far away with deep reverb]',
    text: '왔나. 밥은 묵었나.',
  },
];

const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'sunim');

/** Gemini는 24000Hz mono 16bit PCM 원본을 base64로 반환 — WAV 컨테이너를 직접 씌워야 재생 가능 */
function pcmToWav(pcmBuffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);
  return Buffer.concat([header, pcmBuffer]);
}

async function generateLine({ id, tag, text }) {
  const input = tag ? `${STYLE_INSTRUCTION} ${tag} ${text}` : `${STYLE_INSTRUCTION} ${text}`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: [{ voice: VOICE }],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`[${id}] Gemini TTS 요청 실패: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const base64Pcm = data?.interaction?.output_audio?.data;
  if (!base64Pcm) {
    throw new Error(`[${id}] 응답에 오디오 데이터 없음: ${JSON.stringify(data)}`);
  }

  const pcm = Buffer.from(base64Pcm, 'base64');
  const wav = pcmToWav(pcm);
  const outFile = path.join(OUT_DIR, `${id}.wav`);
  fs.writeFileSync(outFile, wav);
  console.log(`저장됨: ${outFile} (${(wav.length / 1024).toFixed(0)}KB)`);
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY 환경변수가 없음. aistudio.google.com/apikey 에서 발급 후 다시 실행할 것.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const line of LINES) {
    await generateLine(line);
  }
  console.log('완료.');
}

// 준비되면(GEMINI_API_KEY 설정 후) 아래 주석을 해제하고 실행할 것.
// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
