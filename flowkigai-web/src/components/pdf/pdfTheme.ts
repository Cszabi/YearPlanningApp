import { Font, StyleSheet } from "@react-pdf/renderer";

// ── Emoji support via Twemoji ─────────────────────────────────────────────────
Font.registerEmojiSource({
  format: "png",
  url: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/",
});

// ── Hyphenation: disable ──────────────────────────────────────────────────────
Font.registerHyphenationCallback((word) => [word]);

// ── Colour palette ────────────────────────────────────────────────────────────
export const C = {
  teal:        "#0D6E6E",
  tealLight:   "#E6F4F4",
  tealMid:     "#1A8C8C",
  amber:       "#F5A623",
  amberLight:  "#FEF3D7",
  coral:       "#E8705A",
  coralLight:  "#FDECEA",
  emerald:     "#10B981",
  emeraldLight:"#D1FAE5",
  purple:      "#8B5CF6",
  purpleLight: "#EDE9FE",
  dark:        "#1A1A2E",
  gray:        "#6B7280",
  grayLight:   "#F3F4F6",
  grayBorder:  "#E5E7EB",
  white:       "#FFFFFF",
  offWhite:    "#FAFAF8",
} as const;

// ── Shared base styles ────────────────────────────────────────────────────────
export const base = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 44,
  },
  // Header bar
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.teal,
    letterSpacing: 0.5,
  },
  logoSub: {
    fontSize: 9,
    color: C.gray,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  headerDate: {
    fontSize: 9,
    color: C.gray,
    marginTop: 2,
  },
  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.teal,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  // Sub-section label
  subLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
    marginTop: 10,
  },
  // Body text
  bodyText: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.5,
  },
  mutedText: {
    fontSize: 9,
    color: C.gray,
    lineHeight: 1.4,
  },
  // Card
  card: {
    backgroundColor: C.grayLight,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 3,
  },
  // Chip / badge
  chip: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginRight: 5,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.grayBorder,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: C.gray,
  },
});

// ── Progress bar helper (returns style objects, not a component) ─────────────
export function progressBarStyles(pct: number, color: string = C.teal) {
  const clamped = Math.min(100, Math.max(0, pct));
  return {
    track: { backgroundColor: C.grayBorder, borderRadius: 3, height: 6, width: "100%" as const },
    fill:  { backgroundColor: color, borderRadius: 3, height: 6, width: `${clamped}%` as const },
  };
}

// ── Life-area colours ─────────────────────────────────────────────────────────
export const LIFE_AREA_COLOR: Record<string, string> = {
  Career:       C.teal,
  Health:       C.emerald,
  Relationships:C.coral,
  Finances:     C.amber,
  Personal:     C.purple,
  Learning:     "#3B82F6",
  Creativity:   "#EC4899",
  Spirituality: "#F59E0B",
};

export const LIFE_AREA_EMOJI: Record<string, string> = {
  Career:       "💼",
  Health:       "💪",
  Relationships:"❤️",
  Finances:     "💰",
  Personal:     "🌱",
  Learning:     "📚",
  Creativity:   "🎨",
  Spirituality: "✨",
};
