import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  PaymentWidgetProvider,
  PaymentMethodWidget,
  AgreementWidget,
  usePaymentWidget,
} from '@tosspayments/widget-sdk-react-native';
import { checkout, confirmPayment } from './paymentApi';
import { useAuthSession } from '../auth/useAuthSession';

const CLIENT_KEY = process.env.EXPO_PUBLIC_TOSS_CLIENT_KEY ?? 'test_ck_XXXXXXXXXXXXXXXX';

/**
 * 페이월 바텀시트 (모바일).
 * 흐름: 상품 선택 → POST /api/checkout(서버가 금액 확정) → 네이티브 위젯 모달 →
 * requestPayment()가 Promise로 성공/실패를 바로 반환 (웹과 달리 successUrl 리다이렉트
 * 파싱이 필요 없음 — SDK가 tosspayments://success|fail 스킴을 내부에서 가로채 처리).
 */
function PaywallInner({ courseTitle, onClose, onGranted }) {
  const [product, setProduct] = useState('EP01'); // EP01 | BUSAN_BUNDLE
  const [step, setStep] = useState('select'); // select | widget
  const [order, setOrder] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const { renderPaymentMethods, renderAgreement, requestPayment } = usePaymentWidget();

  const openWidget = async () => {
    const o = await checkout(product); // 금액은 서버 응답값만 사용
    setOrder(o);
    setStep('widget');
    await renderPaymentMethods('pay-methods', o.amount);
    await renderAgreement('pay-agreement');
  };

  const requestPay = async () => {
    const result = await requestPayment({ orderId: order.orderId, orderName: order.orderName });
    if (result.success) {
      setConfirming(true);
      try {
        await confirmPayment(result.success.paymentKey, result.success.orderId, result.success.amount);
        onGranted?.();
        onClose?.();
      } finally {
        setConfirming(false);
      }
    }
    // result.fail: 사용자 취소/결제 실패 — 위젯 화면에 남아 재시도 가능하도록 그대로 둠
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>이야기의 절정이 기다립니다</Text>
      <Text style={styles.desc}>「{courseTitle}」 3화부터는 구매 후 들을 수 있어요.</Text>

      {step === 'select' && (
        <>
          <TouchableOpacity
            style={[styles.option, product === 'EP01' && styles.optionOn]}
            onPress={() => setProduct('EP01')}
          >
            <Text>이 에피소드</Text>
            <Text style={styles.price}>₩6,900</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, product === 'BUSAN_BUNDLE' && styles.optionOn]}
            onPress={() => setProduct('BUSAN_BUNDLE')}
          >
            <Text>부산 3편 번들 (28% 할인)</Text>
            <Text style={styles.price}>₩14,900</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cta} onPress={openWidget}>
            <Text style={styles.ctaText}>구매하기</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'widget' && (
        <>
          <PaymentMethodWidget selector="pay-methods" />
          <AgreementWidget selector="pay-agreement" />
          <TouchableOpacity style={styles.cta} onPress={requestPay} disabled={confirming || !order}>
            <Text style={styles.ctaText}>
              {confirming ? '확인 중...' : `₩${(order?.amount ?? 0).toLocaleString()} 결제`}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={onClose}>
        <Text style={styles.close}>나중에 할게요</Text>
      </TouchableOpacity>
    </View>
  );
}

/** customerKey는 deviceId 대신 Supabase auth.users.id 사용 (계획서 3.3절) */
export default function Paywall(props) {
  const userId = useAuthSession((s) => s.session?.user?.id);
  return (
    <PaymentWidgetProvider clientKey={CLIENT_KEY} customerKey={userId ?? 'anonymous'}>
      <PaywallInner {...props} />
    </PaymentWidgetProvider>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  desc: { color: '#666', marginBottom: 16 },
  option: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 8, backgroundColor: '#f2f2f2', marginBottom: 8 },
  optionOn: { backgroundColor: '#e0edff' },
  price: { fontWeight: '700' },
  cta: { backgroundColor: '#3182f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  close: { textAlign: 'center', color: '#999', marginTop: 16 },
});
