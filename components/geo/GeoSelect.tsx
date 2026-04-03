"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GeoOption {
    id: string;
    nombre: string;
}

interface GeoSelectProps {
    label: string;
    placeholder: string;
    options: GeoOption[];
    value?: string;
    onChange: (option: GeoOption | null) => void;
    isLoading?: boolean;
    disabled?: boolean;
    loadError?: boolean;
    onRetry?: () => void;
}

function normalizeText(value: string) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export function GeoSelect({
    label,
    placeholder,
    options,
    value,
    onChange,
    isLoading,
    disabled,
    loadError,
    onRetry,
}: GeoSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Compare as strings to handle number/string ID mismatches from external API
    const selectedOption = useMemo(() =>
        options.find(o => String(o.id) === String(value ?? "")) || null,
        [options, value]);

    const filteredOptions = useMemo(() => {
        const q = normalizeText(searchTerm);
        if (!q) return options.slice(0, 50);

        const tokens = q.split(/\s+/).filter(Boolean);
        return options
            .filter((o) => {
                const name = normalizeText(o.nombre);
                return tokens.every((token) => name.includes(token));
            })
            .slice(0, 50);
    }, [options, searchTerm]);

    // Sync search term with selected option when not open
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm(selectedOption?.nombre || "");
        }
    }, [selectedOption, isOpen]);

    if (loadError) {
        return (
            <div className="space-y-2">
                <Label>{label}</Label>
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <span className="flex-1 text-sm text-red-600">Error al cargar</span>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="text-xs font-semibold text-red-700 underline hover:no-underline"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2 relative">
            <Label>{label}</Label>
            <Input
                placeholder={isLoading ? "Cargando..." : placeholder}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                disabled={disabled || isLoading}
                className="w-full"
                autoComplete="off"
            />

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoading ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Cargando...</div>
                    ) : filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-sm"
                                onClick={() => {
                                    onChange(option);
                                    setSearchTerm(option.nombre);
                                    setIsOpen(false);
                                }}
                            >
                                {option.nombre}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-slate-500">
                            {searchTerm ? "No se encontraron resultados" : "Empieza a escribir..."}
                        </div>
                    )}
                </div>
            )}

            {/* Overlay to close when clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
