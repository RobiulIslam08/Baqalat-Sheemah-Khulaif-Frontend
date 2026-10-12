import { Search, Download, Printer, Plus, Save, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function SearchButtons({ onSearch, onExport, onPrint }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {onSearch && (
        <button onClick={onSearch} className="pos-btn-primary gap-1">
          <Search size={14} /> {t("common.search")}
        </button>
      )}
      {onExport && (
        <button onClick={onExport} className="pos-btn-secondary gap-1">
          <Download size={14} /> {t("common.export")}
        </button>
      )}
      {onPrint && (
        <button onClick={onPrint} className="pos-btn-secondary gap-1">
          <Printer size={14} /> {t("common.print")}
        </button>
      )}
    </div>
  );
}

export function FormActions({ onAdd, onSave, onReset, primaryAction, secondaryAction }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-6">
      {onAdd && (
        <button onClick={onAdd} className="pos-btn-secondary gap-1">
          <Plus size={14} /> {t("common.addNew")}
        </button>
      )}
      
      {secondaryAction && (
        <button onClick={secondaryAction.onClick} className="pos-btn-secondary">
          {secondaryAction.label}
        </button>
      )}
      
      {primaryAction && (
        <button onClick={primaryAction.onClick} className="pos-btn-primary">
          {primaryAction.label}
        </button>
      )}
      
      {onSave && (
        <button onClick={onSave} className="pos-btn-primary gap-1">
          <Save size={14} /> {t("common.save")}
        </button>
      )}
      
      {onReset && (
        <button onClick={onReset} className="pos-btn-secondary gap-1">
          <RotateCcw size={14} /> {t("common.reset")}
        </button>
      )}
    </div>
  );
}
