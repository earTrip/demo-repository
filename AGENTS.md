# Ear Trip — 에이전트/개발 공통 참고

## API 키·시크릿 취급 규칙 (2026-07-12 보안 점검 기준)

현재 저장소는 실키 없이 전부 환경변수 주입 구조다 — 이 구조를 유지할 것.

- **클라이언트 노출형 키** (Supabase anon key, Google Maps 키): 커밋해도 치명적이진 않지만 기본은 `.env` 주입. Maps 키는 발급 즉시 **Google Cloud 콘솔에서 Android 패키지명 + SHA-1 제한**을 걸어둘 것 (APK에 그대로 포함되므로 제한 없는 키는 도용 가능).
- **서버 시크릿** (Toss `live_sk_`/`test_sk_`, Supabase service_role, DB 비밀번호): **절대 커밋 금지.** 지금처럼 `${ENV_VAR}` 주입 유지 — `backend/.../application.yml`의 `${TOSS_SECRET_KEY:test_sk_XXXX…}` 패턴이 기준. 코드 기본값은 반드시 `XXXX` 플레이스홀더.
- **히스토리 오염 시 즉시 키 회전**: 이 저장소(earTrip/demo-repository)는 외부 공개를 전제로 한다. 실키를 한 번이라도 커밋했다면 되돌리기(revert/rebase)로는 해결되지 않는다 — 히스토리에 남으므로 **해당 키를 즉시 폐기·재발급**하는 것이 원칙.
- 커밋 전 자가 점검: `git grep -E "AIza[0-9A-Za-z_-]{35}|live_sk_|test_sk_[^X]|sk-[A-Za-z0-9]{20,}|eyJhbGciOi|BEGIN (RSA |EC )?PRIVATE KEY"` 가 플레이스홀더 외에 걸리면 커밋 중단.
- 키 파일(`*.pem`, `*.jks`, `google-services.json` 등)은 루트 `.gitignore`가 전역 차단 중 — 이 목록을 약화시키지 말 것.
