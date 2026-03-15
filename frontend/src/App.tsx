import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
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
import Discussions from './pages/Discussions';
import DiscussionDetail from './pages/DiscussionDetail';
import UsernameSetup from './pages/UsernameSetup';
import UserProfile from './pages/UserProfile';
import Doubts from './pages/Doubts';
import DoubtChat from './pages/DoubtChat';

// Animated outlet — re-mounts on route change
const AnimatedOutlet: React.FC = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
      <Outlet />
    </div>
  );
};

// Layout with sidebar
const AppLayout: React.FC = () => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">
      <AnimatedOutlet />
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

        {/* Username setup — full screen, no sidebar */}
        <Route
          path="/setup-username"
          element={
            <ProtectedRoute>
              <UsernameSetup />
            </ProtectedRoute>
          }
        />

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
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/discussions/:id" element={<DiscussionDetail />} />
          <Route path="/doubts" element={<Doubts />} />
          <Route path="/doubts/:id" element={<DoubtChat />} />
          <Route path="/user/:id" element={<UserProfile />} />
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
