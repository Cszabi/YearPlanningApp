import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Tooltip, CircularProgress, Alert, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem,
  Collapse, List, ListItem, ListItemText, Divider, TextField, Paper,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SendIcon from "@mui/icons-material/Send";
import { adminApi, type UserSummaryDto, type UserDetailDto } from "@/api/adminApi";

export default function AdminPage() {
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.getUsers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: "Free" | "Pro" }) =>
      adminApi.updateUserPlan(id, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const [deleteTarget, setDeleteTarget] = useState<UserSummaryDto | null>(null);
  const [planMenuAnchor, setPlanMenuAnchor] = useState<{ el: HTMLElement; user: UserSummaryDto } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [sinceDate, setSinceDate] = useState(today);
  const [rnSubject, setRnSubject] = useState(`Flowkigai — What's new since ${today}`);
  const [rnBody, setRnBody] = useState("");
  const [sentCount, setSentCount] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => adminApi.generateReleaseNotes(sinceDate),
    onSuccess: (html) => { setRnBody(html); setSentCount(null); },
  });

  const announcementMutation = useMutation({
    mutationFn: () => adminApi.sendAnnouncement(rnSubject, rnBody, sinceDate),
    onSuccess: (res) => setSentCount(res.sentCount),
  });

  function handleSinceDateChange(date: string) {
    setSinceDate(date);
    setRnSubject(`Flowkigai — What's new since ${date}`);
    setRnBody("");
    setSentCount(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
  }

  function handlePlanSelect(plan: "Free" | "Pro") {
    if (!planMenuAnchor) return;
    planMutation.mutate({ id: planMenuAnchor.user.id, plan });
    setPlanMenuAnchor(null);
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={() => refetch()}>Retry</Button>}>
          Failed to load users.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: "background.default", minHeight: "100%" }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "baseline", gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          ⚙️ Admin Panel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {users?.length ?? 0} user{users?.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {/* Release Notes */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Send Release Notes
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
          <TextField
            label="Changes since"
            type="date"
            size="small"
            value={sinceDate}
            onChange={(e) => handleSinceDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 180 }}
          />
          <TextField
            label="Subject"
            size="small"
            value={rnSubject}
            onChange={(e) => setRnSubject(e.target.value)}
            sx={{ flex: 1, minWidth: 280 }}
          />
          <Button
            variant="outlined"
            startIcon={generateMutation.isPending ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !sinceDate}
          >
            {generateMutation.isPending ? "Generating…" : "Generate with AI"}
          </Button>
        </Box>
        {generateMutation.isError && (
          <Alert severity="error" sx={{ mt: 1, py: 0 }}>Failed to generate. Check AI API key.</Alert>
        )}
        <TextField
          label="Email body (HTML)"
          multiline
          rows={8}
          fullWidth
          size="small"
          value={rnBody}
          onChange={(e) => { setRnBody(e.target.value); setSentCount(null); }}
          sx={{ mt: 2, fontFamily: "monospace" }}
          slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: "0.78rem" } } }}
          placeholder="Click 'Generate with AI' to auto-populate from git history, or paste HTML manually."
        />
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => announcementMutation.mutate()}
            disabled={announcementMutation.isPending || !sinceDate || !rnSubject || !rnBody}
          >
            {announcementMutation.isPending ? "Sending…" : "Send to users registered before this date"}
          </Button>
          {sentCount !== null && (
            <Alert severity="success" sx={{ py: 0 }}>
              Sent to {sentCount} user{sentCount !== 1 ? "s" : ""}
            </Alert>
          )}
          {announcementMutation.isError && (
            <Alert severity="error" sx={{ py: 0 }}>Failed to send. Try again.</Alert>
          )}
        </Box>
      </Paper>

      {/* Table */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "action.hover" } }}>
              <TableCell />
              <TableCell>Email</TableCell>
              <TableCell>Display Name</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="center">Goals</TableCell>
              <TableCell align="center">Sessions</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(users ?? []).map((user) => (
              <UserRow
                key={user.id}
                user={user}
                expanded={expandedId === user.id}
                onToggleExpand={() => setExpandedId(expandedId === user.id ? null : user.id)}
                onDeleteClick={() => setDeleteTarget(user)}
                onPlanClick={(el) => setPlanMenuAnchor({ el, user })}
              />
            ))}
            {users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Plan menu */}
      <Menu
        anchorEl={planMenuAnchor?.el}
        open={Boolean(planMenuAnchor)}
        onClose={() => setPlanMenuAnchor(null)}
      >
        <MenuItem onClick={() => handlePlanSelect("Free")}>Free</MenuItem>
        <MenuItem onClick={() => handlePlanSelect("Pro")}>Pro</MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>
            Soft-delete <strong>{deleteTarget?.email}</strong>? Their account will be deactivated but data is retained.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

interface UserRowProps {
  user: UserSummaryDto;
  expanded: boolean;
  onToggleExpand: () => void;
  onDeleteClick: () => void;
  onPlanClick: (el: HTMLElement) => void;
}

function UserRow({ user, expanded, onToggleExpand, onDeleteClick, onPlanClick }: UserRowProps) {
  const queryClient = useQueryClient();

  const { data: detail, isLoading: detailLoading } = useQuery<UserDetailDto>({
    queryKey: ["admin", "users", user.id],
    queryFn: () => adminApi.getUserDetail(user.id),
    enabled: expanded,
  });

  const prefetchDetail = () => {
    queryClient.prefetchQuery({
      queryKey: ["admin", "users", user.id],
      queryFn: () => adminApi.getUserDetail(user.id),
    });
  };

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: "pointer", "& td": { borderBottom: expanded ? 0 : undefined } }}
        onClick={onToggleExpand}
        onMouseEnter={prefetchDetail}
      >
        <TableCell sx={{ width: 32 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>{user.displayName}</TableCell>
        <TableCell>
          <Chip
            label={user.plan}
            size="small"
            sx={{
              cursor: "pointer",
              bgcolor: user.plan === "Pro" ? "primary.main" : "action.selected",
              color: user.plan === "Pro" ? "primary.contrastText" : "text.primary",
            }}
            onClick={(e) => { e.stopPropagation(); onPlanClick(e.currentTarget); }}
          />
        </TableCell>
        <TableCell>
          <Chip
            label={user.role}
            size="small"
            variant="outlined"
            color={user.role === "Admin" ? "warning" : "default"}
          />
        </TableCell>
        <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
          {new Date(user.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell align="center">{user.goalCount}</TableCell>
        <TableCell align="center">{user.sessionCount}</TableCell>
        <TableCell align="center">
          <Tooltip title="Delete user">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <TableRow>
        <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, py: 2, bgcolor: "action.hover" }}>
              {detailLoading && <CircularProgress size={20} />}
              {detail && (
                <Box sx={{ display: "flex", gap: 4 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      GOALS ({detail.goalTitles.length})
                    </Typography>
                    {detail.goalTitles.length === 0 ? (
                      <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>None</Typography>
                    ) : (
                      <List dense disablePadding>
                        {detail.goalTitles.map((title, i) => (
                          <ListItem key={i} disablePadding>
                            <ListItemText
                              primary={title}
                              primaryTypographyProps={{ variant: "body2" }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      RECENT FLOW SESSIONS
                    </Typography>
                    {detail.recentSessionDates.length === 0 ? (
                      <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>None</Typography>
                    ) : (
                      <List dense disablePadding>
                        {detail.recentSessionDates.map((date, i) => (
                          <ListItem key={i} disablePadding>
                            <ListItemText
                              primary={new Date(date).toLocaleString()}
                              primaryTypographyProps={{ variant: "body2" }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
