import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, C, progressBarStyles, LIFE_AREA_COLOR, LIFE_AREA_EMOJI } from "./pdfTheme";
import type { GoalDto } from "@/api/goalApi";
import type { HabitDto } from "@/api/habitApi";

function SectionHeader({ emoji, title, color = C.teal }: { emoji: string; title: string; color?: string }) {
  return (
    <View style={[base.sectionHeader, { backgroundColor: color }]}>
      <Text style={base.sectionEmoji}>{emoji}</Text>
      <Text style={base.sectionTitle}>{title}</Text>
    </View>
  );
}

function GoalCard({ goal, habits }: { goal: GoalDto; habits: HabitDto[] }) {
  const areaColor = LIFE_AREA_COLOR[goal.lifeArea] ?? C.teal;
  const areaEmoji = LIFE_AREA_EMOJI[goal.lifeArea] ?? "🎯";
  const goalHabits = habits.filter((h) => h.goalId === goal.id);
  const s = progressBarStyles(goal.progressPercent, areaColor);
  const statusBg = goal.status === "Achieved" ? C.emeraldLight : C.tealLight;
  const statusColor = goal.status === "Achieved" ? C.emerald : C.teal;

  return (
    <View style={[base.card, { marginBottom: 12, padding: 12, backgroundColor: C.offWhite, borderLeftWidth: 4, borderLeftColor: areaColor }]}>
      {/* Title row */}
      <View style={[base.row, { justifyContent: "space-between", marginBottom: 6 }]}>
        <Text style={[base.cardTitle, { flex: 1, fontSize: 11 }]}>{areaEmoji}  {goal.title}</Text>
        <View style={[base.chip, { backgroundColor: statusBg }]}>
          <Text style={[base.chipText, { color: statusColor }]}>{goal.status === "Achieved" ? "✅ Achieved" : "🎯 Active"}</Text>
        </View>
      </View>

      {/* Chips row */}
      <View style={[base.row, { marginBottom: 8, flexWrap: "wrap" }]}>
        <View style={[base.chip, { backgroundColor: areaColor + "22" }]}>
          <Text style={[base.chipText, { color: areaColor }]}>{goal.lifeArea}</Text>
        </View>
        <View style={[base.chip, { backgroundColor: C.grayLight }]}>
          <Text style={[base.chipText, { color: C.gray }]}>{goal.energyLevel} energy</Text>
        </View>
        {goal.targetDate && (
          <View style={[base.chip, { backgroundColor: C.amberLight }]}>
            <Text style={[base.chipText, { color: C.amber }]}>
              📅 {new Date(goal.targetDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
        )}
      </View>

      {/* Progress */}
      <View style={[base.row, { alignItems: "center", gap: 8, marginBottom: 6 }]}>
        <Text style={[base.mutedText, { width: 56 }]}>Progress</Text>
        <View style={{ flex: 1 }}>
          <View style={s.track}><View style={s.fill} /></View>
        </View>
        <Text style={[base.bodyText, { fontFamily: "Helvetica-Bold", color: areaColor, width: 36, textAlign: "right" }]}>
          {goal.progressPercent}%
        </Text>
      </View>

      {/* Why it matters */}
      {goal.whyItMatters && (
        <View style={{ marginBottom: 6 }}>
          <Text style={[base.mutedText, { marginBottom: 2 }]}>💡 Why it matters</Text>
          <Text style={[base.bodyText, { fontStyle: "italic", color: C.gray }]}>{goal.whyItMatters}</Text>
        </View>
      )}

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <View style={{ marginBottom: 6 }}>
          <Text style={[base.mutedText, { marginBottom: 4 }]}>🏁 Milestones</Text>
          {goal.milestones.slice(0, 5).map((m) => (
            <View key={m.id} style={[base.row, { marginBottom: 2 }]}>
              <Text style={[base.mutedText, { marginRight: 5 }]}>{m.isComplete ? "✅" : "⬜"}</Text>
              <Text style={[base.bodyText, { flex: 1, textDecoration: m.isComplete ? "line-through" : "none", color: m.isComplete ? C.gray : C.dark }]}>
                {m.title}
              </Text>
            </View>
          ))}
          {goal.milestones.length > 5 && (
            <Text style={base.mutedText}>+{goal.milestones.length - 5} more…</Text>
          )}
        </View>
      )}

      {/* Habits */}
      {goalHabits.length > 0 && (
        <View>
          <Text style={[base.mutedText, { marginBottom: 4 }]}>🔄 Habits</Text>
          {goalHabits.map((h) => (
            <View key={h.id} style={[base.row, { marginBottom: 3 }]}>
              <Text style={[base.bodyText, { flex: 1 }]}>{h.title}</Text>
              <View style={[base.chip, { backgroundColor: C.amberLight }]}>
                <Text style={[base.chipText, { color: C.amber }]}>🔥 {h.currentStreak}d streak</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Values */}
      {goal.alignedValueNames.length > 0 && (
        <View style={[base.row, { flexWrap: "wrap", marginTop: 4 }]}>
          {goal.alignedValueNames.map((v) => (
            <View key={v} style={[base.chip, { backgroundColor: C.purpleLight }]}>
              <Text style={[base.chipText, { color: C.purple }]}>💎 {v}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface Props { goals: GoalDto[]; habits: HabitDto[]; year: number }

export default function GoalsSummaryPdf({ goals, habits, year }: Props) {
  const active    = goals.filter((g) => g.status !== "Achieved");
  const achieved  = goals.filter((g) => g.status === "Achieved");
  const avgProgress = active.length > 0 ? Math.round(active.reduce((s, g) => s + g.progressPercent, 0) / active.length) : 0;

  return (
    <Document title={`Goals ${year}`} author="Flowkigai">
      <Page size="A4" style={base.page}>

        {/* Header */}
        <View style={base.headerBar}>
          <View>
            <Text style={base.logoText}>🌊 Flowkigai</Text>
            <Text style={base.logoSub}>Year planning &amp; deep work</Text>
          </View>
          <View style={base.headerRight}>
            <Text style={base.headerTitle}>Goals Summary {year}</Text>
            <Text style={base.headerDate}>
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={[base.row, { gap: 8, marginBottom: 4 }]}>
          {[
            { emoji: "🎯", label: "Active Goals",   value: String(active.length),   bg: C.tealLight,    color: C.teal    },
            { emoji: "✅", label: "Achieved",        value: String(achieved.length), bg: C.emeraldLight, color: C.emerald },
            { emoji: "📈", label: "Avg Progress",    value: `${avgProgress}%`,       bg: C.amberLight,   color: C.amber   },
            { emoji: "🔄", label: "Total Habits",    value: String(habits.length),   bg: C.purpleLight,  color: C.purple  },
          ].map(({ emoji, label, value, bg, color }) => (
            <View key={label} style={[base.card, { flex: 1, alignItems: "center", backgroundColor: bg }]}>
              <Text style={{ fontSize: 16, marginBottom: 2 }}>{emoji}</Text>
              <Text style={[base.cardTitle, { color, fontSize: 14 }]}>{value}</Text>
              <Text style={base.mutedText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Active goals */}
        {active.length > 0 && (
          <>
            <SectionHeader emoji="🎯" title={`Active Goals (${active.length})`} />
            {active.map((g) => <GoalCard key={g.id} goal={g} habits={habits} />)}
          </>
        )}

        {/* Achieved goals */}
        {achieved.length > 0 && (
          <>
            <SectionHeader emoji="✅" title={`Achieved (${achieved.length})`} color={C.emerald} />
            {achieved.map((g) => <GoalCard key={g.id} goal={g} habits={habits} />)}
          </>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>🌊 Flowkigai · Goals Summary {year}</Text>
          <Text style={base.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
          <Text style={base.footerText}>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>

      </Page>
    </Document>
  );
}
