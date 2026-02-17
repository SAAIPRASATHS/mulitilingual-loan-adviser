import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './i18n/config';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import FinancialEducation from './pages/FinancialEducation';
import AgentDashboard from './pages/AgentDashboard';
import ApplyLoan from './pages/ApplyLoan';
import EMICalculator from './pages/EMICalculator';
import LoanComparison from './pages/LoanComparison';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
      light: '#534bae',
      dark: '#000051',
    },
    secondary: {
      main: '#c2185b',
      light: '#fa5788',
      dark: '#8c0032',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/borrower/login" element={<Login role="borrower" />} />
      <Route path="/agent/login" element={<Login role="agent" />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardRedirect />
          </PrivateRoute>
        }
      />
      <Route
        path="/agent/dashboard"
        element={
          <PrivateRoute roles={['agent', 'admin']}>
            <AgentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        }
      />
      <Route
        path="/apply/:loanId"
        element={
          <PrivateRoute>
            <ApplyLoan />
          </PrivateRoute>
        }
      />
      <Route
        path="/emi-calculator"
        element={<EMICalculator />}
      />
      <Route
        path="/comparison"
        element={<LoanComparison />}
      />
      <Route path="/education" element={<FinancialEducation />} />
    </Routes>
  );
}

// Components
import Header from './components/Header';
import ChatFAB from './components/ChatFAB';
import Sidebar from './components/Sidebar';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <AppRoutes />
            <ChatFAB />
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'agent' || user?.role === 'admin') return <Navigate to="/agent/dashboard" />;
  return <Dashboard />;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <DashboardRedirect />;
  return <Home />;
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <DashboardRedirect />;
  return <Login />;
}

export default App;
