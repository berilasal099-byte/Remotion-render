import { loadFont as loadDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { BOOK_PALETTES } from "../../books.generated";

const { fontFamily: SERIF } = loadDisplay();

export const PAPER = "var(--vox-paper)";
export const INK = "var(--vox-ink)";
export const RED = "var(--vox-red)";
export const GOLD = "var(--vox-gold)";
export const HEADLINE = "'Arial Black', Arial, sans-serif";
export { SERIF };

export const DEFAULT_PALETTE = { paper: "#DAD9D5", ink: "#1A1A1A", red: "#E04329", gold: "#E8A417" };
export const resolvePalette = (slug?: string) => BOOK_PALETTES[slug ?? ""] ?? DEFAULT_PALETTE;

export const CAPTION_BAND = 210;

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
