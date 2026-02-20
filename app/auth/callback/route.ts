import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type PendingClubOnboarding = {
  name: string;
  country_code?: string | null;
  region_code?: string | null;
  region_name?: string | null;
  city?: string | null;
  city_id?: string | null;
  address?: string | null;
  description?: string | null;
  access_type?: "abierta" | "cerrada" | null;
  courts_count?: number | null;
  has_glass?: boolean;
  has_synthetic_grass?: boolean;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_phone?: string | null;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value) || value < 0) return null;
  return value;
}

function parsePendingClubOnboarding(value: unknown): PendingClubOnboarding | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;

  const name = asTrimmedString(payload.name);
  if (!name) return null;

  const access = asTrimmedString(payload.access_type);
  const access_type = access === "abierta" || access === "cerrada" ? access : null;

  return {
    name,
    country_code: asTrimmedString(payload.country_code) || "AR",
    region_code: asTrimmedString(payload.region_code),
    region_name: asTrimmedString(payload.region_name),
    city: asTrimmedString(payload.city),
    city_id: asTrimmedString(payload.city_id),
    address: asTrimmedString(payload.address),
    description: asTrimmedString(payload.description),
    access_type,
    courts_count: asNonNegativeInt(payload.courts_count),
    has_glass: asBoolean(payload.has_glass, false),
    has_synthetic_grass: asBoolean(payload.has_synthetic_grass, false),
    contact_first_name: asTrimmedString(payload.contact_first_name),
    contact_last_name: asTrimmedString(payload.contact_last_name),
    contact_phone: asTrimmedString(payload.contact_phone),
  };
}

async function resumePendingClubOnboarding(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const pending = parsePendingClubOnboarding((user.user_metadata as any)?.pending_club_onboarding);
  if (!pending) return;

  const { data: clubId, error: onboardingError } = await supabase.rpc("club_complete_onboarding", {
    p_name: pending.name,
    p_country_code: pending.country_code || "AR",
    p_region_code: pending.region_code || null,
    p_region_name: pending.region_name || null,
    p_city: pending.city || null,
    p_city_id: pending.city_id || null,
    p_address: pending.address || null,
    p_description: pending.description || null,
    p_access_type: pending.access_type || null,
    p_courts_count: typeof pending.courts_count === "number" ? pending.courts_count : null,
    p_has_glass: pending.has_glass ?? false,
    p_has_synthetic_grass: pending.has_synthetic_grass ?? false,
    p_contact_first_name: pending.contact_first_name || null,
    p_contact_last_name: pending.contact_last_name || null,
    p_contact_phone: pending.contact_phone || null,
  });

  if (onboardingError || !clubId) {
    console.error("club onboarding resume failed", onboardingError?.message || "unknown");
    return;
  }

  const { error: claimError } = await supabase.rpc("club_request_claim", {
    p_club_id: clubId,
    p_requester_first_name: pending.contact_first_name || "N/D",
    p_requester_last_name: pending.contact_last_name || "N/D",
    p_requester_phone: pending.contact_phone || "N/D",
    p_requester_email: user.email || "unknown@pasala.local",
    p_message: "Alta de club reanudada tras confirmacion de email.",
  });

  if (claimError) {
    const raw = String(claimError.message || "");
    const expected =
      raw.includes("CLUB_CLAIM_IN_REVIEW") ||
      raw.includes("CLUB_ALREADY_CLAIMED");
    if (!expected) {
      console.error("club claim resume failed", raw);
      return;
    }
  }

  const metadata = { ...(user.user_metadata || {}) } as Record<string, unknown>;
  delete metadata.pending_club_onboarding;
  metadata.club_onboarding_resumed_at = new Date().toISOString();
  metadata.club_onboarding_resumed_club_id = String(clubId);

  await supabase.auth.updateUser({ data: metadata });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/welcome";

  let response = NextResponse.redirect(new URL(nextPath, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await resumePendingClubOnboarding(supabase);
      return response;
    }
  }

  return NextResponse.redirect(new URL("/player/login?error=auth_callback_failed", origin));
}
