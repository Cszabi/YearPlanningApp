import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, C, progressBarStyles } from "./pdfTheme";
import type { FlowSessionDto } from "@/api/flowSessionApi";

const OUTCOME_LABEL: Record<string, { label: string; color: string }> = {
  Fully:       { label: "Fully ✅",       color: C.emerald },
  Partially:   { label: "Partially 🟡",  color: C.amber   },
  NotReally:   { label: "Not really ❌",  color: C.coral   },
};

function StarRating({ value }: { value: number }) {
  const stars = "★".repeat(Math.round(value)) + "☆".repeat(5 - Math.round(value));
  return <Text style={[base.mutedText, { color: C.amber, letterSpacing: 1 }]}>{stars}</Text>;
}

function SessionRow({ session, index }: { session: FlowSessionDto; index: number }) {
  const date = new Date(session.startedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const duration = session.actualMinutes ?? session.plannedMinutes;
  const outcome  = session.outcome ? OUTCOME_LABEL[session.outcome] : null;
  const isEven   = index % 2 === 0;

  return (
    <View style={{ backgroundColor: isEven ? C.white : C.grayLight, padding: 8, flexDirection: "row", alignItems: "flex-start" }}>
      {/* Date */}
      <Text style={[base.mutedText, { width: 68 }]}>{date}</Text>
      {/* Intention */}
      <Text style={[base.bodyText, { flex: 1, paddingRight: 8 }]}>
        {session.sessionIntention ?? "—"}
      </Text>
      {/* Duration */}
      <Text style={[base.mutedText, { width: 44, textAlign: "right" }]}>{duration}m</Text>
      {/* Quality */}
      <View style={{ width: 52, alignItems: "center" }}>
        {session.flowQualityRating ? <StarRating value={session.flowQualityRating} /> : <Text style={base.mutedText}>—</Text>}
      </View>
      {/* Outcome */}
      <View style={{ width: 72 }}>
        {outcome
          ? <Text style={[base.mutedText, { color: outcome.color }]}>{outcome.label}</Text>
          : <Text style={base.mutedText}>—</Text>
        }
      </View>
    </View>
  );
}

interface Props { sessions: FlowSessionDto[]; year: number }

export default function FlowHistoryPdf({ sessions, year }: Props) {
  const totalMinutes   = sessions.reduce((s, f) => s + (f.actualMinutes ?? f.plannedMinutes), 0);
  const avgQuality     = sessions.filter((f) => f.flowQualityRating).length > 0
    ? sessions.reduce((s, f) => s + (f.flowQualityRating ?? 0), 0) / sessions.filter((f) => f.flowQualityRating).length
    : null;
  const interrupted    = sessions.filter((f) => f.wasInterrupted).length;
  const fullyAchieved  = sessions.filter((f) => f.outcome === "Fully").length;
  const qPct           = avgQuality ? (avgQuality / 5) * 100 : 0;
  const qStyle         = progressBarStyles(qPct, C.amber);

  // Sort newest first
  const sorted = [...sessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return (
    <Document title={`Flow History ${year}`} author="Flowkigai">
      <Page size="A4" style={base.page}>

        {/* Header */}
        <View style={base.headerBar}>
          <View>
            <Text style={base.logoText}>🌊 Flowkigai</Text>
            <Text style={base.logoSub}>Year planning &amp; deep work</Text>
          </View>
          <View style={base.headerRight}>
            <Text style={base.headerTitle}>Flow Session History {year}</Text>
            <Text style={base.headerDate}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[base.row, { gap: 8, marginBottom: 4 }]}>
          {[
            { emoji: "🌊", label: "Sessions",      value: String(sessions.length),              bg: C.tealLight,    color: C.teal    },
            { emoji: "⏱️", label: "Hours Deep Work",value: (totalMinutes / 60).toFixed(1) + "h", bg: C.amberLight,   color: C.amber   },
            { emoji: "✅", label: "Fully Achieved", value: `${fullyAchieved} / ${sessions.length}`, bg: C.emeraldLight, color: C.emerald },
            { emoji: "⚡", label: "Interrupted",    value: String(interrupted),                  bg: C.coralLight,   color: C.coral   },
          ].map(({ emoji, label, value, bg, color }) => (
            <View key={label} style={[base.card, { flex: 1, alignItems: "center", backgroundColor: bg }]}>
              <Text style={{ fontSize: 16, marginBottom: 2 }}>{emoji}</Text>
              <Text style={[base.cardTitle, { color, fontSize: 13 }]}>{value}</Text>
              <Text style={base.mutedText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Avg quality bar */}
        {avgQuality !== null && (
          <View style={[base.card, { backgroundColor: C.amberLight, marginBottom: 8 }]}>
            <View style={[base.row, { justifyContent: "space-between", marginBottom: 4 }]}>
              <Text style={[base.subLabel, { marginTop: 0, marginBottom: 0 }]}>⭐ Average Flow Quality</Text>
              <Text style={[base.bodyText, { fontFamily: "Helvetica-Bold", color: C.amber }]}>
                {avgQuality.toFixed(1)} / 5
              </Text>
            </View>
            <View style={qStyle.track}><View style={qStyle.fill} /></View>
          </View>
        )}

        {/* Table header */}
        <View style={[base.sectionHeader, { marginTop: 8 }]}>
          <Text style={base.sectionEmoji}>📋</Text>
          <Text style={base.sectionTitle}>Session Log ({sessions.length} sessions)</Text>
        </View>

        {/* Column labels */}
        <View style={{ flexDirection: "row", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.tealLight }}>
          <Text style={[base.mutedText, { width: 68, fontFamily: "Helvetica-Bold" }]}>Date</Text>
          <Text style={[base.mutedText, { flex: 1, fontFamily: "Helvetica-Bold" }]}>Intention</Text>
          <Text style={[base.mutedText, { width: 44, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>Dur.</Text>
          <Text style={[base.mutedText, { width: 52, textAlign: "center", fontFamily: "Helvetica-Bold" }]}>Quality</Text>
          <Text style={[base.mutedText, { width: 72, fontFamily: "Helvetica-Bold" }]}>Outcome</Text>
        </View>

        {sorted.map((s, i) => <SessionRow key={s.id} session={s} index={i} />)}

        {sessions.length === 0 && (
          <Text style={[base.mutedText, { textAlign: "center", marginTop: 20 }]}>
            No flow sessions recorded yet for {year}.
          </Text>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>🌊 Flowkigai · Flow Session History {year}</Text>
          <Text style={base.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          <Text style={base.footerText}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>

      </Page>
    </Document>
  );
}
