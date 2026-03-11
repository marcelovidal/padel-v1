"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { recordShareEventAction } from "@/lib/actions/share.actions";
import { useToast } from "@/hooks/use-toast";

interface InviteWhatsAppButtonProps {
    message: string;
    context: "directory" | "profile";
    className?: string;
    iconOnly?: boolean;
}

export function InviteWhatsAppButton({
    message,
    context,
    className,
    iconOnly = false,
}: InviteWhatsAppButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const whatsappUrl = useMemo(() => {
        return `https://wa.me/?text=${encodeURIComponent(message.trim())}`;
    }, [message]);

    async function handleClick() {
        setLoading(true);
        try {
            await recordShareEventAction({
                channel: "whatsapp",
                context,
                matchId: null,
            });
            window.open(whatsappUrl, "_blank");
        } catch {
            toast({
                title: "No se pudo abrir WhatsApp",
                description: "Intentá nuevamente en unos segundos.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className={className || "inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white text-xs font-bold"}
            aria-label="Invitar por WhatsApp"
            title="Invitar por WhatsApp"
        >
            <MessageCircle className="w-4 h-4 fill-current" />
            {!iconOnly && (loading ? "Abriendo..." : "Invitar por WhatsApp")}
        </button>
    );
}
