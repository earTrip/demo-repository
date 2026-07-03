// 걷는 속도 적응의 핵심: 재생 중이면 끊지 않고 큐잉, 완주 후 다음 재생
export class AudioQueue {
  constructor(onSceneComplete) {
    this.queue = [];
    this.current = null;
    this.playing = false;
    this.onSceneComplete = onSceneComplete;
    this.audio = new Audio();
    this.audio.addEventListener("ended", () => this._next());
  }

  // 자동재생 정책 우회용: 시작 버튼(사용자 제스처)에서 1회 호출
  prime() {
    this.audio.muted = true;
    this.audio.play().catch(() => {});
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.muted = false;
  }

  enqueue(scene, src) {
    this.queue.push({ scene, src });
    if (!this.playing) this._next();
  }

  _next() {
    if (this.current) this.onSceneComplete?.(this.current.scene);
    const item = this.queue.shift();
    if (!item) {
      this.playing = false;
      this.current = null;
      return;
    }
    this.playing = true;
    this.current = item;
    this.audio.src = item.src;
    this.audio.play().catch((e) => console.warn("play blocked", e));
  }

  pause() {
    this.audio.pause();
  }

  resume() {
    if (this.current) this.audio.play().catch(() => {});
  }

  /** 현재 트랙을 건너뛰고 큐의 다음 트랙으로 (완주 콜백은 발생시키지 않음) */
  skipNext() {
    const item = this.queue.shift();
    if (!item) return;
    this.playing = true;
    this.current = item;
    this.audio.src = item.src;
    this.audio.play().catch(() => {});
  }

  restartCurrent() {
    if (!this.current) return;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  }
}
