/**
 * Country calling codes for phone inputs, keyed by ISO 3166-1 alpha-2.
 *
 * Several countries share a code (+1 for the US, Canada and the Caribbean,
 * +7 for Russia and Kazakhstan, +44 for the UK and its crown dependencies),
 * so a picker should remember the chosen ISO, not just the code.
 */
const CALLING_CODES: ReadonlyArray<readonly [iso: string, code: string]> = [
  ["AF", "+93"], ["AX", "+358"], ["AL", "+355"], ["DZ", "+213"], ["AS", "+1"],
  ["AD", "+376"], ["AO", "+244"], ["AI", "+1"], ["AG", "+1"], ["AR", "+54"],
  ["AM", "+374"], ["AW", "+297"], ["AU", "+61"], ["AT", "+43"], ["AZ", "+994"],
  ["BS", "+1"], ["BH", "+973"], ["BD", "+880"], ["BB", "+1"], ["BY", "+375"],
  ["BE", "+32"], ["BZ", "+501"], ["BJ", "+229"], ["BM", "+1"], ["BT", "+975"],
  ["BO", "+591"], ["BQ", "+599"], ["BA", "+387"], ["BW", "+267"], ["BR", "+55"],
  ["IO", "+246"], ["VG", "+1"], ["BN", "+673"], ["BG", "+359"], ["BF", "+226"],
  ["BI", "+257"], ["KH", "+855"], ["CM", "+237"], ["CA", "+1"], ["CV", "+238"],
  ["KY", "+1"], ["CF", "+236"], ["TD", "+235"], ["CL", "+56"], ["CN", "+86"],
  ["CX", "+61"], ["CC", "+61"], ["CO", "+57"], ["KM", "+269"], ["CG", "+242"],
  ["CD", "+243"], ["CK", "+682"], ["CR", "+506"], ["CI", "+225"], ["HR", "+385"],
  ["CU", "+53"], ["CW", "+599"], ["CY", "+357"], ["CZ", "+420"], ["DK", "+45"],
  ["DJ", "+253"], ["DM", "+1"], ["DO", "+1"], ["EC", "+593"], ["EG", "+20"],
  ["SV", "+503"], ["GQ", "+240"], ["ER", "+291"], ["EE", "+372"], ["SZ", "+268"],
  ["ET", "+251"], ["FK", "+500"], ["FO", "+298"], ["FJ", "+679"], ["FI", "+358"],
  ["FR", "+33"], ["GF", "+594"], ["PF", "+689"], ["GA", "+241"], ["GM", "+220"],
  ["GE", "+995"], ["DE", "+49"], ["GH", "+233"], ["GI", "+350"], ["GR", "+30"],
  ["GL", "+299"], ["GD", "+1"], ["GP", "+590"], ["GU", "+1"], ["GT", "+502"],
  ["GG", "+44"], ["GN", "+224"], ["GW", "+245"], ["GY", "+592"], ["HT", "+509"],
  ["HN", "+504"], ["HK", "+852"], ["HU", "+36"], ["IS", "+354"], ["IN", "+91"],
  ["ID", "+62"], ["IR", "+98"], ["IQ", "+964"], ["IE", "+353"], ["IM", "+44"],
  ["IL", "+972"], ["IT", "+39"], ["JM", "+1"], ["JP", "+81"], ["JE", "+44"],
  ["JO", "+962"], ["KZ", "+7"], ["KE", "+254"], ["KI", "+686"], ["XK", "+383"],
  ["KW", "+965"], ["KG", "+996"], ["LA", "+856"], ["LV", "+371"], ["LB", "+961"],
  ["LS", "+266"], ["LR", "+231"], ["LY", "+218"], ["LI", "+423"], ["LT", "+370"],
  ["LU", "+352"], ["MO", "+853"], ["MG", "+261"], ["MW", "+265"], ["MY", "+60"],
  ["MV", "+960"], ["ML", "+223"], ["MT", "+356"], ["MH", "+692"], ["MQ", "+596"],
  ["MR", "+222"], ["MU", "+230"], ["YT", "+262"], ["MX", "+52"], ["FM", "+691"],
  ["MD", "+373"], ["MC", "+377"], ["MN", "+976"], ["ME", "+382"], ["MS", "+1"],
  ["MA", "+212"], ["MZ", "+258"], ["MM", "+95"], ["NA", "+264"], ["NR", "+674"],
  ["NP", "+977"], ["NL", "+31"], ["NC", "+687"], ["NZ", "+64"], ["NI", "+505"],
  ["NE", "+227"], ["NG", "+234"], ["NU", "+683"], ["NF", "+672"], ["KP", "+850"],
  ["MK", "+389"], ["MP", "+1"], ["NO", "+47"], ["OM", "+968"], ["PK", "+92"],
  ["PW", "+680"], ["PS", "+970"], ["PA", "+507"], ["PG", "+675"], ["PY", "+595"],
  ["PE", "+51"], ["PH", "+63"], ["PL", "+48"], ["PT", "+351"], ["PR", "+1"],
  ["QA", "+974"], ["RE", "+262"], ["RO", "+40"], ["RU", "+7"], ["RW", "+250"],
  ["BL", "+590"], ["SH", "+290"], ["KN", "+1"], ["LC", "+1"], ["MF", "+590"],
  ["PM", "+508"], ["VC", "+1"], ["WS", "+685"], ["SM", "+378"], ["ST", "+239"],
  ["SA", "+966"], ["SN", "+221"], ["RS", "+381"], ["SC", "+248"], ["SL", "+232"],
  ["SG", "+65"], ["SX", "+1"], ["SK", "+421"], ["SI", "+386"], ["SB", "+677"],
  ["SO", "+252"], ["ZA", "+27"], ["KR", "+82"], ["SS", "+211"], ["ES", "+34"],
  ["LK", "+94"], ["SD", "+249"], ["SR", "+597"], ["SJ", "+47"], ["SE", "+46"],
  ["CH", "+41"], ["SY", "+963"], ["TW", "+886"], ["TJ", "+992"], ["TZ", "+255"],
  ["TH", "+66"], ["TL", "+670"], ["TG", "+228"], ["TK", "+690"], ["TO", "+676"],
  ["TT", "+1"], ["TN", "+216"], ["TR", "+90"], ["TM", "+993"], ["TC", "+1"],
  ["TV", "+688"], ["VI", "+1"], ["UG", "+256"], ["UA", "+380"], ["AE", "+971"],
  ["GB", "+44"], ["US", "+1"], ["UY", "+598"], ["UZ", "+998"], ["VU", "+678"],
  ["VA", "+39"], ["VE", "+58"], ["VN", "+84"], ["WF", "+681"], ["EH", "+212"],
  ["YE", "+967"], ["ZM", "+260"], ["ZW", "+263"],
];

