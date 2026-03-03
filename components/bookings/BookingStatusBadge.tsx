import { Badge } from "@/components/ui/Badge";

export function BookingStatusBadge({ status }: { status: "requested" | "confirmed" | "rejected" | "cancelled" }) {
  if (status === "confirmed") return <Badge className="bg-green-100 text-green-800">Confirmada</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700">Rechazada</Badge>;
  if (status === "cancelled") return <Badge className="bg-gray-100 text-gray-700">Cancelada</Badge>;
  return <Badge className="bg-amber-100 text-amber-800">Solicitada</Badge>;
}
