import { useState, useEffect } from "react";
import { useZatcaDeviceStatus, useZatcaOnboard } from "@/hooks/useZatca";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, KeyRound, ExternalLink, RefreshCw, HelpCircle } from "lucide-react";

export default function ZatcaOnboardingSection({ settings, canSave }) {
  const branchId = "MAIN-BRANCH";
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useZatcaDeviceStatus(branchId);
  const onboardMutation = useZatcaOnboard();

  const [environment, setEnvironment] = useState("sandbox"); // 'sandbox' | 'production'
  const [otp, setOtp] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("1234");
  const [streetName, setStreetName] = useState(settings?.storeAddress || "خميس مشيط - مخطط الحسام");
  const [cityName, setCityName] = useState("Khamis Mushait");
  const [postalCode, setPostalCode] = useState("62461");
  const [showGuide, setShowGuide] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (settings?.storeAddress) {
      setStreetName(settings.storeAddress);
    }
  }, [settings]);

  const isOnboarded = statusData?.isFullyOnboarded;

  const handleOnboard = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const vat = (settings?.vatNumber || "").trim();
    if (!vat || vat.length !== 15 || !vat.startsWith("3") || !vat.endsWith("3")) {
      setErrorMsg("الرقم الضريبي غير صالح. يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3 (Saudi VAT must be 15 digits starting & ending with 3). يرجى تحديثه في إعدادات المتجر أعلاه أولاً.");
      return;
    }

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg("رمز التحقق OTP يجب أن يتكون من 6 أرقام بالضبط (OTP must be exactly 6 digits).");
      return;
    }

    const payload = {
      branchId,
      deviceName: "POS Terminal 01",
      otp: cleanOtp,
      environment,
      vatNumber: vat,
      taxpayerName: settings?.storeNameAr || settings?.storeName || "بقالة شيمه خليف عايد العنزي",
      branchName: settings?.storeNameAr || settings?.storeName || "الفرع الرئيسي",
      businessCategory: "Food & Beverage",
      crn: settings?.crNumber || undefined,
      streetName: streetName.trim() || "Main Street",
      buildingNumber: buildingNumber.trim() || "1234",
      cityName: cityName.trim() || "Riyadh",
      postalCode: postalCode.trim() || "12211",
    };

    try {
      const res = await onboardMutation.mutateAsync(payload);
      setSuccessMsg("تم ربط واعتماد الجهاز بنجاح مع هيئة الزكاة والضريبة والجمارك! تم استخراج شهادة الإنتاج (PCSID) بنجاح.");
      setOtp("");
      refetchStatus();
    } catch (err) {
      const errMsg = err?.message || err?.errorSources?.[0]?.message || "فشل الربط مع هيئة الزكاة. يرجى التأكد من صحة رمز OTP واختيار البيئة الصحيحة.";
      setErrorMsg(errMsg);
    }
  };

  return (
    <div className="pos-card p-5 mt-6 border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.02] to-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground">
                الربط مع هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2)
              </h3>
              {isOnboarded ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  مربوط بنجاح (Live)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertCircle size={12} />
                  غير مربوط (Pending)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              منظومة الفوترة الإلكترونية المرحلة الثانية (مرحلة الربط والتكامل) — إصدار الفواتير الضريبية وتشفير أختام XAdES و QR كود.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline self-start sm:self-auto"
        >
          <HelpCircle size={14} />
          كيف تحصل على رمز OTP؟
        </button>
      </div>

      {/* Guide Popout */}
      {showGuide && (
        <div className="mt-4 p-4 rounded-xl bg-muted/60 border border-border text-xs space-y-3">
          <div className="font-bold text-sm text-foreground flex items-center gap-2">
            <span>دليل الحصول على رمز التحقق (OTP) من بوابة هيئة الزكاة:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-card border border-border/80">
              <div className="font-bold text-emerald-600 mb-1">١. بيئة الاختبار (Sandbox Mode):</div>
              <p className="text-muted-foreground leading-relaxed">
                ادخل على بوابة مطوري الفوترة في الزكاة:{" "}
                <a href="https://sandbox.zatca.gov.sa" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  sandbox.zatca.gov.sa <ExternalLink size={10} />
                </a>
                . اختر وحدة الحل (Solution Unit) واطلب رمز OTP للتجربة مكون من 6 أرقام.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border/80">
              <div className="font-bold text-primary mb-1">٢. البيئة الحية والإنتاج (Production Mode):</div>
              <p className="text-muted-foreground leading-relaxed">
                ادخل على بوابة فاتورة الرسمية عبر نفاذ:{" "}
                <a href="https://fatoora.zatca.sa" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  fatoora.zatca.sa <ExternalLink size={10} />
                </a>
                . اذهب إلى (أجهزة وحلول الفوترة) ثم (إضافة جهاز جديد). سيظهر لك رمز OTP مكون من 6 أرقام صالح لمدة ساعة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Onboarding Form */}
      <form onSubmit={handleOnboard} className="mt-5 space-y-4">
        {/* Environment Selector */}
        <div>
          <label className="pos-label font-semibold">بيئة الربط (Environment)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                environment === "sandbox"
                  ? "border-primary bg-primary/5 text-foreground font-semibold"
                  : "border-border hover:bg-muted/30 text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="zatca_env"
                value="sandbox"
                checked={environment === "sandbox"}
                onChange={() => setEnvironment("sandbox")}
                className="text-primary"
              />
              <div>
                <div>Sandbox (بيئة الاختبار والتطوير)</div>
                <div className="text-[11px] font-normal text-muted-foreground">للتجربة وفحص الفواتير التجريبية</div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                environment === "production"
                  ? "border-emerald-600 bg-emerald-500/10 text-foreground font-semibold"
                  : "border-border hover:bg-muted/30 text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="zatca_env"
                value="production"
                checked={environment === "production"}
                onChange={() => setEnvironment("production")}
                className="text-emerald-600"
              />
              <div>
                <div>Production (البيئة الحية والمباشرة)</div>
                <div className="text-[11px] font-normal text-muted-foreground">للبقالة الحقيقية والفواتير القانونية الصادرة للزبائن</div>
              </div>
            </label>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="pos-label">الرقم الضريبي للمنشأة (15 رقم)</label>
            <input
              type="text"
              readOnly
              value={settings?.vatNumber || ""}
              placeholder="3XXXXXXXXXXXXX3"
              className="pos-input bg-muted/40 cursor-not-allowed font-mono text-xs"
            />
          </div>

          <div>
            <label className="pos-label">اسم المنشأة المسجل</label>
            <input
              type="text"
              readOnly
              value={settings?.storeNameAr || settings?.storeName || ""}
              className="pos-input bg-muted/40 cursor-not-allowed text-xs"
            />
          </div>

          <div>
            <label className="pos-label">رقم السجل التجاري (CRN)</label>
            <input
              type="text"
              readOnly
              value={settings?.crNumber || "—"}
              className="pos-input bg-muted/40 cursor-not-allowed text-xs"
            />
          </div>

          <div>
            <label className="pos-label font-bold text-primary flex items-center justify-between">
              <span className="flex items-center gap-1">
                <KeyRound size={13} />
                رمز التحقق OTP (6 أرقام) *
              </span>
              {environment === "sandbox" && (
                <button
                  type="button"
                  onClick={() => setOtp("123345")}
                  className="text-[11px] text-primary underline font-medium hover:opacity-80"
                >
                  استخدام رمز تجريبي (123345)
                </button>
              )}
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder={environment === "sandbox" ? "123345 أو 123456" : "رمز من بوابة زاتورة"}
              className="pos-input font-mono font-bold tracking-widest text-center text-sm border-primary focus:ring-primary"
              disabled={onboardMutation.isPending}
              required
            />
            {environment === "sandbox" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                💡 في بيئة Sandbox التجريبية، استخدم الرمز <span className="font-mono font-bold text-primary">123345</span> أو <span className="font-mono font-bold text-primary">123456</span>.
              </p>
            )}
          </div>
        </div>

        {/* Address Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="pos-label">المدينة (City)</label>
            <input
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              className="pos-input text-xs"
            />
          </div>
          <div>
            <label className="pos-label">الرمز البريدي (Postal Code)</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="pos-input text-xs"
            />
          </div>
          <div>
            <label className="pos-label">رقم المبنى (Building No)</label>
            <input
              type="text"
              value={buildingNumber}
              onChange={(e) => setBuildingNumber(e.target.value)}
              className="pos-input text-xs"
            />
          </div>
          <div>
            <label className="pos-label">اسم الشارع / الحي (Street)</label>
            <input
              type="text"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              className="pos-input text-xs"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span>الحالة الحالية:</span>
            {isStatusLoading ? (
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
            ) : isOnboarded ? (
              <span className="font-semibold text-emerald-600">
                مربوط بالكامل (معتمد بتاريخ {new Date(statusData?.onboardedAt || Date.now()).toLocaleDateString("ar-SA")})
              </span>
            ) : (
              <span className="font-semibold text-amber-600">غير معتمد حتى الآن</span>
            )}
          </div>

          <button
            type="submit"
            disabled={onboardMutation.isPending || !canSave}
            className="pos-btn-primary gap-2 px-6 py-2.5 text-xs font-semibold"
          >
            {onboardMutation.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                جاري التشفير والربط مع هيئة الزكاة...
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                بدء الربط والاعتماد مع الزكاة (Onboard Device)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
