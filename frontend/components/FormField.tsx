export function FormField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-soft focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
      />
    </label>
  );
}
