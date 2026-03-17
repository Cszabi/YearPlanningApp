import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Button, Chip, Typography, Stack, CircularProgress,
  Tabs, Tab, Select, MenuItem, FormControl, InputLabel, Divider, Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { goalApi } from "@/api/goalApi";
import { habitApi } from "@/api/habitApi";
import GoalCard from "@/components/goals/GoalCard";
import HabitCard from "@/components/goals/HabitCard";
import GoalCreationWizard from "@/components/goals/GoalCreationWizard";
import HabitCreationWizard from "@/components/goals/HabitCreationWizard";

const YEAR = new Date().getFullYear();

const LIFE_AREA_OPTIONS = [
  { value: "",                    label: "All areas" },
  { value: "CareerWork",          label: "Career & Work" },
  { value: "HealthBody",          label: "Health & Body" },
  { value: "RelationshipsFamily", label: "Relationships" },
  { value: "LearningGrowth",      label: "Learning & Growth" },
  { value: "Finance",             label: "Finance" },
  { value: "CreativityHobbies",   label: "Creativity & Hobbies" },
  { value: "EnvironmentLifestyle","label": "Environment" },
  { value: "ContributionPurpose", label: "Contribution" },
];

const ENERGY_OPTIONS = [
  { value: "",         label: "All energy levels" },
  { value: "Deep",     label: "🔵 Deep work" },
  { value: "Medium",   label: "🟡 Medium" },
  { value: "Shallow",  label: "⚪ Shallow" },
];

export default function GoalsPage() {
  const [tab, setTab]           = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [showHabitWizard, setShowHabitWizard] = useState(false);
  const [lifeArea, setLifeArea] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");

  const { data: allGoals = [], isLoading: loadingGoals, isError: goalsError, refetch: refetchGoals } = useQuery({
    queryKey: ["goals", YEAR],
    queryFn: () => goalApi.getGoals(YEAR),
  });

  const { data: habits = [], isLoading: loadingHabits, isError: habitsError, refetch: refetchHabits } = useQuery({
    queryKey: ["habits", YEAR],
    queryFn: () => habitApi.getHabits(YEAR),
  });

  // Derived lists
  const activeGoals = allGoals.filter((g) =>
    g.goalType === "Project" &&
    g.status === "Active" &&
    (lifeArea   ? g.lifeArea    === lifeArea    : true) &&
    (energyLevel ? g.energyLevel === energyLevel : true)
  );

  const completedGoals = allGoals.filter((g) =>
    g.status === "Achieved" &&
    (lifeArea    ? g.lifeArea    === lifeArea    : true) &&
    (energyLevel ? g.energyLevel === energyLevel : true)
  );

  const isLoading = loadingGoals || loadingHabits;

  function handleWizardClose() {
    setShowWizard(false);
    refetchGoals();
    refetchHabits();
  }

  function handleHabitWizardClose() {
    setShowHabitWizard(false);
    refetchHabits();
  }

  const onAddClick = () => tab === 1 ? setShowHabitWizard(true) : setShowWizard(true);

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 10,
        bgcolor: "background.paper",
        borderBottom: 1, borderColor: "divider",
        px: 3, py: 1.5,
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Goals {YEAR}</Typography>
            <Typography variant="caption" color="text.disabled">
              {activeGoals.length} active · {habits.length} habits
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={onAddClick} sx={{ borderRadius: 6 }}>
            {tab === 1 ? "New Habit" : "New Goal"}
          </Button>
        </Stack>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36 }}
          TabIndicatorProps={{ style: { height: 2 } }}>
          <Tab label="Active Goals" sx={{ minHeight: 36, py: 0, fontSize: "0.8rem" }} />
          <Tab label={`Habits${habits.length ? ` (${habits.length})` : ""}`} sx={{ minHeight: 36, py: 0, fontSize: "0.8rem" }} />
          <Tab label="Completed" sx={{ minHeight: 36, py: 0, fontSize: "0.8rem" }} />
        </Tabs>
      </Box>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      {tab !== 1 && (
        <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Life area</InputLabel>
            <Select label="Life area" value={lifeArea} onChange={(e) => setLifeArea(e.target.value)}>
              {LIFE_AREA_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Energy level</InputLabel>
            <Select label="Energy level" value={energyLevel} onChange={(e) => setEnergyLevel(e.target.value)}>
              {ENERGY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          {(lifeArea || energyLevel) && (
            <Button size="small" variant="text" onClick={() => { setLifeArea(""); setEnergyLevel(""); }}>
              Clear filters
            </Button>
          )}
        </Box>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <Box sx={{ px: 3, py: 3, maxWidth: 720, mx: "auto" }}>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {(goalsError || habitsError) && !isLoading && (
          <Alert severity="error" sx={{ mb: 3 }}
            action={<Button size="small" onClick={() => { refetchGoals(); refetchHabits(); }}>Retry</Button>}
          >
            Failed to load data. Check your connection.
          </Alert>
        )}

        {/* ── Tab 0: Active Goals ─────────────────────────────────────────── */}
        {!isLoading && tab === 0 && (
          <>
            {activeGoals.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography variant="h2" mb={2}>🎯</Typography>
                <Typography variant="body1" color="text.secondary" mb={1}>No active goals yet</Typography>
                <Typography variant="body2" color="text.disabled" mb={4}>
                  Click "New Goal" to get started
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />}
                  onClick={() => setShowWizard(true)} sx={{ borderRadius: 6 }}>
                  Create your first goal
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
              </Stack>
            )}
          </>
        )}

        {/* ── Tab 1: Habits ───────────────────────────────────────────────── */}
        {!isLoading && tab === 1 && (
          <>
            {habits.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography variant="h2" mb={2}>🔁</Typography>
                <Typography variant="body1" color="text.secondary" mb={1}>No habits yet</Typography>
                <Typography variant="body2" color="text.disabled" mb={4}>
                  Create a Repetitive goal to start tracking habits
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />}
                  onClick={() => setShowHabitWizard(true)} sx={{ borderRadius: 6 }}>
                  Add a habit
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 2 }}>
                {habits.map((h) => <HabitCard key={h.id} habit={h} />)}
              </Box>
            )}
          </>
        )}

        {/* ── Tab 2: Completed ────────────────────────────────────────────── */}
        {!isLoading && tab === 2 && (
          <>
            {completedGoals.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography variant="h2" mb={2}>🏆</Typography>
                <Typography variant="body1" color="text.secondary">Nothing achieved yet</Typography>
                <Typography variant="body2" color="text.disabled">Completed goals will appear here</Typography>
              </Box>
            ) : (
              <>
                <Divider sx={{ mb: 2 }}>
                  <Chip label="Achieved" size="small" color="success" variant="outlined" />
                </Divider>
                <Stack spacing={2}>
                  {completedGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
                </Stack>
              </>
            )}
          </>
        )}
      </Box>

      {showWizard && <GoalCreationWizard onClose={handleWizardClose} />}
      {showHabitWizard && <HabitCreationWizard onClose={handleHabitWizardClose} />}
    </Box>
  );
}
