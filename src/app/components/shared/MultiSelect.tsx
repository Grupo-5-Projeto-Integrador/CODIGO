import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectProps {
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
  hasError?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder = "Buscar...",
  hasError,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== val));
  };

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((o) => !o)}
        className={`w-full min-h-[42px] border ${
          hasError ? "border-[#D93030] bg-red-50" : "border-gray-200"
        } rounded-xl py-2 px-3 pr-9 focus-within:ring-2 focus-within:ring-[#8B1A1A]/20 focus-within:border-[#8B1A1A] bg-white text-sm cursor-pointer flex flex-wrap gap-1.5 items-center`}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-lg px-2 py-0.5 text-xs font-medium"
            >
              {v}
              <button
                type="button"
                onClick={(e) => remove(v, e)}
                className="hover:text-[#D93030] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <ChevronDown
        className={`w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={searchPlaceholder}
              className="w-full text-sm px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-[#8B1A1A]/40 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum item encontrado</p>
            ) : (
              filtered.map((opt) => {
                const checked = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                      checked ? "bg-[#8B1A1A]/5" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                      className="w-4 h-4 rounded border-gray-300 text-[#8B1A1A] focus:ring-[#8B1A1A]/20 accent-[#8B1A1A]"
                    />
                    <span className="text-sm text-gray-800">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-[#D93030] transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
