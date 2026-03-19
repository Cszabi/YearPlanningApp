import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, C } from "./pdfTheme";
import type { IkigaiJourneyDto } from "@/api/ikigaiApi";

const ROOMS = [
  { type: "Love",       emoji: "❤️",  label: "What You Love",           color: C.coral,   bg: C.coralLight,  desc: "Your passions and what brings you joy" },
  { type: "GoodAt",     emoji: "💪",  label: "What You're Good At",     color: C.teal,    bg: C.tealLight,   desc: "Your strengths and natural talents" },
  { type: "WorldNeeds", emoji: "🌍",  label: "What the World Needs",    color: C.emerald, bg: C.emeraldLight,desc: "Your contribution and mission" },
  { type: "PaidFor",    emoji: "💰",  label: "What You Can Be Paid For",color: C.amber,   bg: C.amberLight,  desc: "Your professional skills and value" },
];

interface Props { journey: IkigaiJourneyDto; year: number }

export default function IkigaiCanvasPdf({ journey, year }: Props) {
  const northStar = journey.northStar;
  const values    = [...journey.values].sort((a, b) => a.rank - b.rank);
  const synthesis = journey.rooms.find((r) => r.roomType === "Synthesis");

  return (
    <Document title={`Ikigai Canvas ${year}`} author="Flowkigai">
      <Page size="A4" style={base.page}>

        {/* Header */}
        <View style={base.headerBar}>
          <View>
            <Text style={base.logoText}>🌊 Flowkigai</Text>
            <Text style={base.logoSub}>Year planning &amp; deep work</Text>
          </View>
          <View style={base.headerRight}>
            <Text style={base.headerTitle}>Ikigai Canvas {year}</Text>
            <Text style={base.headerDate}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* North Star — hero section */}
        {northStar && (
          <View style={{
            backgroundColor: C.teal,
            borderRadius: 10,
            padding: 16,
            marginBottom: 14,
            alignItems: "center",
          }}>
            <Text style={{ fontSize: 22, marginBottom: 6 }}>✦</Text>
            <Text style={{ fontSize: 9, color: C.tealLight, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              North Star
            </Text>
            <Text style={{ fontSize: 13, color: C.white, fontFamily: "Helvetica-Bold", textAlign: "center", lineHeight: 1.5 }}>
              {northStar.statement}
            </Text>
          </View>
        )}

        {/* 4 rooms in 2×2 grid */}
        <View style={[base.row, { flexWrap: "wrap", gap: 8 }]}>
          {ROOMS.map(({ type, emoji, label, color, bg, desc }) => {
            const room = journey.rooms.find((r) => r.roomType === type);
            return (
              <View key={type} style={{ width: "48.5%", backgroundColor: bg, borderRadius: 8, padding: 10, borderTopWidth: 3, borderTopColor: color }}>
                <View style={[base.row, { marginBottom: 6 }]}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color }}>{label}</Text>
                    <Text style={[base.mutedText, { marginTop: 1 }]}>{desc}</Text>
                  </View>
                </View>
                {room && room.answers.filter(Boolean).length > 0
                  ? room.answers.filter(Boolean).map((ans, i) => (
                      <View key={i} style={[base.row, { marginBottom: 3 }]}>
                        <Text style={[base.mutedText, { marginRight: 5, color }]}>▸</Text>
                        <Text style={[base.bodyText, { flex: 1 }]}>{ans}</Text>
                      </View>
                    ))
                  : <Text style={base.mutedText}>Not filled in yet.</Text>
                }
              </View>
            );
          })}
        </View>

        {/* Synthesis */}
        {synthesis && synthesis.answers.filter(Boolean).length > 0 && (
          <>
            <View style={[base.sectionHeader, { backgroundColor: C.purple, marginTop: 14 }]}>
              <Text style={base.sectionEmoji}>✨</Text>
              <Text style={base.sectionTitle}>Synthesis — Where It All Meets</Text>
            </View>
            {synthesis.answers.filter(Boolean).map((ans, i) => (
              <View key={i} style={[base.row, { marginBottom: 4 }]}>
                <Text style={[base.bodyText, { marginRight: 6, color: C.purple }]}>✦</Text>
                <Text style={[base.bodyText, { flex: 1 }]}>{ans}</Text>
              </View>
            ))}
          </>
        )}

        {/* Values */}
        {values.length > 0 && (
          <>
            <View style={[base.sectionHeader, { backgroundColor: C.amber, marginTop: 14 }]}>
              <Text style={base.sectionEmoji}>💎</Text>
              <Text style={base.sectionTitle}>Core Values</Text>
            </View>
            <View style={[base.row, { flexWrap: "wrap", gap: 6 }]}>
              {values.map((v) => (
                <View key={v.id} style={[base.chip, { backgroundColor: C.amberLight, paddingVertical: 4, paddingHorizontal: 10 }]}>
                  <Text style={[base.chipText, { color: C.amber, fontSize: 10 }]}>
                    {v.rank <= 3 ? ["🥇", "🥈", "🥉"][v.rank - 1] : `${v.rank}.`}  {v.valueName}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>🌊 Flowkigai · Ikigai Canvas {year}</Text>
          <Text style={base.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          <Text style={base.footerText}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>

      </Page>
    </Document>
  );
}
