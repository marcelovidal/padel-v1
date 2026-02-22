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
    disabled
}: GeoSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const selectedOption = useMemo(() =>
        options.find(o => o.id === value) || null,
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
                disabled={disabled}
                className="w-full"
                autoComplete="off"
            />

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredOptions.length > 0 ? (
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
