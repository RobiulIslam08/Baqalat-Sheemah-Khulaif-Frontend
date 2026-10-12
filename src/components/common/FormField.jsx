export default function FormField({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  options = [], 
  placeholder, 
  error,
  className = "",
  ...props 
}) {
  const inputId = `field-${label?.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="pos-label">{label}</label>}
      
      {type === "select" ? (
        <select
          id={inputId}
          className="pos-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={type}
          className="pos-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          {...props}
        />
      )}
      
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
