import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateFormulation } from "@/hooks/useFormulations";
import { Save, Loader2 } from "lucide-react";

export default function AddFormulationPage() {
  const { t, lang } = useLanguage();
  const createFormulation = useCreateFormulation();
  const [form, setForm] = useState({ code: "", name: "", group: "", strength: "", manufacturer: "", notes: "" });
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    createFormulation.mutate({ 
      formulationCode: form.code.trim(), 
      formulationName: form.name.trim(), 
      group: form.group.trim() || undefined, 
      strength: form.strength.trim() || undefined, 
      manufacturer: form.manufacturer.trim() || undefined, 
      notes: form.notes.trim() || undefined 
    },
    { onSuccess: () => setForm({ code: "", name: "", group: "", strength: "", manufacturer: "", notes: "" }) });
  };

  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("masters.addFormulation")}</h2>
      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="pos-label">{lang === "ar" ? "كود التركيبة" : "Formulation Code"}</label><input className="pos-input" value={form.code} onChange={(e) => update("code", e.target.value)} /></div>
        <div><label className="pos-label">{lang === "ar" ? "اسم التركيبة" : "Formulation Name"}</label><input className="pos-input" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
        <div><label className="pos-label">{lang === "ar" ? "المجموعة" : "Group"}</label><input className="pos-input" value={form.group} onChange={(e) => update("group", e.target.value)} /></div>
        <div><label className="pos-label">{lang === "ar" ? "التركيز" : "Strength"}</label><input className="pos-input" value={form.strength} onChange={(e) => update("strength", e.target.value)} /></div>
        <div><label className="pos-label">{lang === "ar" ? "الشركة" : "Manufacturer"}</label><input className="pos-input" value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} /></div>
        <div><label className="pos-label">{lang === "ar" ? "ملاحظات" : "Notes"}</label><input className="pos-input" value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
      </div>
      <div className="flex justify-center">
        <button 
          className="pos-btn-primary gap-1" 
          onClick={handleSave} 
          disabled={createFormulation.isPending}
        >
          {createFormulation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
          {lang === "ar" ? "حفظ التركيبة" : "Save Formulation"}
        </button>
      </div>
    </div>
  );
}