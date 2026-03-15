# Flowkigai — Year Planning Application Spec

## Unique Proposition
The only productivity app that starts with who you are, not what you need to do.

---

## Vision
A productivity and flow application that guides users through a complete annual planning cycle —
from expansive thinking to focused daily execution — and keeps them on track through structured reviews.

---

## Philosophical Spine

| Layer | Framework | Feature |
|---|---|---|
| Who am I? | Ikigai | Ikigai Journey |
| What matters? | ACT / Values (Russ Harris) | Values Clarification + North Star |
| What to pursue? | Essentialism + SDT | Mind Map + Goal Setting |
| How to structure goals? | SMART + WOOP | Goal wizard |
| How to execute daily? | Flow Theory + Deep Work | Flow Timer |
| How to sustain habits? | Atomic Habits + Tiny Habits | Habit Cards |
| How to stay honest? | Stoicism + SDT | Weekly / Monthly / Annual Reviews |

---

## Core Workflow
Ikigai Journey → Values Clarification → Mind Map → Goal Setting → Scheduling → Taskify → Flow Timer → Review

---

## Part 0 — Ikigai Journey

### Purpose
Before any planning begins, the user must be grounded in identity and purpose. The Ikigai exercise is not a form — it is a contemplative journey across five rooms.

### Room 1 — LOVE 💛
**"What makes you lose track of time?"**

Prompts (one at a time, fade-in):
1. Think of the last time you were completely absorbed in something. What were you doing?
2. What would you do on a free Saturday with zero obligations and zero judgment?
3. What topics do you find yourself reading about without anyone asking you to?
4. When do you feel most like yourself?

### Room 2 — GOOD AT 💪
**"What comes naturally to you that others find difficult?"**

Prompts:
1. What do friends, colleagues, or family ask you for help with most often?
2. What skills have you built over years that you now take for granted?
3. What feedback do you receive repeatedly — even if you brush it off?
4. If you had to teach something to a room of strangers tomorrow, what would feel natural?

*Optional social prompt:* "Ask someone who knows you well: what do you think I'm exceptionally good at?"

### Room 3 — WORLD NEEDS 🌍
**"What problems do you feel pulled toward solving?"**

Prompts:
1. What injustice or inefficiency genuinely irritates you when you encounter it?
2. Who do you feel most compelled to help — what kind of person, in what kind of situation?
3. If you could change one thing about the world in your lifetime, what would it feel like to have changed it?
4. What would you want people to say you contributed, at the end of your life? *(Memento Mori thread)*

### Room 4 — PAID FOR 💼
**"What value do you create that the world will exchange something for?"**

Prompts:
1. What have people already paid you for, formally or informally?
2. What value do you create in your work that feels underrecognised?
3. If you had to generate income doing something close to your nature, what would the closest option be?
4. What would you do for much less money than you currently earn — because it matters to you?

### Room 5 — Synthesis 🌸
**The intersection moment**

Reflective prompts (after all four rooms, shown one at a time):
1. Looking at what you love and what you're good at — where is the clearest overlap?
2. Where does what the world needs touch something personal for you?
3. Is there a thread running through all four areas that surprises you?

**North Star field:**
> "In one or two sentences — what feels like your direction?"

The North Star statement sits permanently at the centre of the Mind Map and above every review.

### Frequency
- **First time:** Full four-room journey (~20–30 minutes)
- **Annual review:** 5-question refresh — "Has anything shifted?"
- **On demand:** User can return to any room at any time

---

## Part 1 — Values Clarification

Immediately after the Ikigai Journey.

**Phase 1:** Grid of 39 values — user selects up to 10
**Phase 2:** Narrow to exactly 5
**Phase 3:** Drag-to-rank final 5 (1 = most important)

### Value List
Authenticity, Adventure, Balance, Belonging, Compassion, Courage, Creativity, Curiosity, Discipline, Empathy, Excellence, Fairness, Faith, Family, Freedom, Friendship, Generosity, Growth, Harmony, Health, Honesty, Humility, Impact, Independence, Integrity, Justice, Kindness, Leadership, Learning, Love, Loyalty, Meaning, Mindfulness, Openness, Purpose, Resilience, Responsibility, Security, Service, Simplicity, Spirituality, Stewardship, Trust, Wisdom

Values travel through the entire app — goals, habits, tasks, and every review level connect back to the user's top 5.

---

## Part 2 — Mind Map

### Purpose
Free-form exploration of all life areas before committing to goals. The mind map is pre-seeded from Ikigai answers.

### Life Areas (suggested starting nodes)
- Career & Work
- Health & Body
- Relationships & Family
- Learning & Growth
- Finance
- Creativity & Hobbies
- Environment & Lifestyle
- Contribution & Purpose

