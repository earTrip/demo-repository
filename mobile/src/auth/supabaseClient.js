import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { LargeSecureStore } from './LargeSecureStore';

// Supabase 프로젝트 생성 후 mobile/.env에 아래 두 값을 채울 것 (mobile/.env.example 참고).
// 값이 비어 있으면 더미 URL로 폴백 — 앱은 뜨지만 인증 관련 호출은 전부 실패한다(의도된 동작).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'REPLACE_WITH_ANON_KEY';

/**
 * .env가 채워졌는지 여부. 플레이스홀더면 네트워크를 시도할 이유가 없다 —
 * 시도하면 @supabase/auth-js가 실패를 console.error로 찍어 개발 중 빨간 박스가 뜨는데,
 * 그 로그는 우리 catch보다 먼저 나와서 막을 수 없다. 호출을 안 하는 게 유일한 방법이다.
 */
export const isSupabaseConfigured =
  !SUPABASE_URL.includes('YOUR_PROJECT_REF') && !SUPABASE_ANON_KEY.startsWith('REPLACE_WITH');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // 네이티브에는 브라우저 리다이렉트 플로우가 없음
  },
});
