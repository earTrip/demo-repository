import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * 세션당 1회만 시도한다. PlayerScreen이 마운트될 때마다 init()을 부르는데, Supabase가
 * 안 뜬 상태면 그때마다 auth-js가 실패를 console.error로 찍어 빨간 박스가 다시 올라온다.
 * 한 번 실패한 프로젝트가 같은 실행 중에 갑자기 살아나지도 않으므로 재시도할 이유가 없다.
 */
let attempted = false;

/**
 * 익명 로그인으로 시작 → 구매 시점에 linkKakao()로 실제 계정에 연동(계획서 1절).
 * 앱 부팅 시 1회 init() 호출.
 */
export const useAuthSession = create((set, get) => ({
  session: null,
  loading: true,
  error: null,

  async init() {
    if (attempted) return;
    attempted = true;

    if (!isSupabaseConfigured) {
      // 미설정은 오류가 아니다 — 프로젝트 생성 전 단계이므로 조용히 인증 없이 진행한다.
      console.warn('[auth] Supabase 미설정 — 인증 없이 진행합니다 (mobile/.env.example 참고).');
      set({ session: null, loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        set({ session: data.session, loading: false });
      } else {
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        set({ session: anon.session, loading: false });
      }
    } catch (error) {
      // Supabase 프로젝트가 아직 없거나(.env 미설정) 네트워크 실패 시 여기로 옴.
      // 인증 없이도 앱 자체는 계속 쓸 수 있어야 하므로 fail-open — 이후 API 호출은 401로 처리됨.
      console.warn('[auth] 세션 초기화 실패, 인증 없이 진행:', error.message);
      set({ session: null, loading: false, error });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },

  // TODO(S0): 카카오 OAuth 연동. Supabase 대시보드에서 Kakao 프로바이더 설정 후
  // supabase.auth.linkIdentity({ provider: 'kakao', options: { redirectTo: 'eartrip://auth-callback' } })
  // + expo-web-browser의 openAuthSessionAsync로 딥링크 콜백 처리 (계획서 1.2절).
  async linkKakao() {
    throw new Error('linkKakao: Supabase 프로젝트에 Kakao 프로바이더 설정 후 구현 예정');
  },

  getAccessToken() {
    return get().session?.access_token ?? null;
  },

  getUserId() {
    return get().session?.user?.id ?? null;
  },
}));
