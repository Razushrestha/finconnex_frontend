interface CountrySale {
  name: string;
  products: string;
  flagEmoji: string;
}

const countries: CountrySale[] = [
  { name: "America", products: "4,265", flagEmoji: "🇬🇧" },
  { name: "China", products: "3,740", flagEmoji: "🇨🇳" },
  { name: "Germany", products: "2,980", flagEmoji: "🇩🇪" },
  { name: "Japan", products: "1,640", flagEmoji: "🇯🇵" },
];

export function SalesByCountryCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Sales by Country
        </h3>
        <a
          href="#"
          className="text-sm font-medium text-indigo-500 hover:text-indigo-600"
        >
          View All
        </a>
      </div>

      {/* Total */}
      <div className="mb-5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-800">$45,314</span>
        <span className="text-sm text-slate-500">
          <span className="font-medium text-emerald-600">+8.2%</span> vs last
          month
        </span>
      </div>

      {/* Country list */}
      <ul className="space-y-3">
        {countries.map((country) => (
          <li
            key={country.name}
            className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{country.flagEmoji}</span>
              <span className="font-medium text-slate-800">{country.name}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-800">
                {country.products}{" "}
              </span>
              <span className="text-sm text-slate-400">Products</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
