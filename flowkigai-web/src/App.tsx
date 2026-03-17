import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import TabNav from "@/components/layout/TabNav";
import AdminGuard from "@/components/layout/AdminGuard";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import IkigaiPage from "@/pages/IkigaiPage";
import MindMapPage from "@/pages/MindMapPage";
import GoalsPage from "@/pages/GoalsPage";
import CalendarPage from "@/pages/CalendarPage";
import FlowPage from "@/pages/FlowPage";
import TasksPage from "@/pages/TasksPage";
import ReviewsPage from "@/pages/ReviewsPage";
import DashboardPage from "@/pages/DashboardPage";
import DocsPage from "@/pages/DocsPage";

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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<TabNav />}>
            <Route path="/" element={<Navigate to="/ikigai" replace />} />
            <Route path="/ikigai" element={<IkigaiPage />} />
            <Route path="/map" element={<MindMapPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/flow" element={<FlowPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
