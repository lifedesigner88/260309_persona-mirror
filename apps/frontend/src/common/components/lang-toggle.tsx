import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function LangToggle() {
  const { i18n } = useTranslation();
  const isKo = i18n.resolvedLanguage === "ko";

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);

  function toggle() {
    const next = isKo ? "en" : "ko";
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
  }

  return (
    <button
      aria-label="Toggle language"
      className="flex items-center overflow-hidden rounded-full border shadow-sm transition hover:shadow-md"
      style={{
        borderColor: isKo ? "#c0392b40" : "#2563eb40",
      }}
      onClick={toggle}
    >
      <span
        className="px-3 py-1.5 text-xs font-bold tracking-wide transition-all duration-200"
        style={
          !isKo
            ? { background: "#2563eb", color: "#ffffff" }
            : { background: "transparent", color: "#2563eb60" }
        }
      >
        EN
      </span>
      <span
        className="px-3 py-1.5 text-xs font-bold tracking-wide transition-all duration-200"
        style={
          isKo
            ? { background: "#c0392b", color: "#ffffff" }
            : { background: "transparent", color: "#c0392b60" }
        }
      >
        KO
      </span>
    </button>
  );
}