/** The country a shared code means when only the code is known. */
const PRIMARY_FOR_CODE: Record<string, string> = {
  "+1": "US",
  "+7": "RU",
  "+44": "GB",
  "+47": "NO",
  "+61": "AU",
  "+212": "MA",
  "+262": "RE",
  "+290": "SH",
  "+358": "FI",
  "+39": "IT",
  "+590": "GP",
  "+599": "CW",
};

export type PhoneCountry = {
  iso: string;
  code: string;
  name: string;
  flag: string;
};

function regionName(iso: string, names: Intl.DisplayNames | null) {
  if (iso === "XK") return "Kosovo";
  try {
    return names?.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

function flagEmoji(iso: string) {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65),
  );
}

function buildCountries(): PhoneCountry[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    names = null;
  }
  return CALLING_CODES.map(([iso, code]) => ({
    iso,
    code,
    name: regionName(iso, names),
    flag: flagEmoji(iso),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export const PHONE_COUNTRIES: readonly PhoneCountry[] = buildCountries();

export function phoneCountryByIso(iso: string): PhoneCountry | undefined {
  const key = iso.trim().toUpperCase();
  return PHONE_COUNTRIES.find((row) => row.iso === key);
}

/** The country for a calling code, preferring the main one for shared codes. */
export function phoneCountryForCode(code: string): PhoneCountry | undefined {
  const primary = PRIMARY_FOR_CODE[code];
  return (
    (primary ? phoneCountryByIso(primary) : undefined) ??
    PHONE_COUNTRIES.find((row) => row.code === code)
  );
}

/**
 * Countries matching a search: by name ("nep"), ISO code ("np") or calling
 * code ("977" or "+977"). Exact ISO and code matches come first.
 */
export function searchPhoneCountries(query: string): PhoneCountry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...PHONE_COUNTRIES];
  const digits = q.replace(/^\+/, "");
  const isCode = /^\d+$/.test(digits);
  const rank = (row: PhoneCountry) => {
    if (row.iso.toLowerCase() === q) return 0;
    if (isCode && row.code === `+${digits}`) {
      return PRIMARY_FOR_CODE[row.code] === row.iso ? -1 : 0;
    }
    if (row.name.toLowerCase().startsWith(q)) return 1;
    return 2;
  };
  return PHONE_COUNTRIES.filter(
    (row) =>
      row.name.toLowerCase().includes(q) ||
      row.iso.toLowerCase() === q ||
      (isCode && row.code.slice(1).startsWith(digits)),
  ).sort((a, b) => rank(a) - rank(b));
}
