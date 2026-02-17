"use client";

import React, { useState } from "react";
import { uploadAvatarAction } from "@/app/actions/onboarding.actions";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploaderProps {
    onUploadComplete: (path: string, signedUrl: string) => void;
    currentAvatarUrl?: string;
}

export default function AvatarUploader({ onUploadComplete, currentAvatarUrl }: AvatarUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview local
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const result = await uploadAvatarAction(formData);

        if (result.success && result.path && result.signedUrl) {
            onUploadComplete(result.path, result.signedUrl);
        } else {
            console.error("Error al subir avatar:", result.error);
            alert("Error al subir la imagen. Por favor, intentá de nuevo.");
        }
        setUploading(false);
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-xl flex items-center justify-center relative">
                    {preview ? (
                        <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <Camera className="w-12 h-12 text-gray-300" />
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    )}
                </div>

                <label className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-all transform hover:scale-110">
                    <Camera className="w-5 h-5" />
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </label>
            </div>
            <p className="text-xs text-gray-500 font-medium">Foto de perfil</p>
        </div>
    );
}
