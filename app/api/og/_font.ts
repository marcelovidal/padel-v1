import { readFileSync } from "fs";
import { join } from "path";

// Load the bundled Noto Sans font using readFileSync (avoids fileURLToPath Windows bug).
// Cached at module level so it's only read once per cold start.
let _fontData: Buffer | null = null;

export function getOgFont(): Buffer {
  if (!_fontData) {
    const fontPath = join(
      process.cwd(),
      "node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf"
    );
    _fontData = readFileSync(fontPath);
  }
  return _fontData;
}

export function ogFontOptions() {
  return {
    fonts: [
      {
        name: "sans-serif",
        data: getOgFont(),
        style: "normal" as const,
        weight: 400 as const,
      },
    ],
  };
}
