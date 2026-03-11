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
  const data = getOgFont();
  return {
    fonts: [
      { name: "sans-serif", data, style: "normal" as const, weight: 400 as const },
      // Register same TTF for bold weights so Satori uses our font instead of
      // system fallback. True bold glyphs require a separate Bold TTF file.
      { name: "sans-serif", data, style: "normal" as const, weight: 700 as const },
      { name: "sans-serif", data, style: "normal" as const, weight: 900 as const },
    ],
  };
}
