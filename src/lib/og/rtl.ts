// The image generator behind next/og draws text left to right and has no
// bidi support, so Hebrew comes out mirrored. These helpers turn a logical
// Hebrew string into visual order, keeping numbers and Latin words intact,
// and wrap long text into lines ourselves (wrapping reversed text would put
// the lines in the wrong order).

const LTR_RUN = /[A-Za-z0-9][A-Za-z0-9.,:/%+\-@_&']*[A-Za-z0-9%]|[A-Za-z0-9]/g;
const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "<": ">", ">": "<", "{": "}", "}": "{" };

export function visual(text: string): string {
  const parts: { ltr: boolean; s: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(LTR_RUN)) {
    if (m.index! > last) parts.push({ ltr: false, s: text.slice(last, m.index) });
    parts.push({ ltr: true, s: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ ltr: false, s: text.slice(last) });
  return parts
    .reverse()
    .map((p) => (p.ltr ? p.s : [...p.s].reverse().map((c) => MIRROR[c] ?? c).join("")))
    .join("");
}

// Greedy word wrap by character count, then at most `maxLines` lines
// (the last one ends with "…" if the text is longer).
export function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line + " " + w).length > perLine) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S*$/, "") + "…";
    return kept;
  }
  return lines;
}