### Node Types
| Type | Description |
|---|---|
| Root | North Star statement — always centred, not movable |
| Branch | Life area — one per domain |
| Leaf | Raw idea or theme |
| Goal (Project) | Converted from leaf — 🎯 teal border |
| Goal (Repetitive) | Converted from leaf — 🔁 amber border |

### Interactions
- Double-click blank canvas → create node at click position
- Double-click node → inline label edit
- Right-click node → context menu: Add child / Edit notes / Convert to goal / Delete
- Drag → reposition (auto-save debounced 500ms)
- Connect nodes by dragging handle

### Convert to Goal Flow
Modal: "Project goal (one time) or Habit (recurring)?"
→ Navigates to Goal wizard with pre-filled title and life area

---

## Part 3 — Goal Setting

### Project Goals → SMART + WOOP

**SMART Criteria:**
- **S** – Specific: What exactly do I want to achieve?
- **M** – Measurable: How will I know I've succeeded?
- **A** – Achievable: Is this realistic given my current resources?
- **R** – Relevant: Why does this matter to me? *(motivational anchor)*
- **T** – Time-bound: What is my target completion date?

**WOOP (Gabriele Oettingen):**
- **W** – Wish: State your goal in one energising sentence
- **O** – Outcome: What is the best possible result?
- **O** – Obstacle: What inner obstacle is most likely to get in your way?
- **P** – Plan: "If [obstacle], then I will [response]"

**Additional goal fields:**
- 💡 Why it matters — emotional motivation anchor
- ⚡ Energy profile — Deep Work / Medium / Shallow
- 🔗 Values alignment — which of your top 5 values does this serve?
- 📅 Target date

### Capacity Rule
> ⚠️ **Flow Rule:** Maximum 3 active Deep Work goals simultaneously.
> Context-switching across more than 3 major goals degrades quality and focus.

### Repetitive Goals → Habit Definition
- **Frequency:** Daily / Weekly / Monthly / Custom
- **Minimum viable dose:** Smallest unit of completion (e.g. 20 min of reading)
- **Ideal dose:** What does a great session look like?
- **Trigger:** When/where does this happen? (habit stacking anchor)
- **Celebration ritual:** What do you do immediately on completion?
- **Tracking method:** Streak / Count / Duration / Yes-No

---

## Part 4 — Scheduling

### Target Dates → Calendar
- Each project goal gets a target completion date → syncs to calendar
- Milestones get intermediate dates → calendar events
- Repetitive goals generate recurring calendar blocks

### Capacity Planning
Before locking the schedule, the app surfaces a capacity check:
- How many active project goals are running simultaneously?
- Are there seasonal constraints?

### Energy Mapping
User defines personal energy rhythm:
- 🟢 Peak hours — deep, creative, complex work
- 🟡 Mid hours — meetings, emails, admin
- 🔴 Low hours — rest, routine, passive tasks

Tasks are tagged and auto-suggested for the right energy window.

---

## Part 5 — Taskify

### Project Goal → Task Breakdown
1. **Milestones** — Major phases (3–7 per project)
2. **Tasks** — Concrete actions within each milestone
3. **Next Action** — The single, immediate next physical step (GTD principle)

