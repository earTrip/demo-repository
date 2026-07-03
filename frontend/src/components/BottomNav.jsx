const TABS = [
  { key: "home",  label: "홈",       icon: (a) => <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/> },
  { key: "map",   label: "지도",     icon: (a) => <><path d="M12 21s-6.5-5.4-6.5-10A6.5 6.5 0 0 1 12 4.5 6.5 6.5 0 0 1 18.5 11c0 4.6-6.5 10-6.5 10z" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="11" r="2.2" fill={a ? "#fff" : "currentColor"}/></> },
  { key: "my",    label: "마이페이지", icon: () => <><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></> },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            className={`bottom-nav__item ${active ? "bottom-nav__item--active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(t.key)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">{t.icon(active)}</svg>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
