"use client";

import { useState, useTransition } from "react";
import {
  requestPublicRegistrationAction,
  type PublicRegistrationActionResult,
  type PublicRegistrationSide,
} from "@/lib/actions/public-registration.actions";
import type {
  PhoneCandidate,
  PublicRegistrationResult,
} from "@/services/registrations.service";

/**
 * Formulario de inscripcion publica. Seis campos y nada mas: nombre, apellido y
 * telefono de los dos jugadores.
 *
 * Cada campo extra baja la conversion, y nivel y posicion se pueden pedir
 * despues, ya dentro de la app. La persona no necesita cuenta.
 *
 * El caso ambiguo — dos jugadores con el mismo telefono — no se trata como
 * error: la accion devuelve los candidatos y aca se muestran para elegir. Es
 * un paso mas del formulario, no un rechazo.
 */

interface Props {
  kind: "tournament" | "league";
  eventId: string;
  eventName: string;
}

type FormState = {
  a_first_name: string;
  a_last_name: string;
  a_phone: string;
  b_first_name: string;
  b_last_name: string;
  b_phone: string;
};

const EMPTY: FormState = {
  a_first_name: "",
  a_last_name: "",
  a_phone: "",
  b_first_name: "",
  b_last_name: "",
  b_phone: "",
};

export function PublicRegistrationForm({ kind, eventId, eventName }: Props) {
  const [values, setValues] = useState<FormState>(EMPTY);
  const [chosen, setChosen] = useState<Partial<Record<PublicRegistrationSide, string>>>({});
  const [ambiguity, setAmbiguity] = useState<{
    side: PublicRegistrationSide;
    candidates: PhoneCandidate[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PublicRegistrationResult | null>(null);
  const [pending, startTransition] = useTransition();

  function set(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Cambiar un telefono invalida la eleccion que se hizo para ese jugador.
    if (field === "a_phone") setChosen((prev) => ({ ...prev, a: undefined }));
    if (field === "b_phone") setChosen((prev) => ({ ...prev, b: undefined }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("event_id", eventId);
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    if (chosen.a) formData.set("a_player_id", chosen.a);
    if (chosen.b) formData.set("b_player_id", chosen.b);

    startTransition(async () => {
      const result: PublicRegistrationActionResult =
        await requestPublicRegistrationAction(formData);

      if (result.ok) {
        setSuccess(result.result);
        setAmbiguity(null);
        return;
      }

      if ("candidates" in result) {
        setAmbiguity({ side: result.side, candidates: result.candidates });
        setError(result.error);
        return;
      }

      setAmbiguity(null);
      setError(result.error);
    });
  }

  if (success) {
    return <RegistrationDone result={success} eventName={eventName} />;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <PersonFields
        legend="Vos"
        prefix="a"
        values={values}
        onChange={set}
        disabled={pending}
      />

      <PersonFields
        legend="Tu compañero"
        prefix="b"
        values={values}
        onChange={set}
        disabled={pending}
      />

      {ambiguity ? (
        <CandidatePicker
          side={ambiguity.side}
          candidates={ambiguity.candidates}
          selected={chosen[ambiguity.side]}
          onSelect={(playerId) =>
            setChosen((prev) => ({ ...prev, [ambiguity.side]: playerId }))
          }
        />
      ) : null}

      {error ? (
        <p className="rounded-xl border border-[var(--pill-red-bg)] bg-[var(--pill-red-bg)] px-4 py-3 text-sm font-semibold text-[var(--pill-red-text)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || (ambiguity !== null && !chosen[ambiguity.side])}
        className="inline-flex w-full items-center justify-center rounded-xl bg-brand-rojo px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-brand-rojo-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Inscribir la pareja"}
      </button>

      <p className="text-center text-xs text-[var(--text-faint)]">
        La inscripción queda pendiente hasta que el club la confirme. No hace falta tener
        cuenta.
      </p>
    </form>
  );
}

function PersonFields({
  legend,
  prefix,
  values,
  onChange,
  disabled,
}: {
  legend: string;
  prefix: PublicRegistrationSide;
  values: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  disabled: boolean;
}) {
  const inputClass =
    "w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-brand-azul";

  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="mb-1 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
        {legend}
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Nombre"
          autoComplete={prefix === "a" ? "given-name" : "off"}
          value={values[`${prefix}_first_name`]}
          onChange={(e) => onChange(`${prefix}_first_name`, e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="Apellido"
          autoComplete={prefix === "a" ? "family-name" : "off"}
          value={values[`${prefix}_last_name`]}
          onChange={(e) => onChange(`${prefix}_last_name`, e.target.value)}
          required
        />
      </div>

      <input
        className={inputClass}
        placeholder="Celular"
        type="tel"
        inputMode="tel"
        autoComplete={prefix === "a" ? "tel" : "off"}
        value={values[`${prefix}_phone`]}
        onChange={(e) => onChange(`${prefix}_phone`, e.target.value)}
        required
      />
    </fieldset>
  );
}

function CandidatePicker({
  side,
  candidates,
  selected,
  onSelect,
}: {
  side: PublicRegistrationSide;
  candidates: PhoneCandidate[];
  selected?: string;
  onSelect: (playerId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-bold text-[var(--text-primary)]">
        {side === "a" ? "¿Cuál de estos sos vos?" : "¿Cuál de estos es tu compañero?"}
      </p>

      <div className="space-y-2">
        {candidates.map((candidate) => (
          <label
            key={candidate.player_id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
              selected === candidate.player_id
                ? "border-brand-azul bg-[var(--pill-blue-bg)]"
                : "border-[var(--border-soft)] bg-[var(--bg-card)]"
            }`}
          >
            <input
              type="radio"
              name={`candidate_${side}`}
              className="accent-brand-azul"
              checked={selected === candidate.player_id}
              onChange={() => onSelect(candidate.player_id)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                {candidate.display_name}
              </span>
              <span className="block text-xs text-[var(--text-muted)]">
                {candidate.played > 0
                  ? `${candidate.played} partido${candidate.played === 1 ? "" : "s"} cargados`
                  : "Sin partidos cargados"}
                {candidate.has_account ? " · Tiene cuenta" : ""}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RegistrationDone({
  result,
  eventName,
}: {
  result: PublicRegistrationResult;
  eventName: string;
}) {
  // Si el perfil ya existia, se lo dice — sin ofrecer reclamarlo. El reclamo
  // valida por apellido del JWT y co-participacion en partidos, asi que alguien
  // que llega por telefono no calificaria y el ofrecimiento seria una promesa
  // que el sistema no puede cumplir.
  const recognised = [result.player_a, result.player_b].filter(
    (p) => p.outcome === "matched"
  ).length;

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--pill-green-bg)]">
        <span className="text-2xl text-[var(--pill-green-text)]">✓</span>
      </div>

      <div>
        <h3 className="font-display text-2xl font-black uppercase tracking-tight text-[var(--text-primary)]">
          Inscripción enviada
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Quedaron anotados en {eventName}. El club tiene que confirmarla.
        </p>
      </div>

      {recognised > 0 ? (
        <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {recognised === 2
            ? "A los dos ya los teníamos registrados en PASALA."
            : "A uno de los dos ya lo teníamos registrado en PASALA."}
        </p>
      ) : null}
    </div>
  );
}
