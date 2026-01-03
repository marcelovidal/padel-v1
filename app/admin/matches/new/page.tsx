"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMatchAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando..." : "Crear Partido"}
    </Button>
  );
}

export default function NewMatchPage() {
  const [state, formAction] = useFormState(createMatchAction, { error: undefined });

  // Obtener fecha/hora actual en formato datetime-local
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const defaultValue = `${year}-${month}-${day}T${hours}:${minutes}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nuevo Partido</h1>
        <Link href="/admin/matches">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Partido</CardTitle>
          <CardDescription>
            Completa los datos del nuevo partido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state && state.error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                {state.error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="match_at">
                  Fecha y Hora <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="match_at"
                  name="match_at"
                  type="datetime-local"
                  defaultValue={defaultValue}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_name">
                  Club <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="club_name"
                  name="club_name"
                  placeholder="Nombre del club"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_players">
                  Máximo de Jugadores <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="max_players"
                  name="max_players"
                  type="number"
                  min="2"
                  max="4"
                  defaultValue="4"
                  required
                />
                <p className="text-sm text-gray-500">
                  Entre 2 y 4 jugadores
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Notas adicionales sobre el partido..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Link href="/admin/matches">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

