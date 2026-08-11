/**
 * Normalizacion de telefonos.
 *
 * Existe porque el matching de inscripciones publicas se hace por telefono y no
 * por nombre: la base tiene apodos sin apellido ("Dany", "Epi", "Floren") que
 * nunca matchean contra el nombre completo que alguien escribe en un formulario.
 *
 * El problema concreto: `2984315287` y `+54 9 298 431-5287` son la misma persona
 * y dos strings distintos. `players.phone` guarda el texto crudo tal como se
 * tipeo, asi que comparar por igualdad no sirve.
 *
 * Contrato
 * --------
 * - `original` se preserva intacto. Lo que la persona escribio se guarda como lo
 *   escribio; la forma canonica es un derivado para comparar, no un reemplazo.
 * - `canonical` es E.164 y es la clave de comparacion. Dos entradas que refieren
 *   al mismo telefono producen el mismo `canonical`.
 * - Los numeros internacionales se normalizan igual, pero quedan marcados con
 *   `isArgentine: false`. No se rompen ni se descartan.
 *
 * Decision sobre el 9 de celular
 * ------------------------------
 * El `9` que va despues del +54 es un artefacto de discado, no parte del numero.
 * En la base conviven fijos y celulares escritos con y sin el, asi que la forma
 * canonica lo omite: se guarda el numero nacional significativo de 10 digitos.
 * Lo mismo con el `15`, que es el mismo artefacto visto desde el discado local.
 *
 * Este archivo tiene un espejo en SQL — `pasala_phone_key(text)` — que DEBE
 * producir exactamente el mismo resultado. Si cambia uno, cambia el otro.
 * Ver supabase/migrations/20260814_phone_normalization.sql
 */

export type PhoneCountry = "AR" | "INTL" | "UNKNOWN";

export interface NormalizedPhone {
  /** Exactamente lo que escribio la persona, sin tocar. */
  original: string;
  /** Solo digitos, sin prefijo ni separadores. */
  digits: string;
  /** E.164 (`+542984306135`). null si no hay nada normalizable. */
  canonical: string | null;
  /** Numero nacional significativo, 10 digitos. Solo para AR. */
  nationalNumber: string | null;
  country: PhoneCountry;
  isArgentine: boolean;
  /** true solo si la forma canonica tiene largo plausible para su pais. */
  valid: boolean;
  /** Por que no es valido. Ausente si `valid`. */
  reason?: string;
}

/** Largo del numero nacional significativo argentino: area + abonado. */
const AR_NATIONAL_LENGTH = 10;

/** Posiciones donde puede aparecer el `15`, segun el largo del codigo de area (2, 3 o 4). */
const AR_TRUNK_POSITIONS = [2, 3, 4];

const MIN_INTL_DIGITS = 8;
const MAX_INTL_DIGITS = 15;

function invalid(
  original: string,
  digits: string,
  country: PhoneCountry,
  reason: string
): NormalizedPhone {
  return {
    original,
    digits,
    canonical: null,
    nationalNumber: null,
    country,
    isArgentine: country === "AR",
    valid: false,
    reason,
  };
}

/**
 * Saca el `0` de discado nacional, el `9` de celular y el `15` de discado local
 * hasta dejar los 10 digitos del numero nacional.
 *
 * Los largos posibles y de donde salen:
 *   10 → area + abonado, ya limpio
 *   11 → 9 + area + abonado, o 0 + area + abonado
 *   12 → area + 15 + abonado
 *   13 → 0 + area + 15 + abonado, o 9 + area + 15 + abonado
 *
 * El `0` se saca siempre que este, sin mirar el largo: ningun codigo de area
 * argentino empieza con 0, asi que un 0 adelante es siempre prefijo de discado.
 * Sacarlo incondicionalmente ademas hace que un numero corto invalido siga
 * siendo invalido en vez de colarse con el largo justo.
 */
function stripArgentineTrunkPrefixes(input: string): string {
  let national = input;

  if (national.startsWith("0")) {
    national = national.slice(1);
  }

  if (national.length > AR_NATIONAL_LENGTH && national.startsWith("9")) {
    national = national.slice(1);
  }

  if (national.length === AR_NATIONAL_LENGTH + 2) {
    for (const position of AR_TRUNK_POSITIONS) {
      if (national.slice(position, position + 2) === "15") {
        national = national.slice(0, position) + national.slice(position + 2);
        break;
      }
    }
  }

  return national;
}

