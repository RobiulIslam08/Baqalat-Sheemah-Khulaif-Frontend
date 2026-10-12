export default function PageTitle({ title, subtitle }) {
  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-4">
      <h2 className="pos-page-title mb-0">{title}</h2>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