**Task properties:**
- Title
- Estimated duration
- Energy tag: 🔵 Deep / 🟡 Medium / ⚪ Shallow
- Due date
- Dependency (blocked by / blocks)
- IsNextAction flag
- Status: Not started / In progress / Done / Deferred
- Aligned values (which of user's top 5 this serves)

### Repetitive Goal → Habit Card
- Frequency display
- Streak tracker with 7-day dot history
- Quick-log button (one tap completion)
- Celebration animation on log (neurologically intentional — Tiny Habits / BJ Fogg)
- Notes field for reflections

---

## Part 6 — Flow Timer

### Philosophy
Not a Pomodoro clone. The flow timer is goal-aware, energy-aware, and review-feeding.

| | Pomodoro | Flowkigai Flow Timer |
|---|---|---|
| Interval | Fixed 25 min | Flexible, based on energy tag |
| Philosophy | Time-boxing | State-protection |
| Break trigger | Clock | Fatigue or natural completion |
| Goal link | None | Task/goal aware |
| Energy tracking | None | Pre/post session rating |

### Pre-Session Setup
- Task selector (from today's tasks)
- Session length (based on energy tag: 🔵 90min / 🟡 45min / ⚪ 25min + custom)
- Session intention: "What does a successful session look like?"
- Ambient sound: Brown Noise / White Noise / Silence / Nature

### During Session
- Full-screen distraction-free mode
- Soft circular progress ring (SVG) — elapsed time, not countdown
- No countdown number — only the ring
- Pause / End Session only

### Post-Session Micro-Review (60 seconds)
1. Outcome: Fully ✅ / Partially 🟡 / Not really ❌
2. Flow quality: 1–5 (Scattered → In the zone)
3. Energy level now: 1–5 (Drained → Energised)
4. Optional: blockers

### Flow Insights
Session data feeds weekly review:
- Best day of week (highest avg flow quality)
- Best hour of day
- Avg session length (for quality ≥ 4)
- Total deep work minutes this week
- Interruption rate

---

## Part 7 — Review System

Without review, planning is just wishful thinking.

### Weekly Review
- ✅ What did I complete this week? (auto-populated from tasks)
- 🔄 What carried over — and why?
- ⚡ Energy this week: 1–5 slider
- 🔁 Habit check-in (auto-populated — days completed vs expected)
- 🌊 Flow summary (sessions, deep work hours, avg quality)
- 🎯 Top 3 priorities for next week
- 💎 Values check: "Did this week reflect what matters to you?"

### Monthly Review
- Progress % on each active project goal
- Habit consistency rate per repetitive goal
- One goal to **pause or drop** (intentional declutter)
- One insight: What did I learn about how I work?
- Capacity re-check

### Quarterly Review
- Full goal audit: On track / At risk / Achieved / Dropped
- Life area balance check (back to the mind map)
- Re-prioritisation
- Reflection: What am I most proud of? What do I want to do differently?

### Annual Review
- Year-in-review: goals achieved, habits built, lessons learned
- Celebration ritual 🎉
- Open new Ikigai Journey for the coming year

---

## Part 8 — Application Tabs

| Tab | Purpose |
|---|---|
| 🌸 Ikigai | Annual identity exploration |
| 🗺️ Mind Map | Goal discovery and life area mapping |
| 🎯 Goals | SMART goal list + habit cards |
| 📅 Calendar | Scheduled goals, milestones, recurring blocks |
| 🌊 Flow | Flow timer — daily execution |
| ✅ Tasks | Daily and weekly task execution view |
| 🔄 Reviews | Weekly / Monthly / Quarterly / Annual |
| 📊 Dashboard | North Star, progress overview, streaks, flow insights |

---

## Part 9 — Design Principles

1. **Flow over friction** — every screen reduces cognitive load
2. **Constraint is freedom** — enforces healthy limits (max 3 deep work goals)
3. **Energy-aware scheduling** — right task, right time, right state
4. **Close the loop** — no planning without review
5. **Celebrate progress** — small wins are surfaced, not buried
6. **Contemplative screens are different** — Ikigai rooms use serif fonts, off-white, no distracting UI

---

## Part 10 — Design System

### Colours
- Primary teal: `#0D6E6E`
- Amber: `#F5A623`
- Coral: `#E8705A`
- Off-white: `#FAFAF8`
- Dark: `#1A1A2E`

### Typography
- UI / functional screens: Inter
- Contemplative screens (Ikigai rooms, North Star): Georgia (serif)

---

## Part 11 — Recommended Reading

| Book | Why Relevant |
|---|---|
| Getting Things Done — David Allen | Foundation of capture-to-action |
| Atomic Habits — James Clear | Repetitive goals layer |
| Your Best Year Ever — Michael Hyatt | Direct annual planning parallel |
| Flow — Mihaly Csikszentmihalyi | Theoretical backbone of the app |
| Measure What Matters — John Doerr | OKR goal hierarchy |
| The ONE Thing — Keller & Papasan | 3-active-project constraint |
| Deep Work — Cal Newport | Energy-aware scheduling philosophy |
| The 12 Week Year — Moran & Lennington | Counter-argument to annual planning (quarterly urgency) |
| Rethinking Positive Thinking — Oettingen | WOOP framework |
| The Happiness Trap — Russ Harris | ACT values clarification |
| Tiny Habits — BJ Fogg | Celebration ritual as neurological habit wiring |
| Essentialism — Greg McKeown | Capacity constraints philosophy |

---

## Competitor Landscape

| Competitor | Overlap | Gap vs Flowkigai |
|---|---|---|
| Griply | Goals + habits + tasks hierarchy | No Ikigai, no annual ceremony, no WOOP |
| Notion | Flexible goal tracking | Blank canvas, not opinionated |
| Full Focus Planner | Annual planning, weekly review | Paper-based, no energy layer |
| Ayoa | Mind mapping + tasks | Project/team focused, not personal annual |
| Sunsama | Daily planning + weekly review | No annual/identity layer |
| Reclaim / Motion | AI calendar scheduling | No philosophy layer |

**The gap nobody has filled:** A guided, opinionated, personal annual planning experience — not a template, not a blank canvas — that walks a person through the full cycle from open exploration to daily execution to honest review.
