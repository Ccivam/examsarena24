import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import UpcomingTests from './pages/UpcomingTests';
import PastTests from './pages/PastTests';
import TestDetail from './pages/TestDetail';
import TestRoom from './pages/TestRoom';
import TestReview from './pages/TestReview';
import TestSubmitted from './pages/TestSubmitted';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Problems from './pages/Problems';
import ProblemSolve from './pages/ProblemSolve';

// Layout with sidebar
const AppLayout: React.FC = () => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">
      <Outlet />
    </main>
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Test room — full screen, no sidebar */}
        <Route
          path="/test/:id/room"
          element={
            <ProtectedRoute>
              <TestRoom />
            </ProtectedRoute>
          }
        />

        {/* Test submitted — no sidebar */}
        <Route
          path="/test/:id/submitted"
          element={
            <ProtectedRoute>
              <TestSubmitted />
            </ProtectedRoute>
          }
        />

        {/* Authenticated routes with sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upcoming" element={<UpcomingTests />} />
          <Route path="/past" element={<PastTests />} />
          <Route path="/test/:id" element={<TestDetail />} />
          <Route path="/test/:id/review" element={<TestReview />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/leaderboard/test/:testId" element={<Leaderboard />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:id" element={<ProblemSolve />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/admin"
            element={<AdminPanel />}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
