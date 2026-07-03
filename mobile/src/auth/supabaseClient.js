import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { LargeSecureStore } from './LargeSecureStore';

// Supabase 프로젝트 생성 후 mobile/.env에 아래 두 값을 채울 것 (mobile/.env.example 참고).
// 값이 비어 있으면 더미 URL로 폴백 — 앱은 뜨지만 인증 관련 호출은 전부 실패한다(의도된 동작).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'REPLACE_WITH_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // 네이티브에는 브라우저 리다이렉트 플로우가 없음
  },
});
