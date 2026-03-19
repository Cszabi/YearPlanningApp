import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Typography, Stack, Paper, Select, MenuItem, FormControl,
  InputLabel, TextField, CircularProgress, Alert, Button, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer,
} from "recharts";
import { analyticsApi } from "@/api/analyticsApi";

const TRACKED_PAGES = [
  "/ikigai", "/map", "/goals", "/goals/:goalId",
  "/calendar", "/flow", "/tasks", "/reviews", "/dashboard", "/settings",
];

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function fmtSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
    </Paper>
  );
}

export default function AnalyticsDashboardPage() {
  const defaults = defaultDates();
  const [page, setPage] = useState(TRACKED_PAGES[0]);
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [query, setQuery] = useState({
    page: TRACKED_PAGES[0],
    fromDate: defaults.from,
    toDate: defaults.to,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics", "page", query.page, query.fromDate, query.toDate],
    queryFn: () => analyticsApi.getPageAnalytics(query.page, query.fromDate, query.toDate),
  });

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default" }}>

      {/* ── Header / filters ──────────────────────────────────────────────── */}
      <Box sx={{
        position: "sticky", top: 0, zIndex: 10,
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
        px: 3, py: 1.5,
      }}>
        <Typography variant="h6" fontWeight={700} mb={1.5}>Page Analytics</Typography>
        <Stack direction="row" gap={2} alignItems="flex-end" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Page</InputLabel>
            <Select value={page} label="Page" onChange={(e) => setPage(e.target.value)}>
              {TRACKED_PAGES.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small" label="From" type="date"
            value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small" label="To" type="date"
            value={toDate} onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={() => setQuery({ page, fromDate, toDate })}
            sx={{ borderRadius: 2 }}
          >
            Apply
          </Button>
        </Stack>
      </Box>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <Box sx={{ px: 3, py: 3, maxWidth: 900, mx: "auto" }}>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert
            severity="error"
            action={<Button size="small" onClick={() => refetch()}>Retry</Button>}
          >
            Failed to load analytics data.
          </Alert>
        )}

        {data && (
          <Stack gap={3}>

            {/* Summary stats */}
            <Stack direction="row" gap={2} flexWrap="wrap">
              <StatCard label="Avg Duration" value={fmtSeconds(data.averageDurationSeconds)} />
              <StatCard label="Median Duration" value={fmtSeconds(data.medianDurationSeconds)} />
              <StatCard label="Total Sessions" value={data.totalSessions} />
              <StatCard label="Unique Users" value={data.uniqueUsers} />
              <StatCard label="Drop-off Rate" value={`${Math.round(data.dropOffRate * 100)}%`} />
            </Stack>

            <Divider />

            {/* Duration distribution */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>
                Session Duration Distribution
              </Typography>
              {data.durationBuckets.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.durationBuckets} margin={{ left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ChartTooltip />
                    <Bar dataKey="count" fill="#0D6E6E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.disabled">No session data yet.</Typography>
              )}
            </Box>

            <Divider />

            {/* Top actions table */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>
                Top Actions
              </Typography>
              {data.topActions.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">% of Sessions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topActions.map((a) => (
                      <TableRow key={a.actionType}>
                        <TableCell>
                          <Chip label={a.actionType} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{a.count}</TableCell>
                        <TableCell align="right">
                          {Math.round(a.percentOfSessions * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.disabled">No actions recorded yet.</Typography>
              )}
            </Box>

          </Stack>
        )}
      </Box>
    </Box>
  );
}
