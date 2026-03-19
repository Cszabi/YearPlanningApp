import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, C, progressBarStyles } from "./pdfTheme";
import type { ReviewDto } from "@/api/reviewApi";

// ── helpers ───────────────────────────────────────────────────────────────────
function formatWeek(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const ENERGY_LABELS: Record<number, string> = {
  1: "Drained 😴",
  2: "Low 😔",
  3: "Neutral 😐",
  4: "Good 🙂",
  5: "Energised 🔥",
};

const FLOW_SCHEDULED_LABELS: Record<string, string> = {
  Yes:      "Yes ✅",
  Planning: "Planning 🗓️",
  NotYet:   "Not yet ❌",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ emoji, title, color = C.teal }: { emoji: string; title: string; color?: string }) {
  return (
    <View style={[base.sectionHeader, { backgroundColor: color }]}>
      <Text style={base.sectionEmoji}>{emoji}</Text>
      <Text style={base.sectionTitle}>{title}</Text>
    </View>
  );
}

function SubLabel({ text }: { text: string }) {
  return <Text style={base.subLabel}>{text}</Text>;
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={[base.row, { marginBottom: 3 }]}>
      <Text style={[base.bodyText, { marginRight: 6, color: C.teal }]}>•</Text>
      <Text style={[base.bodyText, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

function EnergyBar({ rating }: { rating: number }) {
  const s = progressBarStyles((rating / 5) * 100, C.emerald);
  return (
    <View>
      <SubLabel text="⚡ Energy Rating" />
      <View style={[base.row, { marginBottom: 4, gap: 8 }]}>
        <View style={{ flex: 1 }}>
          <View style={s.track}><View style={s.fill} /></View>
        </View>
        <Text style={[base.bodyText, { fontFamily: "Helvetica-Bold", color: C.emerald }]}>
          {ENERGY_LABELS[rating] ?? `${rating}/5`}
        </Text>
      </View>
    </View>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────
interface Props { review: ReviewDto; goals: Array<{ id: string; title: string }> }

export default function WeeklyReviewPdf({ review, goals }: Props) {
  const a = review.answers;
  const weekLabel = `Week of ${formatWeek(review.periodStart)} – ${formatWeek(review.periodEnd)}`;

  return (
    <Document title="Weekly Review" author="Flowkigai">
      <Page size="A4" style={base.page}>

        {/* ── Header ── */}
        <View style={base.headerBar}>
          <View>
            <Text style={base.logoText}>🌊 Flowkigai</Text>
            <Text style={base.logoSub}>Year planning &amp; deep work</Text>
          </View>
          <View style={base.headerRight}>
            <Text style={base.headerTitle}>Weekly Review</Text>
            <Text style={base.headerDate}>{weekLabel}</Text>
          </View>
        </View>

        {/* ════════════════ LOOK BACK ════════════════ */}
        <SectionHeader emoji="🔍" title="Look Back" />

        {review.energyRating && <EnergyBar rating={review.energyRating} />}

        <SubLabel text="✅ Completed Tasks" />
        {(review as any).weeklyData?.completedTasks?.length > 0
          ? (review as any).weeklyData.completedTasks.map((t: any) => (
              <BulletItem key={t.taskId} text={`${t.title}  (${t.goalTitle})`} />
            ))
          : <Text style={base.mutedText}>No completed tasks recorded.</Text>
        }

        {a.completedTaskNotes && (
          <>
            <SubLabel text="💬 Notes on completed work" />
            <View style={[base.card, { backgroundColor: C.tealLight }]}>
              <Text style={base.bodyText}>{a.completedTaskNotes}</Text>
            </View>
          </>
        )}

        {a.carriedOverNote && (
          <>
            <SubLabel text="🔄 Carried Over" />
            <View style={[base.card, { backgroundColor: C.amberLight }]}>
              <Text style={base.bodyText}>{a.carriedOverNote}</Text>
            </View>
          </>
        )}

        {a.habitNotes && (
          <>
            <SubLabel text="💪 Habit Notes" />
            <View style={[base.card]}>
              <Text style={base.bodyText}>{a.habitNotes}</Text>
            </View>
          </>
        )}

        {/* ════════════════ LOOK FORWARD ════════════════ */}
        <SectionHeader emoji="🎯" title="Look Forward" color={C.amber} />

        {(a.priority1 || a.priority2 || a.priority3) && (
          <>
            <SubLabel text="🏆 Top 3 Priorities" />
            {[a.priority1, a.priority2, a.priority3].filter(Boolean).map((p, i) => (
              <View key={i} style={[base.row, { marginBottom: 4 }]}>
                <View style={[base.chip, { backgroundColor: C.amber }]}>
                  <Text style={[base.chipText, { color: C.white }]}>{i + 1}</Text>
                </View>
                <Text style={[base.bodyText, { flex: 1 }]}>{p}</Text>
              </View>
            ))}
          </>
        )}

        {a.flowSessionsScheduled && (
          <>
            <SubLabel text="🌊 Flow Sessions Scheduled" />
            <Text style={[base.bodyText, { color: C.teal }]}>
              {FLOW_SCHEDULED_LABELS[a.flowSessionsScheduled] ?? a.flowSessionsScheduled}
            </Text>
          </>
        )}

        {goals.length > 0 && a.goalNextActions && Object.keys(a.goalNextActions).length > 0 && (
          <>
            <SubLabel text="⚡ Next Actions by Goal" />
            {goals.map((g) => {
              const action = a.goalNextActions?.[g.id];
              if (!action) return null;
              return (
                <View key={g.id} style={[base.card, { flexDirection: "row", gap: 8 }]}>
                  <Text style={[base.mutedText, { width: 100 }]}>{g.title}</Text>
                  <Text style={[base.bodyText, { flex: 1 }]}>{action}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* ════════════════ VALUES CHECK ════════════════ */}
        <SectionHeader emoji="💎" title="Values Check" color={C.purple} />

        {a.valuesReflection && (
          <View style={[base.card, { backgroundColor: C.purpleLight }]}>
            <Text style={base.bodyText}>{a.valuesReflection}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>🌊 Flowkigai · Weekly Review</Text>
          <Text style={base.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          <Text style={base.footerText}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>

      </Page>
    </Document>
  );
}
