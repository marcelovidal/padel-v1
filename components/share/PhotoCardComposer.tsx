"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Camera, ImageIcon, Share2 } from "lucide-react";

export interface PhotoCardData {
  type: "player" | "match";
  playerName?: string;
  pasalaIndex?: number | null;
  teamA?: string;
  teamB?: string;
  sets?: Array<{ a: number; b: number }>;
}

interface Props {
  cardData: PhotoCardData;
  onClose: () => void;
}

export function PhotoCardComposer({ cardData, onClose }: Props) {
  const [step, setStep] = useState<"select" | "preview">("select");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [composedBlob, setComposedBlob] = useState<Blob | null>(null);
  const [sharing, setSharing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function composeCanvas(file: File) {
    await document.fonts.load("bold 48px Inter");

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw user photo as background — object-fit: cover equivalent
    // Scale to fill the canvas keeping aspect ratio, center and crop edges
    const img = await loadImage(file);
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (canvas.width - drawW) / 2;
    const drawY = (canvas.height - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Bottom band
    const bandaY = 720;
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, bandaY, 1080, 360);

    // PASALA label
    ctx.fillStyle = "#2563EB";
    ctx.font = "bold 28px Inter, sans-serif";
    ctx.fillText("PASALA", 60, bandaY + 44);

    if (cardData.type === "player") {
      const nombre = cardData.playerName ?? "Jugador";
      const indice = cardData.pasalaIndex != null ? Math.round(cardData.pasalaIndex) : null;

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 52px Inter, sans-serif";
      ctx.fillText(nombre, 60, bandaY + 110);

      if (indice !== null) {
        ctx.fillStyle = "#2563EB";
        ctx.font = "bold 80px Inter, sans-serif";
        ctx.fillText(`${indice}/100`, 60, bandaY + 220);

        ctx.fillStyle = "#475569";
        ctx.font = "bold 28px Inter, sans-serif";
        ctx.fillText("PASALA Index", 60, bandaY + 270);
      }
    } else {
      // match
      const teamA = cardData.teamA ?? "";
      const teamB = cardData.teamB ?? "";
      const sets = cardData.sets ?? [];
      const setsStr = sets.map((s) => `${s.a}-${s.b}`).join("  ");

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 40px Inter, sans-serif";
      ctx.fillText(teamA, 60, bandaY + 90);

      ctx.fillStyle = "#475569";
      ctx.font = "bold 32px Inter, sans-serif";
      ctx.fillText("vs", 60, bandaY + 150);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 40px Inter, sans-serif";
      ctx.fillText(teamB, 60, bandaY + 210);

      if (setsStr) {
        ctx.fillStyle = "#2563EB";
        ctx.font = "bold 36px Inter, sans-serif";
        ctx.fillText(setsStr, 60, bandaY + 290);
      }
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setComposedBlob(blob);
        setPreviewUrl(url);
        setStep("preview");
      },
      "image/png",
      0.95
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    composeCanvas(file);
  }

  async function handleShare() {
    if (!composedBlob) return;
    setSharing(true);
    try {
      const file = new File([composedBlob], "pasala-card.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mi card de PASALA" });
      } else {
        const url = URL.createObjectURL(composedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pasala-card.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-black text-white uppercase tracking-widest">Personalizar con tu foto</span>
      </div>

      {step === "select" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-center text-sm text-white/70 mb-4">Elegí una foto para personalizar tu card</p>

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-white py-4 text-sm font-black uppercase tracking-widest text-slate-900"
          >
            <Camera className="h-5 w-5" />
            Sacar foto ahora
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-white/10 border border-white/20 py-4 text-sm font-black uppercase tracking-widest text-white"
          >
            <ImageIcon className="h-5 w-5" />
            Elegir de galería
          </button>

          {/* Hidden inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {step === "preview" && previewUrl && (
        <div className="flex flex-1 flex-col items-center justify-between px-4 py-4">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview de tu card"
              className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain"
            />
          </div>

          {/* Actions */}
          <div className="w-full max-w-xs space-y-2 mt-4">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" />
              {sharing ? "Compartiendo..." : "Compartir"}
            </button>
            <button
              onClick={() => {
                setStep("select");
                setPreviewUrl(null);
                setComposedBlob(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white"
            >
              Cambiar foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
