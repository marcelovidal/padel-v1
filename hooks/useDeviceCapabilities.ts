"use client";

import { useEffect, useState } from "react";

interface DeviceCapabilities {
  isMobile: boolean;
  hasCamera: boolean;
  showPhotoComposer: boolean;
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>({
    isMobile: false,
    hasCamera: false,
    showPhotoComposer: false,
  });

  useEffect(() => {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        const hasCamera = devices.some((d) => d.kind === "videoinput");
        setCaps({ isMobile, hasCamera, showPhotoComposer: hasCamera });
      })
      .catch(() => {
        // mediaDevices not available — no camera
      });
  }, []);

  return caps;
}
