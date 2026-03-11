"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { ShareModal } from "./ShareModal";
import type { ShareCardType } from "./ShareModal";

interface ShareCardButtonProps {
  /** Type used for the download filename */
  type: ShareCardType;
  /** Public page URL to copy/share as link */
  shareUrl: string;
  /** Pre-composed WhatsApp / share text (already includes shareUrl) */
  whatsappText: string;
  /** URL of the OG image: /api/og/{type}?... */
  ogImageUrl: string;
  /** Button label */
  label?: string;
  /** Tailwind className override for the button */
  className?: string;
  /** Download file name (without .png) */
  downloadName?: string;
  /** Render as icon-only button (no text) */
  iconOnly?: boolean;
}

export function ShareCardButton({
  type,
  shareUrl,
  whatsappText,
  ogImageUrl,
  label = "Compartir card",
  className,
  downloadName,
  iconOnly = false,
}: ShareCardButtonProps) {
  const [open, setOpen] = useState(false);

  const defaultClass =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 transition-colors active:scale-[0.97]";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? defaultClass}
        title={label}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        {!iconOnly && label}
      </button>

      <ShareModal
        open={open}
        onClose={() => setOpen(false)}
        shareUrl={shareUrl}
        whatsappText={whatsappText}
        ogImageUrl={ogImageUrl}
        downloadName={downloadName ?? `pasala-${type}-${Date.now()}`}
      />
    </>
  );
}
