import { useLanguage } from "@/contexts/LanguageContext";
import { Send } from "lucide-react";

export default function HelpPage() {
  const { t, lang } = useLanguage();
  const sections = lang === "ar" ? ["المبيعات", "المشتريات", "المخزون"] : ["Sales", "Purchase", "Inventory"];
  const priorities = lang === "ar" ? ["منخفض", "متوسط", "عالي"] : ["Low", "Medium", "High"];
  return (
    <div className="space-y-4">
      <h2 className="pos-page-title">{t("nav.help")}</h2>
      <div className="pos-card p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="pos-input" placeholder={lang === "ar" ? "رقم التذكرة" : "Ticket No"} />
        <input className="pos-input" placeholder={lang === "ar" ? "العنوان" : "Subject"} />
        <select className="pos-select"><option>{lang === "ar" ? "القسم" : "Section"}</option>{sections.map((option) => <option key={option}>{option}</option>)}</select>
        <select className="pos-select"><option>{lang === "ar" ? "الأولوية" : "Priority"}</option>{priorities.map((option) => <option key={option}>{option}</option>)}</select>
        <input className="pos-input md:col-span-2" placeholder={lang === "ar" ? "الوصف" : "Description"} />
      </div>
      <div className="flex justify-center"><button className="pos-btn-primary gap-1"><Send size={14} /> {lang === "ar" ? "فتح تذكرة" : "Open Ticket"}</button></div>
    </div>
  );
}