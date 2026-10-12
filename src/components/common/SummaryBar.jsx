import { useLanguage } from "@/contexts/LanguageContext";

export default function SummaryBar({ items }) {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-0 mb-4">
      <div className="pos-summary-bar">
        {items.map((item, i) => (
          <div key={`header-${i}`} className={`pos-summary-cell pos-summary-cell-header ${item.hiddenOnMobile ? 'hidden md:block' : ''}`}>
            {item.label}
          </div>
        ))}
      </div>
      <div className="pos-summary-bar">
        {items.map((item, i) => (
          <div key={`value-${i}`} className={`pos-summary-cell pos-summary-cell-value ${item.hiddenOnMobile ? 'hidden md:block' : ''}`}>
            {item.value}
          </div>
        ))}
      </div>
    </div>
  );
}
