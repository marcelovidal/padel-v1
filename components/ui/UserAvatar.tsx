"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    src?: string | null;
    initials?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    onClick?: () => void;
}

export function UserAvatar({ src, initials, size = "md", className, onClick }: UserAvatarProps) {
    const sizeClasses = {
        xs: "w-6 h-6 text-[10px]",
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-16 h-16 text-lg",
        xl: "w-32 h-32 text-2xl",
    };

    const hasImage = !!src;

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative flex shrink-0 overflow-hidden rounded-full border border-gray-100 bg-gray-50 items-center justify-center font-bold text-gray-500",
                sizeClasses[size],
                onClick && "cursor-pointer hover:opacity-80 transition-opacity",
                className
            )}
        >
            {hasImage ? (
                <img
                    src={src}
                    alt="User avatar"
                    className="aspect-square h-full w-full object-cover"
                    onError={(e) => {
                        // Fallback simple si la imagen falla
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                />
            ) : null}

            <span className={cn(hasImage && "hidden", "uppercase")}>
                {initials || "??"}
            </span>
        </div>
    );
}
