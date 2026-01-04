"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePlayerAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type Props = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: "drive" | "reves" | "cualquiera";
  status?: "active" | "inactive";
  category?: "1" | "2" | "3" | "4" | "5" | "6" | "7";
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar"}
    </Button>
  );
}

export default function EditPlayerForm(props: Props) {
  // TODO: tighten action typing to avoid `as any` when possible
  const [state, formAction] = useFormState(updatePlayerAction as any, { ok: false, error: undefined });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Jugador</CardTitle>
        <CardDescription>Actualiza los datos del jugador</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state && (state as any).error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
              {(state as any).error}
            </div>
          )}

          <input type="hidden" name="id" value={props.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre <span className="text-red-500">*</span></Label>
              <Input id="first_name" name="first_name" defaultValue={props.first_name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido <span className="text-red-500">*</span></Label>
              <Input id="last_name" name="last_name" defaultValue={props.last_name} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={props.email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={props.phone} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Posición</Label>
              <select id="position" name="position" defaultValue={props.position} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="drive">Drive</option>
                <option value="reves">Revés</option>
                <option value="cualquiera">Cualquiera</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select id="status" name="status" defaultValue={props.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <select id="category" name="category" defaultValue={props.category ?? "5"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Link href="/admin/users">
              <Button type="button" variant="outline">Volver</Button>
            </Link>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
