"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { recordShareAction } from "@/lib/actions/share.actions";

type ShareChannel = "whatsapp" | "copylink" | "webshare";

interface ShareButtonsProps {
    matchId: string;
    message: string;
    shareUrl: string;
    variant?: "default" | "subtle";
}

export function ShareButtons({ matchId, message, shareUrl, variant = "default" }: ShareButtonsProps) {
    const [copied, setCopied] = useState(false);
    const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
    const [loadingWebShare, setLoadingWebShare] = useState(false);
    const { toast } = useToast();

    const canUseWebShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const whatsappUrl = useMemo(() => {
        const encodedMessage = encodeURIComponent(message.trim());
        return `https://wa.me/?text=${encodedMessage}`;
    }, [message]);

    async function record(channel: ShareChannel) {
        await recordShareAction(matchId, channel);
    }

    async function handleWhatsApp() {
        setLoadingWhatsapp(true);
        try {
            await record("whatsapp");
            window.open(whatsappUrl, "_blank");
        } finally {
            setLoadingWhatsapp(false);
        }
    }

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(shareUrl);
            await record("copylink");
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
            toast({
                title: "Link copiado",
                description: "El link del partido fue copiado al portapapeles.",
            });
        } catch {
            toast({
                title: "Error",
                description: "No se pudo copiar el link.",
                variant: "destructive",
            });
        }
    }

    async function handleWebShare() {
        if (!canUseWebShare) return;
        setLoadingWebShare(true);
        try {
            await navigator.share({
                text: message.trim(),
                url: shareUrl,
            });
            await record("webshare");
        } catch {
            // User cancel should not show an error toast.
        } finally {
            setLoadingWebShare(false);
        }
    }

    if (variant === "subtle") {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={handleWhatsApp}
                    disabled={loadingWhatsapp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.97]"
                >
                    <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    WhatsApp
                </button>
                <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 text-xs font-bold rounded-xl transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado" : "Copiar link"}
                </button>
                {canUseWebShare && (
                    <button
                        onClick={handleWebShare}
                        disabled={loadingWebShare}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-60 text-gray-600 text-xs font-bold rounded-xl transition-colors"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        Compartir
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3 w-full">
            <Button
                onClick={handleWhatsApp}
                disabled={loadingWhatsapp}
                className="w-full py-8 rounded-[24px] bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase tracking-widest shadow-xl shadow-green-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
                <MessageCircle className="w-6 h-6 fill-current" />
                {loadingWhatsapp ? "Preparando..." : "Compartir por WhatsApp"}
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    onClick={handleCopyLink}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-700 transition-colors"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado" : "Copiar link"}
                </button>
                {canUseWebShare ? (
                    <button
                        onClick={handleWebShare}
                        disabled={loadingWebShare}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 disabled:opacity-60 text-xs font-bold text-gray-700 transition-colors"
                    >
                        <Share2 className="w-4 h-4" />
                        Compartir
                    </button>
                ) : (
                    <div className="hidden sm:block" />
                )}
            </div>
        </div>
    );
}
