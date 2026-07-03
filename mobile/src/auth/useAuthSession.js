import { create } from 'zustand';
import { supabase } from './supabaseClient';

/**
 * 익명 로그인으로 시작 → 구매 시점에 linkKakao()로 실제 계정에 연동(계획서 1절).
 * 앱 부팅 시 1회 init() 호출.
 */
export const useAuthSession = create((set, get) => ({
  session: null,
  loading: true,
  error: null,

  async init() {
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
