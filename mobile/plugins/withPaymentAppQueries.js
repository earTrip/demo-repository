const { withAndroidManifest } = require('@expo/config-plugins');

// Android 11+(API 30) 패키지 가시성 제한 때문에 <queries> 없이는 카카오페이/삼성페이/
// 각 카드사 앱 스킴을 Linking.canOpenURL()로 감지할 수 없다. iOS의
// LSApplicationQueriesSchemes와 동일한 스킴 목록을 재사용한다 (Toss 공식 문서 기준).
const PAYMENT_APP_SCHEMES = [
  'supertoss',
  'kb-acp', 'liivbank', 'newliiv', 'kbbank',
  'nhappcardansimclick', 'nhallonepayansimclick', 'nonghyupcardansimclick',
  'lottesmartpay', 'lotteappcard',
  'mpocket.online.ansimclick', 'mpocket.ansimclick.cert', 'vguardstart', 'samsungpay', 'monimopay', 'monimopayauth',
  'shinhan-sr-ansimclick', 'smshinhanansimclick',
  'com.wooricard.wcard', 'newsmartpib',
  'citispay', 'citicardappkr', 'citimobileapp',
  'cloudpay', 'hanawalletmembers',
  'hdcardappcardansimclick', 'smhyundaiansimclick',
  'shinsegaeeasypayment', 'payco', 'lpayapp',
  'ispmobile',
  'kakaobank',
];

function withPaymentAppQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) manifest.queries = [{}];

    const intents = PAYMENT_APP_SCHEMES.map((scheme) => ({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      data: [{ $: { 'android:scheme': scheme } }],
    }));

    manifest.queries[0].intent = [...(manifest.queries[0].intent ?? []), ...intents];
    return config;
  });
}

module.exports = withPaymentAppQueries;
