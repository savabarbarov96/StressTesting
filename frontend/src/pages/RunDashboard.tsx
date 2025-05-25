import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack, Stop } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { runsApi, type Run, type ProgressMetrics } from '../services/api';
import socketService from '../services/socket';

const RunDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const loadRun = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await runsApi.getById(id);
      setRun(response.data.run);
    } catch (err) {
      setError('Failed to load run details');
      console.error('Error loading run:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRun = async () => {
    if (!id || !run) return;

    try {
      await runsApi.stop(id);
      setRun({ ...run, status: 'stopped' });
    } catch (err) {
      setError('Failed to stop run');
      console.error('Error stopping run:', err);
    }
  };

  useEffect(() => {
    if (id) {
      loadRun();
      
      // Join the run room for real-time updates
      socketService.joinRun(id);

      // Set up event listeners
      const handleProgress = (data: ProgressMetrics) => {
        setRun(prev => prev ? { ...prev, progress: data } : null);
      };

      const handleLogLine = (data: { message: string; timestamp: string }) => {
        setLogs(prev => [...prev, `[${new Date(data.timestamp).toLocaleTimeString()}] ${data.message}`]);
      };

      const handleRunCompleted = () => {
        setRun(prev => prev ? { ...prev, status: 'completed' } : null);
      };

      const handleRunFailed = () => {
        setRun(prev => prev ? { ...prev, status: 'failed' } : null);
      };

      const handleRunStopped = () => {
        setRun(prev => prev ? { ...prev, status: 'stopped' } : null);
      };

      socketService.onProgress(handleProgress);
      socketService.onLogLine(handleLogLine);
      socketService.onRunCompleted(handleRunCompleted);
      socketService.onRunFailed(handleRunFailed);
      socketService.onRunStopped(handleRunStopped);

      // Cleanup
      return () => {
        socketService.leaveRun(id);
        socketService.offProgress(handleProgress);
        socketService.offLogLine(handleLogLine);
        socketService.offRunCompleted(handleRunCompleted);
        socketService.offRunFailed(handleRunFailed);
        socketService.offRunStopped(handleRunStopped);
      };
    }
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!run) {
    return (
      <Box>
        <Alert severity="error">Run not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/specs')}
            sx={{ mr: 2 }}
          >
            Back to Specs
          </Button>
          <Typography variant="h4" component="h1">
            Load Test Run
          </Typography>
        </Box>
        
        {run.status === 'running' && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={handleStopRun}
          >
            Stop Run
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Status and Metrics */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Status: {run.status.toUpperCase()}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Current RPS
                    </Typography>
                    <Typography variant="h5">
                      {run.progress.currentRps.toFixed(1)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Requests
                    </Typography>
                    <Typography variant="h5">
                      {run.progress.totalRequests}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Success Rate
                    </Typography>
                    <Typography variant="h5">
                      {run.progress.totalRequests > 0 
                        ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100).toFixed(1)
                        : 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Avg Latency
                    </Typography>
                    <Typography variant="h5">
                      {run.progress.averageLatency.toFixed(0)}ms
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Run Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Run Information
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Run ID:</strong> {run._id}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Started:</strong> {new Date(run.startedAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Elapsed:</strong> {run.progress.elapsedTime}s
            </Typography>
          </Paper>
        </Grid>

        {/* Console Logs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Console Logs
            </Typography>
            <Box
              sx={{
                height: 300,
                overflow: 'auto',
                backgroundColor: '#f5f5f5',
                p: 2,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {logs.length === 0 ? (
                <Typography color="textSecondary">No logs yet...</Typography>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RunDashboard; 