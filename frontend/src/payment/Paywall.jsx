import { useEffect, useRef, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { checkout, deviceId } from "./paymentApi";

const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? "test_ck_XXXXXXXXXXXXXXXX";

/**
 * 페이월 바텀시트.
 * 흐름: 상품 선택 → POST /api/checkout(서버가 금액 확정) → 토스 위젯 → successUrl 리다이렉트
 */
export default function Paywall({ courseTitle, onClose }) {
  const [product, setProduct] = useState("EP01"); // EP01 | BUSAN_BUNDLE
  const [step, setStep] = useState("select");     // select | widget
  const [order, setOrder] = useState(null);
  const widgetsRef = useRef(null);

  const openWidget = async () => {
    const o = await checkout(product);            // 금액은 서버 응답값만 사용
    setOrder(o);
    setStep("widget");

    const toss = await loadTossPayments(CLIENT_KEY);
    const widgets = toss.widgets({ customerKey: deviceId() });
    widgetsRef.current = widgets;

    await widgets.setAmount({ currency: "KRW", value: o.amount });
    await widgets.renderPaymentMethods({ selector: "#pay-methods" });
    await widgets.renderAgreement({ selector: "#pay-agreement" });
  };

  const requestPay = async () => {
    await widgetsRef.current.requestPayment({
      orderId: order.orderId,
      orderName: order.orderName,
      successUrl: `${window.location.origin}?pay=success`,
      failUrl: `${window.location.origin}?pay=fail`,
    });
  };

  return (
    <div className="paywall-dim" role="dialog" aria-modal="true" aria-label="구매">
      <div className="paywall">
        <div className="paywall__handle" />
        <h3 className="paywall__title">이야기의 절정이 기다립니다</h3>
        <p className="paywall__desc">「{courseTitle}」 3화부터는 구매 후 들을 수 있어요.</p>

        {step === "select" && (
          <>
            <button
              className={`paywall__option ${product === "EP01" ? "paywall__option--on" : ""}`}
              onClick={() => setProduct("EP01")}
            >
              <span>이 에피소드</span><b>₩6,900</b>
            </button>
            <button
              className={`paywall__option ${product === "BUSAN_BUNDLE" ? "paywall__option--on" : ""}`}
              onClick={() => setProduct("BUSAN_BUNDLE")}
            >
              <span>부산 3편 번들 <em>28% 할인</em></span><b>₩14,900</b>
            </button>
            <button className="paywall__cta" onClick={openWidget}>구매하기</button>
          </>
        )}

        {step === "widget" && (
          <>
            <div id="pay-methods" />
            <div id="pay-agreement" />
            <button className="paywall__cta" onClick={requestPay}>
              ₩{order.amount.toLocaleString()} 결제
            </button>
          </>
        )}

        <button className="paywall__close" onClick={onClose}>나중에 할게요</button>
      </div>
    </div>
  );
}
