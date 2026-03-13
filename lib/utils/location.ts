const PROVINCE_ABBR_BY_NAME: Record<string, string> = {
  "buenos aires": "BA",
  "capital federal": "CABA",
  "catamarca": "CT",
  "chaco": "CC",
  "chubut": "CH",
  "cordoba": "CB",
  "corrientes": "CR",
  "entre rios": "ER",
  "formosa": "FM",
  "jujuy": "JY",
  "la pampa": "LP",
  "la rioja": "LR",
  "mendoza": "MZ",
  "misiones": "MN",
  "neuquen": "NQ",
  "rio negro": "RN",
  "salta": "SA",
  "san juan": "SJ",
  "san luis": "SL",
  "santa cruz": "SC",
  "santa fe": "SF",
  "santiago del estero": "SE",
  "tierra del fuego": "TF",
  "tucuman": "TM",
};

const PROVINCE_ABBR_BY_NUMERIC_CODE: Record<string, string> = {
  "2": "CABA",
  "6": "BA",
  "10": "CT",
  "14": "CC",
  "18": "CH",
  "22": "CB",
  "26": "CR",
  "30": "ER",
  "34": "FM",
  "38": "JY",
  "42": "LP",
  "46": "LR",
  "50": "MZ",
  "54": "MN",
  "58": "NQ",
  "62": "RN",
  "66": "SA",
  "70": "SJ",
  "74": "SL",
  "78": "SC",
  "82": "SF",
  "86": "SE",
  "90": "TF",
  "94": "TM",
};

const PROVINCE_ABBR_BY_ISO_SUBDIVISION: Record<string, string> = {
  A: "SA",
  B: "BA",
  C: "CABA",
  D: "SL",
  E: "ER",
  F: "LR",
  G: "SE",
  H: "CC",
  J: "SJ",
  K: "CT",
  L: "LP",
  M: "MZ",
  N: "MN",
  P: "FM",
  Q: "NQ",
  R: "RN",
  S: "SF",
  T: "TM",
  U: "CH",
  V: "TF",
  W: "CR",
  X: "CB",
  Y: "JY",
  Z: "SC",
};

function normalizeProvinceName(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getProvinceAbbr(regionCode?: string | null, regionName?: string | null) {
  const rawCode = (regionCode || "").trim().toUpperCase();
  const parsedCode = rawCode.includes("-") ? rawCode.split("-").pop() || "" : rawCode;

  if (parsedCode) {
    if (/^\d+$/.test(parsedCode)) {
      const normalized = String(Number(parsedCode));
      return PROVINCE_ABBR_BY_NUMERIC_CODE[normalized] || "";
    }

    if (PROVINCE_ABBR_BY_ISO_SUBDIVISION[parsedCode]) {
      return PROVINCE_ABBR_BY_ISO_SUBDIVISION[parsedCode];
    }

    if (/^[A-Z]{2,4}$/.test(parsedCode)) {
      return parsedCode;
    }
  }

  const normalizedName = normalizeProvinceName(regionName);
  if (!normalizedName) return "";

  return PROVINCE_ABBR_BY_NAME[normalizedName] || normalizedName.slice(0, 2).toUpperCase();
}

export function formatCityWithProvinceAbbr(city?: string | null, regionCode?: string | null, regionName?: string | null) {
  const cleanCity = (city || "").trim();
  const province = getProvinceAbbr(regionCode, regionName);

  if (!cleanCity && !province) return "Sin ciudad";
  if (!province) return cleanCity || "Sin ciudad";
  if (!cleanCity) return province;

  return `${cleanCity}, ${province}`;
}
