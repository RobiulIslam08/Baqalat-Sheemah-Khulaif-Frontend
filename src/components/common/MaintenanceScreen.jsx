import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldAlert, Wrench, Phone, LogIn, RefreshCw, AlertCircle } from "lucide-react";

export default function MaintenanceScreen({ license, onRefresh }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const isAr = lang === "ar";

  const storeName = isAr
    ? "بقالة شيمه خليف عايد العنزي للمواد الغذائية"
    : "Baqalat Sheemah Khulaif Aayed Al-Enazi Lil-Mawad Al-Ghidha'iyyah";

  const title = isAr
    ? "الموقع تحت أعمال الصيانة والتحديث"
    : "System is Under Maintenance";

  const defaultMessage = isAr
    ? "يقوم فريق التطوير حالياً بإجراء تحديثات مهمة وصيانة للنظام لضمان حماية وسلامة البيانات. تم إيقاف جميع العمليات مؤقتاً وسيعود النظام للعمل قريباً."
    : "The development team is performing essential system maintenance and database updates. All operations are temporarily suspended to protect data integrity. The system will be back online shortly.";

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full bg-slate-900/80 border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-10 backdrop-blur-xl relative z-10 text-center space-y-6">
        {/* Animated Icon Badge */}
        <div className="inline-flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping opacity-75" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 relative">
            <ShieldAlert size={42} className="stroke-[2.2]" />
          </div>
        </div>

        {/* Store Title */}
        <div>
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full mb-3">
            {isAr ? "وضع الصيانة الشاملة نشط" : "Full Maintenance Mode Active"}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-200 tracking-tight">
            {storeName}
          </h2>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {title}
          </h1>
        </div>

        {/* Developer Note / Message Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 text-left rtl:text-right space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <Wrench size={18} className="shrink-0 animate-spin text-amber-400" style={{ animationDuration: "6s" }} />
            <span>{isAr ? "رسالة المطور وإشعار الصيانة:" : "Developer Maintenance Notice:"}</span>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
            {license?.note ? license.note : defaultMessage}
          </p>
        </div>

        {/* Support Phone if provided */}
        {license?.supportPhone && (
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 text-sm font-medium">
            <Phone size={16} className="text-emerald-400" />
            <span>{isAr ? "للتواصل مع المطور والدعم الفني:" : "Developer & Technical Support:"}</span>
            <a
              href={`tel:${license.supportPhone}`}
              className="text-emerald-400 hover:text-emerald-300 font-bold font-mono tracking-wider underline underline-offset-4"
            >
              {license.supportPhone}
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-slate-800/80">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition flex items-center justify-center gap-2 border border-slate-700"
            >
              <RefreshCw size={16} />
              <span>{isAr ? "تحديث الحالة" : "Check Again"}</span>
            </button>
          )}

          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-sm font-bold shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
          >
            <LogIn size={16} />
            <span>{isAr ? "تسجيل دخول المطور" : "Developer Login"}</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="text-xs text-slate-500">
          {isAr
            ? "سيتم تفعيل النظام تلقائياً بمجرد انتهاء المطور من إجراء الصيانة والتحديثات."
            : "The system will be restored automatically as soon as developer maintenance is completed."}
        </p>
      </div>
    </div>
  );
}
