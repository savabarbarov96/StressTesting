import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import socketService from './services/socket';
import Layout from './components/Layout';
import SpecsList from './pages/SpecsList';
import SpecEditor from './pages/SpecEditor';
import RunDashboard from './pages/RunDashboard';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  useEffect(() => {
    // Connect to Socket.io when app starts
    socketService.connect();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Box sx={{ flexGrow: 1, p: 3 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/specs" replace />} />
              <Route path="/specs" element={<SpecsList />} />
              <Route path="/specs/:id/edit" element={<SpecEditor />} />
              <Route path="/specs/new" element={<SpecEditor />} />
              <Route path="/runs/:id" element={<RunDashboard />} />
            </Routes>
          </Box>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
