/**
 * Figma "icon/hangup": the phone handset glyph rotated 135deg, centred in its box.
 * Two exports of it exist: 26px (call controls, 5.x call screens) and 20px (live activity).
 * The glyph is white: it always sits on the tomato End button.
 */
const GLYPHS = {
  26: { src: "/figma/v2/2014-2091/group-1.svg", glyph: 23.3693 },
  20: { src: "/figma/screens/2-143/group.svg", glyph: 18.3918 },
} as const;

export function HangUpIcon({ size = 26 }: { size?: keyof typeof GLYPHS }) {
  const { src, glyph } = GLYPHS[size];
  return (
    <span aria-hidden className="relative block shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <img
        src={src}
        alt=""
        width={glyph}
        height={glyph}
        className="absolute left-1/2 top-1/2 block max-w-none rotate-135"
        style={{ width: glyph, height: glyph, marginLeft: -glyph / 2, marginTop: -glyph / 2 }}
      />
    </span>
  );
}
