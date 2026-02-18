"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GeoSelect } from "@/components/geo/GeoSelect";
import AvatarUploader from "@/components/player/AvatarUploader";
import { completeOnboardingAction } from "@/app/actions/onboarding.actions";
import { Loader2, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const onboardingSchema = z.object({
    first_name: z.string().min(2, "Mínimo 2 letras"),
    last_name: z.string().min(2, "Mínimo 2 letras"),
    display_name: z.string().min(2, "Nombre de usuario requerido"),
    phone: z.string().min(8, "Celular obligatorio"),
    position: z.enum(["drive", "reves", "cualquiera"], {
        required_error: "Elegí una posición"
    }),
    category: z.number().min(1).max(7, "Elegí una categoría"),
    country_code: z.string().default("AR"),
    region_code: z.string().optional(),
    region_name: z.string().optional(),
    city: z.string().optional(),
    city_id: z.string().optional(),
    birth_year: z.number().optional().nullable(),
    avatar_url: z.string().optional().nullable(),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
    initialData: {
        email?: string;
        first_name?: string;
        last_name?: string;
        display_name?: string;
    };
}

export default function OnboardingForm({ initialData }: OnboardingFormProps) {
    const [step, setStep] = useState(1);
    const [provincias, setProvincias] = useState<any[]>([]);
    const [localidades, setLocalidades] = useState<any[]>([]);
    const [loadingGeo, setLoadingGeo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isValid }
    } = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            first_name: initialData.first_name || "",
            last_name: initialData.last_name || "",
            display_name: initialData.display_name || "",
            country_code: "AR",
            position: "cualquiera",
            category: 7,
        }
    });

    const formData = watch();

    // Fetch provincias on mount
    useEffect(() => {
        fetch("/api/geo/provincias")
            .then(res => res.json())
            .then(data => setProvincias(data))
            .catch(err => console.error("Error provincias:", err));
    }, []);

    // Fetch localidades when region_code changes
    useEffect(() => {
        if (formData.region_code) {
            setLoadingGeo(true);
            fetch(`/api/geo/localidades?provincia=${formData.region_code}`)
                .then(res => res.json())
                .then(data => {
                    setLocalidades(data);
                    setLoadingGeo(false);
                })
                .catch(err => {
                    console.error("Error localidades:", err);
                    setLoadingGeo(false);
                });
        }
    }, [formData.region_code]);

    async function onSubmit(data: OnboardingValues) {
        setSubmitting(true);
        setError(null);

        const searchParams = new URLSearchParams(window.location.search);
        const nextPath = searchParams.get("next") || "/player";

        const fData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                fData.append(key, value.toString());
            }
        });

        const result = await completeOnboardingAction(null, fData);
        if (result?.success === false) {
            if (result.code === "ONBOARDING_ALREADY_COMPLETED") {
                setError("Tu perfil ya se encuentra completo. Redirigiendo...");
                setTimeout(() => {
                    window.location.href = nextPath;
                }, 2000);
            } else {
                setError(result.error);
                setSubmitting(false);
            }
        } else if (result?.success && result.redirect) {
            // Success! Redirect to the target path or default
            window.location.href = nextPath;
        }
    }

    const nextStep = () => {
        if (step < 3) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const categories = [
        { val: 7, label: "7ma - Inicial" },
        { val: 6, label: "6ta" },
        { val: 5, label: "5ta" },
        { val: 4, label: "4ta" },
        { val: 3, label: "3ra" },
        { val: 2, label: "2da" },
        { val: 1, label: "1ra - Profesional" },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 80 }, (_, i) => currentYear - i - 10);

    return (
        <div className="max-w-xl mx-auto">
            {/* Progress indicator */}
            <div className="flex justify-between mb-8 px-2">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                            step === s ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                                step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                        )}>
                            {step > s ? <Check className="w-6 h-6" /> : s}
                        </div>
                        <span className={cn("text-xs font-semibold", step === s ? "text-blue-600" : "text-gray-400")}>
                            {s === 1 ? "Identidad" : s === 2 ? "Perfil" : "Foto"}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="p-8 shadow-2xl border-none rounded-3xl bg-white/80 backdrop-blur-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                    {/* STEP 1: Identidad */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Hola! Vamos a empezar.</h2>
                                <p className="text-gray-500">Contanos un poco sobre vos.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre*</Label>
                                    <Input {...register("first_name")} placeholder="Ej: Marcelo" className="rounded-xl py-6" />
                                    {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Apellido*</Label>
                                    <Input {...register("last_name")} placeholder="Ej: Vidal" className="rounded-xl py-6" />
                                    {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Nombre de usuario / Nick*</Label>
                                <Input {...register("display_name")} placeholder="Como querés que te vean en la app" className="rounded-xl py-6" />
                                {errors.display_name && <p className="text-xs text-red-500">{errors.display_name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Celular*</Label>
                                <Input {...register("phone")} placeholder="Ej: +54 9 11 ..." className="rounded-xl py-6" />
                                <p className="text-[10px] text-blue-500 font-medium">Lo usamos para invitarte a partidos por WhatsApp</p>
                                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!formData.first_name || !formData.last_name || !formData.phone || !formData.display_name}
                                    className="w-full py-7 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                                >
                                    ¡Listo! Sigamos <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Perfil de Juego */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tu perfil de juego.</h2>
                                <p className="text-gray-500">{formData.first_name}, necesitamos saber cómo jugás.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <GeoSelect
                                    label="Provincia*"
                                    placeholder="Elegí tu provincia"
                                    options={provincias}
                                    value={formData.region_code}
                                    onChange={(opt) => {
                                        setValue("region_code", opt?.id || "");
                                        setValue("region_name", opt?.nombre || "");
                                        setValue("city_id", "");
                                        setValue("city", "");
                                    }}
                                />
                                <GeoSelect
                                    label="Ciudad*"
                                    placeholder="Buscá tu ciudad"
                                    options={localidades}
                                    value={formData.city_id}
                                    isLoading={loadingGeo}
                                    disabled={!formData.region_code}
                                    onChange={(opt) => {
                                        setValue("city_id", opt?.id || "");
                                        setValue("city", opt?.nombre || "");
                                    }}
                                />
                            </div>

                            <div className="space-y-4">
                                <Label className="text-base font-bold">Posición en la cancha*</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["drive", "reves", "cualquiera"].map((pos) => (
                                        <button
                                            key={pos}
                                            type="button"
                                            onClick={() => setValue("position", pos as any)}
                                            className={cn(
                                                "py-3 rounded-xl border-2 font-semibold capitalize transition-all",
                                                formData.position === pos
                                                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                                                    : "border-gray-100 text-gray-500 hover:border-gray-300"
                                            )}
                                        >
                                            {pos === "cualquiera" ? "Ambas" : pos}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-base font-bold">Nivel / Categoría*</Label>
                                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                    {[7, 6, 5, 4, 3, 2, 1].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setValue("category", cat)}
                                            className={cn(
                                                "py-3 rounded-xl border-2 font-bold transition-all relative",
                                                formData.category === cat
                                                    ? "bg-blue-600 border-blue-600 text-white shadow-md scale-110 z-10"
                                                    : "border-gray-100 text-gray-500 hover:border-gray-300"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-center text-gray-500 font-medium">
                                    Elegiste: <span className="text-blue-600 font-bold">{categories.find(c => c.val === formData.category)?.label}</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Año de nacimiento</Label>
                                <select
                                    {...register("birth_year", { valueAsNumber: true })}
                                    className="w-full rounded-xl py-3 px-4 border border-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={prevStep} className="py-7 px-8 text-gray-400">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <Button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!formData.region_code || !formData.city_id || !formData.position || !formData.category}
                                    className="flex-1 py-7 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                                >
                                    Último paso <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Foto */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Casi terminamos!</h2>
                                <p className="text-gray-500">Ponéle cara a tu perfil de jugador.</p>
                            </div>

                            <div className="py-4">
                                <AvatarUploader
                                    onUploadComplete={(path) => {
                                        setValue("avatar_url", path);
                                    }}
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 text-left">
                                <Sparkles className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                    Al completar tu perfil podrás anotarte en partidos, ver tus estadísticas y subir de categoría.
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="ghost" onClick={prevStep} className="py-7 px-8 text-gray-400" disabled={submitting}>
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-7 text-xl font-black rounded-2xl bg-green-500 hover:bg-green-600 shadow-lg shadow-green-100 text-white"
                                >
                                    {submitting ? (
                                        <>Guardando... <Loader2 className="ml-2 w-6 h-6 animate-spin" /></>
                                    ) : (
                                        <>Finalizar Onboarding <Check className="ml-2 w-6 h-6" /></>
                                    )}
                                </Button>

                            </div>
                        </div>
                    )}

                </form>
            </Card>
        </div>
    );
}
