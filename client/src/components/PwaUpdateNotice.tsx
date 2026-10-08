import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * A visible, user-triggered update path. It never clears authentication or
 * local storage; staff pages can mark unsaved editor text through the
 * `lim:dirty-edits` browser event so a reload is deferred until reviewed.
 */
export default function PwaUpdateNotice() {
  const [hasDirtyEdits, setHasDirtyEdits] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.warn("[PWA] service-worker registration failed", error);
    },
  });

  useEffect(() => {
    const onDirty = (event: Event) => {
      const detail = event as CustomEvent<{ dirty?: boolean }>;
      setHasDirtyEdits(Boolean(detail.detail?.dirty));
    };
    window.addEventListener("lim:dirty-edits", onDirty);
    return () => window.removeEventListener("lim:dirty-edits", onDirty);
  }, []);

  if (!needRefresh) return null;
  return (
    <aside role="status" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-4 text-right shadow-xl" dir="rtl">
      <p className="font-bold">تحديث LIM جاهز</p>
      <p className="mt-1 text-sm text-slate-600">
        إصدار البناء <bdi>{__LIM_BUILD_ID__}</bdi> متاح. لا يمس التحديث تسجيل الدخول أو بيانات الجلسة.
      </p>
      {hasDirtyEdits ? (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          لديك تعديلات غير محفوظة في الصفحة. راجعها واحفظها أولًا؛ لن نعيد تحميل الصفحة تلقائيًا.
        </p>
      ) : (
        <button className="mt-3 rounded-xl bg-[#123f37] px-4 py-2 font-bold text-white" onClick={() => void updateServiceWorker(true)}>
          تحديث الآن
        </button>
      )}
    </aside>
  );
}
