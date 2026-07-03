import { useEffect, useState } from "react";
import { confirmPayment } from "./paymentApi";

/**
 * 토스 successUrl(?pay=success&paymentKey=..&orderId=..&amount=..) 처리.
 * App 최상단에서 렌더링 — 파라미터 없으면 아무것도 표시하지 않음.
 */
export default function PaymentResult({ onGranted }) {
  const [state, setState] = useState(null); // null | confirming | done | fail

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pay = p.get("pay");
    if (!pay) return;

    if (pay === "fail") { setState("fail"); return; }

    setState("confirming");
    confirmPayment(p.get("paymentKey"), p.get("orderId"), p.get("amount"))
      .then(() => { setState("done"); onGranted?.(); })
      .catch(() => setState("fail"))
      .finally(() => window.history.replaceState({}, "", window.location.pathname));
  }, [onGranted]);

  if (!state) return null;
  return (
    <div className="pay-toast" role="status">
      {state === "confirming" && "결제 확인 중..."}
      {state === "done" && "구매 완료! 이어서 들어보세요 🎧"}
      {state === "fail" && "결제가 완료되지 않았어요. 다시 시도해 주세요."}
    </div>
  );
}