export function normalizePhone(input: string | null | undefined): NormalizedPhone {
  const original = typeof input === "string" ? input : "";
  const trimmed = original.trim();

  if (trimmed === "") {
    return invalid(original, "", "UNKNOWN", "EMPTY");
  }

  // `00` es el prefijo internacional en discado; equivale a `+`.
  const hasExplicitCountryCode = trimmed.startsWith("+") || /^00\d/.test(trimmed);
  const digits = trimmed.replace(/\D/g, "");
  const withoutIntlPrefix = /^00\d/.test(trimmed) ? digits.replace(/^00/, "") : digits;

  if (withoutIntlPrefix === "") {
    return invalid(original, digits, "UNKNOWN", "NO_DIGITS");
  }

  // Con prefijo internacional explicito el pais no se adivina: se lee.
  if (hasExplicitCountryCode && !withoutIntlPrefix.startsWith("54")) {
    const isPlausible =
      withoutIntlPrefix.length >= MIN_INTL_DIGITS &&
      withoutIntlPrefix.length <= MAX_INTL_DIGITS;
    return {
      original,
      digits: withoutIntlPrefix,
      canonical: isPlausible ? `+${withoutIntlPrefix}` : null,
      nationalNumber: null,
      country: "INTL",
      isArgentine: false,
      valid: isPlausible,
      ...(isPlausible ? {} : { reason: "INTL_LENGTH_OUT_OF_RANGE" }),
    };
  }

  // Sin prefijo explicito se asume Argentina, que es de donde viene el 99% de
  // las inscripciones. Un `54` al frente solo se trata como codigo de pais si
  // sobran digitos: `5411...` con 10 digitos es un numero local valido.
  const startsWithCountryCode =
    withoutIntlPrefix.startsWith("54") &&
    (hasExplicitCountryCode || withoutIntlPrefix.length > AR_NATIONAL_LENGTH);

  const rawNational = startsWithCountryCode
    ? withoutIntlPrefix.slice(2)
    : withoutIntlPrefix;

  const nationalNumber = stripArgentineTrunkPrefixes(rawNational);

  if (nationalNumber.length !== AR_NATIONAL_LENGTH) {
    return invalid(
      original,
      withoutIntlPrefix,
      "AR",
      nationalNumber.length < AR_NATIONAL_LENGTH ? "AR_TOO_SHORT" : "AR_TOO_LONG"
    );
  }

  return {
    original,
    digits: withoutIntlPrefix,
    canonical: `+54${nationalNumber}`,
    nationalNumber,
    country: "AR",
    isArgentine: true,
    valid: true,
  };
}

/**
 * Clave de comparacion. `null` cuando el input no da un telefono usable — y
 * `null` NUNCA matchea contra `null`: dos telefonos ilegibles no son la misma
 * persona. Quien compare tiene que descartar los null antes.
 */
export function phoneKey(input: string | null | undefined): string | null {
  return normalizePhone(input).canonical;
}

/** true si ambos refieren al mismo telefono. Dos invalidos nunca son iguales. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const keyA = phoneKey(a);
  const keyB = phoneKey(b);
  return keyA !== null && keyA === keyB;
}

/** Formato de lectura: `298 430-6135`. Cae al original si no se puede normalizar. */
export function formatPhoneForDisplay(input: string | null | undefined): string {
  const parsed = normalizePhone(input);
  if (!parsed.valid || !parsed.nationalNumber) return (input ?? "").trim();

  const national = parsed.nationalNumber;
  if (!parsed.isArgentine) return parsed.canonical ?? national;

  // El area es 11 en AMBA y 3 digitos en el resto de los casos frecuentes.
  const areaLength = national.startsWith("11") ? 2 : 3;
  const area = national.slice(0, areaLength);
  const subscriber = national.slice(areaLength);
  const half = subscriber.length - 4;
  return `${area} ${subscriber.slice(0, half)}-${subscriber.slice(half)}`;
}
