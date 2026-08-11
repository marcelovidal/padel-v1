/**
 * Casos de prueba de la normalizacion de telefonos.
 *
 *   node scripts/phone-normalize.test.mjs
 *
 * Node 24 stripea los tipos de TypeScript de forma nativa, asi que este archivo
 * importa lib/utils/phone.ts directamente. No hace falta build ni test runner.
 *
 * Los formatos de entrada salen de las inscripciones reales del Google Form de
 * Nuevo Palau. Si aparece uno nuevo que rompe, se agrega aca antes de arreglar
 * la funcion.
 *
 * OJO: supabase/migrations/20260814_phone_normalization.sql tiene que producir
 * exactamente estas mismas claves. La seccion de verificacion de esa migracion
 * repite los casos principales en SQL.
 */

import { normalizePhone, phoneKey, samePhone, formatPhoneForDisplay } from "../lib/utils/phone.ts";

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    passed++;
  } else {
    failures.push(`${label}\n    esperado: ${JSON.stringify(expected)}\n    obtenido: ${JSON.stringify(actual)}`);
  }
}

// ─── Formatos reales que aparecen en las inscripciones ───────────────────────
// Todos estos son el MISMO telefono escrito de siete maneras distintas. Es el
// caso que justifica que exista este archivo.

const mismoNumero = [
  "2984306135",             // como lo tipea la mayoria
  "+54 9 298 430-6135",     // como lo exporta WhatsApp
  "+542984306135",          // E.164 pelado
  "54 9 2984306135",
  "0298 15 430-6135",       // discado nacional viejo: 0 + area + 15
  "298 15 4306135",         // idem sin el 0
  "02984306135",            // 0 + area + abonado, sin 15
  "  2984306135  ",         // con espacios de un copy/paste
];

for (const entrada of mismoNumero) {
  check(`canonica de "${entrada}"`, phoneKey(entrada), "+542984306135");
}

// Y todos matchean entre si, que es lo que de verdad importa.
for (const entrada of mismoNumero) {
  check(`"${entrada}" matchea con la forma base`, samePhone(entrada, "2984306135"), true);
}

// ─── Los formatos concretos del pedido ───────────────────────────────────────

check('"2984306135"', phoneKey("2984306135"), "+542984306135");
check('"+54 9 298 477-1538"', phoneKey("+54 9 298 477-1538"), "+542984771538");
check('"2984 33-4344"', phoneKey("2984 33-4344"), "+542984334344");
check('"1168320670" (AMBA)', phoneKey("1168320670"), "+541168320670");

// ─── Internacionales: se normalizan, pero quedan marcados ────────────────────

const italiano = normalizePhone("+39 02 1234 5678");
check("italiano: canonica", italiano.canonical, "+390212345678");
check("italiano: no es argentino", italiano.isArgentine, false);
check("italiano: pais", italiano.country, "INTL");
check("italiano: valido", italiano.valid, true);

const espanol = normalizePhone("0034 600 123 456");
check("espanol con 00: canonica", espanol.canonical, "+34600123456");
check("espanol con 00: no es argentino", espanol.isArgentine, false);

// Un internacional no matchea con un argentino aunque compartan digitos.
check("italiano vs argentino", samePhone("+39 02 1234 5678", "0212345678"), false);

// ─── El original SIEMPRE se preserva ─────────────────────────────────────────

const conFormato = normalizePhone("  +54 9 298 430-6135  ");
check("original intacto", conFormato.original, "  +54 9 298 430-6135  ");
check("original + canonica conviven", conFormato.canonical, "+542984306135");

// ─── Entradas que no dan un telefono usable ──────────────────────────────────

const invalidos = [
  ["null", null],
  ["undefined", undefined],
  ["vacio", ""],
  ["solo espacios", "   "],
  ["sin digitos", "no tengo"],
  ["muy corto", "12345"],
  ["muy largo", "12345678901234567890"],
  ["9 digitos", "298430613"],
];

for (const [label, entrada] of invalidos) {
  check(`invalido: ${label}`, phoneKey(entrada), null);
}

// NULL no matchea con NULL: dos telefonos ilegibles no son la misma persona.
// Es la regla que evita que el formulario publico fusione desconocidos.
check("dos invalidos NO matchean", samePhone("", ""), false);
check("dos basuras distintas NO matchean", samePhone("abc", "xyz"), false);
check("invalido vs valido", samePhone("", "2984306135"), false);

// ─── Casos borde del codigo de pais ──────────────────────────────────────────

// `5411...` con 10 digitos es un numero local del area 54, no un +54 con 8.
check("54 al frente con largo local", phoneKey("5411223344"), "+545411223344");
check("54 al frente, explicito, es codigo de pais", phoneKey("+54 11 2233-4455"), "+541122334455");

// Un 0 adelante no salva a un numero corto: sigue siendo invalido.
check("0 + 9 digitos sigue invalido", phoneKey("0298430613"), null);

// ─── Formato de lectura ──────────────────────────────────────────────────────

check("display AMBA", formatPhoneForDisplay("1168320670"), "11 6832-0670");
check("display interior", formatPhoneForDisplay("+54 9 298 430-6135"), "298 430-6135");
check("display cae al original si no normaliza", formatPhoneForDisplay("no tengo"), "no tengo");

// ─── Reporte ─────────────────────────────────────────────────────────────────

const total = passed + failures.length;

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} de ${total} casos fallaron:\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  // exitCode en vez de process.exit(): deja que stderr termine de vaciarse.
  process.exitCode = 1;
} else {
  console.log(`✓ ${passed}/${total} casos de normalizacion de telefonos OK`);
}
