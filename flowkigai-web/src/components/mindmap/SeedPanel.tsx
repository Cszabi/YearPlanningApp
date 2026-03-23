import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert, Box, Button, CircularProgress, IconButton, Paper,
  Stack, TextField, Typography, useMediaQuery,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { ikigaiApi, type IkigaiJourneyDto } from "@/api/ikigaiApi";
import { mindMapApi, type MindMapNodeDto } from "@/api/mindMapApi";
import { useMindMapSeedStore } from "@/stores/mindMapSeedStore";

const YEAR = new Date().getFullYear();

const QUESTIONS = [
  "What area of life matters most to you right now?",
  "What's been on your mind lately — goals, challenges, or dreams?",
  "What activities make you lose track of time?",
  "What would you focus on if money wasn't a concern?",
  "Name one thing you want to be different 12 months from now.",
  "Anything else you'd like your mind map to reflect?",
];

interface SeedPanelProps {
  apiNodes: MindMapNodeDto[];
  onNodesAdded: () => void;
}

export default function SeedPanel({ apiNodes, onNodesAdded }: SeedPanelProps) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 600px)");

  const {
    step,
    answers,
    currentAnswerInput,
    proposedNodes,
    seedSummary,
    setStep,
    setPath,
    addAnswer,
    setProposedNodes,
    removeProposedNode,
    editProposedNodeLabel,
    setCurrentAnswerInput,
    reset,
  } = useMindMapSeedStore();

  const [journey, setJourney] = useState<IkigaiJourneyDto | null | "loading">("loading");
  const [genError, setGenError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const nonRootNodes = apiNodes.filter((n) => n.nodeType !== "Root");
  const existingNodeLabels = nonRootNodes.map((n) => n.label);

  // Fetch ikigai journey when panel opens
  useEffect(() => {
    ikigaiApi
      .getJourney(YEAR)
      .then((j) => setJourney(j))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) setJourney(null);
        else setJourney(null);
      });
  }, []);

  // Auto-focus answer input when question changes
  useEffect(() => {
    if (step === "questions") {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [step, answers.length]);

  const hasIkigai =
    journey !== "loading" && journey !== null && journey.northStar !== null;

  async function generate(
    path: "practical" | "ikigai",
    allAnswers: { question: string; answer: string }[]
  ) {
    setStep("generating");
    setGenError(null);
    const minWait = new Promise<void>((r) => setTimeout(r, 1500));
    try {
      const [result] = await Promise.all([
        mindMapApi.seedMap(path, allAnswers, existingNodeLabels),
        minWait,
      ]);
      setProposedNodes(result.proposedNodes, result.seedSummary);
      setStep("proposal");
    } catch {
      setGenError("Could not generate nodes. Please try again.");
      setStep(path === "ikigai" ? "path-choice" : "questions");
    }
  }

  function handlePathChoice(chosen: "practical" | "ikigai") {
    setPath(chosen);
    if (chosen === "ikigai" && journey && journey !== "loading") {
      const ikigaiAnswers: { question: string; answer: string }[] = [];
      if (journey.northStar?.statement) {
        ikigaiAnswers.push({
          question: "What is your life purpose / North Star?",
          answer: journey.northStar.statement,
        });
      }
      const roomLabels: Record<string, string> = {
        Love: "What do you love doing?",
        GoodAt: "What are you good at?",
        WorldNeeds: "What does the world need that you can provide?",
        PaidFor: "What can you be paid for?",
      };
      for (const room of journey.rooms) {
        const q = roomLabels[room.roomType];
        if (q && room.answers.length > 0) {
          ikigaiAnswers.push({ question: q, answer: room.answers.join("; ") });
        }
      }
      generate("ikigai", ikigaiAnswers);
    } else {
      setStep("questions");
    }
  }

  function handleAnswerSubmit() {
    const answer = currentAnswerInput.trim();
    if (!answer) return;
    const question = QUESTIONS[answers.length];
    addAnswer({ question, answer });
    if (answers.length + 1 >= QUESTIONS.length) {
      generate("practical", [...answers, { question, answer }]);
    }
  }

  async function handleAddToMap() {
    setAdding(true);
    try {
      await mindMapApi.batchCreateNodes(YEAR, proposedNodes);
      reset();
      onNodesAdded();
    } catch {
      // keep panel open so user can retry
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      {/* Dimming backdrop — click to close */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "rgba(0,0,0,0.35)",
          zIndex: 800,
        }}
        onClick={() => reset()}
      />

      {/* Slide-in panel */}
      <Paper
        elevation={8}
        sx={
          isMobile
            ? {
                position: "absolute",
                inset: 0,
                zIndex: 900,
                display: "flex",
                flexDirection: "column",
                borderRadius: 0,
              }
            : {
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 420,
                zIndex: 900,
                display: "flex",
                flexDirection: "column",
                borderRadius: 0,
                borderLeft: "1px solid",
                borderColor: "divider",
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoFixHighIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="subtitle2" fontWeight={600}>
              Seed with AI
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => reset()}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
          {/* Warning */}
          {step === "warning" && (
            <Stack spacing={3}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Your map already has {nonRootNodes.length} node
                {nonRootNodes.length !== 1 ? "s" : ""}. The AI will add new nodes alongside your
                existing ones.
              </Alert>
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => reset()}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={() => setStep("path-choice")}>
                  Continue →
                </Button>
              </Stack>
            </Stack>
          )}

          {/* Path choice — loading */}
          {step === "path-choice" && journey === "loading" && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {/* Path choice — PATH A (no Ikigai) */}
          {step === "path-choice" && journey !== "loading" && !hasIkigai && (
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                You haven't completed your Ikigai journey yet. How would you like to seed your map?
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: "pointer",
                  borderRadius: 2,
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
                onClick={() => navigate("/ikigai")}
              >
                <Typography fontWeight={600} fontSize={14}>
                  🌸 Do the Ikigai journey first
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Recommended — builds a deeply personal map from your values
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: "pointer",
                  borderRadius: 2,
                  "&:hover": { borderColor: "secondary.main", bgcolor: "action.hover" },
                }}
                onClick={() => handlePathChoice("practical")}
              >
                <Typography fontWeight={600} fontSize={14}>
                  ✦ Answer practical questions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  6 quick questions about your goals and focus areas
                </Typography>
              </Paper>
              {genError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {genError}
                </Alert>
              )}
            </Stack>
          )}

          {/* Path choice — PATH B (has Ikigai) */}
          {step === "path-choice" && journey !== "loading" && hasIkigai && (
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                Your Ikigai insights are ready to use as the foundation for your mind map.
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: "pointer",
                  borderRadius: 2,
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
                onClick={() => handlePathChoice("ikigai")}
              >
                <Typography fontWeight={600} fontSize={14}>
                  ✨ Use my Ikigai themes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Generate nodes from your completed Ikigai journey
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: "pointer",
                  borderRadius: 2,
                  "&:hover": { borderColor: "secondary.main", bgcolor: "action.hover" },
                }}
                onClick={() => handlePathChoice("practical")}
              >
                <Typography fontWeight={600} fontSize={14}>
                  ✦ Answer fresh questions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  6 questions about what matters to you right now
                </Typography>
              </Paper>
              {genError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {genError}
                </Alert>
              )}
            </Stack>
          )}

          {/* Questions */}
          {step === "questions" && (
            <Stack spacing={2}>
              {/* Previous Q&A history */}
              {answers.map((qa, i) => (
                <Box key={i}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    {qa.question}
                  </Typography>
                  <Box sx={{ bgcolor: "action.hover", borderRadius: 2, px: 2, py: 1 }}>
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      {qa.answer}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {/* Current question */}
              {answers.length < QUESTIONS.length && (
                <Box>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 1.5 }}>
                    {answers.length + 1} / {QUESTIONS.length} — {QUESTIONS[answers.length]}
                  </Typography>
                  <TextField
                    inputRef={inputRef}
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={6}
                    placeholder="Type your answer…"
                    value={currentAnswerInput}
                    onChange={(e) => setCurrentAnswerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAnswerSubmit();
                      }
                    }}
                    size="small"
                  />
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="caption" color="text.disabled">
                      Enter to submit · Shift+Enter new line
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!currentAnswerInput.trim()}
                      onClick={handleAnswerSubmit}
                      sx={{ borderRadius: 3, minWidth: 80 }}
                    >
                      {answers.length < QUESTIONS.length - 1 ? "Next →" : "Generate ✨"}
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* All answered but generation failed */}
              {answers.length >= QUESTIONS.length && (
                <Box>
                  {genError && (
                    <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
                      {genError}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => generate("practical", answers)}
                    sx={{ borderRadius: 3 }}
                  >
                    Retry generation ✨
                  </Button>
                </Box>
              )}
            </Stack>
          )}

          {/* Generating */}
          {step === "generating" && (
            <Stack alignItems="center" spacing={2.5} sx={{ py: 5 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Building your mind map nodes…
              </Typography>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                This may take a few seconds
              </Typography>
            </Stack>
          )}

          {/* Proposal */}
          {step === "proposal" && (
            <Stack spacing={2}>
              {seedSummary && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", pb: 0.5 }}
                >
                  {seedSummary}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                Review nodes before adding. Click any label to edit.
              </Typography>
              <Stack spacing={0.75}>
                {proposedNodes.map((node, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ pl: node.nodeType === "Leaf" ? 2.5 : 0 }}
                  >
                    <Typography
                      sx={{ fontSize: 10, opacity: 0.4, minWidth: 14, userSelect: "none" }}
                    >
                      {node.nodeType === "Branch" ? "▶" : "◦"}
                    </Typography>
                    <TextField
                      value={node.label}
                      onChange={(e) => editProposedNodeLabel(i, e.target.value)}
                      variant="standard"
                      size="small"
                      sx={{ flex: 1 }}
                      inputProps={{ maxLength: 80 }}
                    />
                    {node.icon && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {node.icon}
                      </Typography>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => removeProposedNode(i)}
                      sx={{ opacity: 0.4, "&:hover": { opacity: 1 }, flexShrink: 0 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              {proposedNodes.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  textAlign="center"
                  sx={{ py: 2 }}
                >
                  All nodes removed.
                </Typography>
              )}
            </Stack>
          )}
        </Box>

        {/* Footer — only for proposal step */}
        {step === "proposal" && proposedNodes.length > 0 && (
          <Stack
            sx={{
              px: 2.5,
              py: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
            spacing={1}
          >
            <Button
              variant="contained"
              fullWidth
              onClick={handleAddToMap}
              disabled={adding}
              sx={{ borderRadius: 3 }}
            >
              {adding
                ? "Adding…"
                : `Add ${proposedNodes.length} node${proposedNodes.length !== 1 ? "s" : ""} to my map`}
            </Button>
            <Button variant="text" size="small" onClick={() => reset()} sx={{ borderRadius: 3 }}>
              Discard
            </Button>
          </Stack>
        )}
      </Paper>
    </>
  );
}
