"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, MessageCircle, Copy, Check } from "lucide-react";
import { recordShareAction } from "@/lib/actions/share.actions";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppShareButtonProps {
    matchId: string;
    message: string;
    variant?: "default" | "subtle";
}

export function WhatsAppShareButton({ matchId, message, variant = "default" }: WhatsAppShareButtonProps) {
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);

    const { toast } = useToast();

    // The message already contains the public URL from the server side
    const encodedMessage = encodeURIComponent(message.trim());
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    async function handleShare() {
        setLoading(true);
        try {
            await recordShareAction(matchId);
            window.open(whatsappUrl, "_blank");
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(message.trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            await recordShareAction(matchId);
            toast({
                title: "Link copiado",
                description: "El link del partido ha sido copiado al portapapeles",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo copiar el link",
                variant: "destructive",
            });
        }
    }

    if (variant === "subtle") {
        return (
            <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded-xl transition-all active:scale-[0.97] shadow-sm shadow-green-200"
            >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                Compartir por WhatsApp
            </button>
        );
    }

    return (
        <div className="space-y-4 w-full">
            <Button
                onClick={handleShare}
                disabled={loading}
                className="w-full py-8 rounded-[24px] bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase tracking-widest shadow-xl shadow-green-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
                <MessageCircle className="w-6 h-6 fill-current" />
                {loading ? "Preparando..." : "Compartir por WhatsApp"}
            </Button>

            <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
            >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado" : "O copiar link para pegar"}
            </button>
        </div>
    );
}
