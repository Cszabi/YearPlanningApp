import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import TabNav from "@/components/layout/TabNav";
import AdminGuard from "@/components/layout/AdminGuard";
import InstallPromptBanner from "@/components/layout/InstallPromptBanner";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import IkigaiPage from "@/pages/IkigaiPage";
import MindMapPage from "@/pages/MindMapPage";
import GoalsPage from "@/pages/GoalsPage";
import GoalDetailPage from "@/pages/GoalDetailPage";
import CalendarPage from "@/pages/CalendarPage";
import FlowPage from "@/pages/FlowPage";
import TasksPage from "@/pages/TasksPage";
import ReviewsPage from "@/pages/ReviewsPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminPage from "@/pages/AdminPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InstallPromptBanner />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/docs" element={<Navigate to="/" replace />} />

          {/* Protected routes — TabNav redirects to / if not authenticated */}
          <Route element={<TabNav />}>
            <Route path="/ikigai" element={<IkigaiPage />} />
            <Route path="/map" element={<MindMapPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/goals/:goalId" element={<GoalDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/flow" element={<FlowPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
