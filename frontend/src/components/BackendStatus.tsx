import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  IconButton,
  Collapse,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { healthApi, type HealthStatus } from '../services/api';

interface BackendStatusProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({ 
  compact = false, 
  showDetails = false 
}) => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(showDetails);
  const [error, setError] = useState<string | null>(null);

  const checkBackendHealth = async () => {
    try {
      setStatus('checking');
      setError(null);
      
      const response = await healthApi.check();
      setHealthData(response.data);
      setStatus('connected');
      setLastChecked(new Date());
    } catch (err: unknown) {
      setStatus('disconnected');
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setHealthData(null);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    checkBackendHealth();

    // Set up periodic health checks every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle color="success" />;
      case 'disconnected':
        return <Error color="error" />;
      case 'checking':
        return <Warning color="warning" />;
      default:
        return <Warning color="warning" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      case 'checking':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Backend Connected';
      case 'disconnected':
        return 'Backend Disconnected';
      case 'checking':
        return 'Checking Connection...';
      default:
        return 'Unknown Status';
    }
  };

  if (compact) {
    return (
      <Tooltip title={`${getStatusText()}${lastChecked ? ` - Last checked: ${lastChecked.toLocaleTimeString()}` : ''}`}>
                  <Chip
            icon={getStatusIcon()}
            label={status === 'connected' ? 'Online' : status === 'disconnected' ? 'Offline' : 'Checking'}
            color={getStatusColor() as 'success' | 'error' | 'warning' | 'default'}
            size="small"
            variant="outlined"
          />
      </Tooltip>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ pb: expanded ? 2 : '16px !important' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            {getStatusIcon()}
            <Typography variant="h6" component="div">
              {getStatusText()}
            </Typography>
            {status === 'connected' && healthData && (
              <Chip
                label={`${healthData.activeRuns} active runs`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh connection status">
              <IconButton 
                onClick={checkBackendHealth} 
                disabled={status === 'checking'}
                size="small"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box mt={2}>
            {lastChecked && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last checked: {lastChecked.toLocaleString()}
              </Typography>
            )}
            
            {status === 'connected' && healthData && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  <strong>Server Status:</strong> {healthData.status}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Server Time:</strong> {new Date(healthData.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Active Runs:</strong> {healthData.activeRuns}
                </Typography>
              </Box>
            )}
            
            {status === 'disconnected' && error && (
              <Box>
                <Typography variant="body2" color="error" gutterBottom>
                  <strong>Error:</strong> {error}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please check if the backend server is running on the expected port.
                </Typography>
              </Box>
            )}
            
            {status === 'checking' && (
              <Typography variant="body2" color="text.secondary">
                Attempting to connect to backend server...
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default BackendStatus; 