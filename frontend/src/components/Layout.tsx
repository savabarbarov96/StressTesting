import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Container,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlayArrow, List, Assessment } from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <PlayArrow sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            LoadForge
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              startIcon={<List />}
              onClick={() => navigate('/specs')}
              sx={{
                backgroundColor: isActive('/specs') ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              Test Specs
            </Button>
            
            <Button
              color="inherit"
              startIcon={<Assessment />}
              onClick={() => navigate('/runs')}
              sx={{
                backgroundColor: isActive('/runs') ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              Runs
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          LoadForge - High-Performance Load Testing Platform
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout; 