import { useLanguage } from "@/contexts/LanguageContext";

export default function DataTable({ columns, data, footer, minWidth = "900px" }) {
  const { t, lang } = useLanguage();

  return (
    <div className="pos-card overflow-x-auto">
      <table className="pos-table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted-foreground py-8">
                {t("common.noData")}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row[col.key], row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {footer && <div className="p-3 border-t border-border">{footer}</div>}
      
      {!footer && data.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>{t("common.showingRows", { count: data.length })}</span>
          <span>{t("common.updatedJustNow")}</span>
        </div>
      )}
    </div>
  );
}
