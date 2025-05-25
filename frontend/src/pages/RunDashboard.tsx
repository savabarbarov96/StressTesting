import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';

import { ArrowBack, Stop, Error as ErrorIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { runsApi, getErrorMessage, getErrorDetails, type Run, type ProgressMetrics } from '../services/api';
import socketService from '../services/socket';

// Define error data interface
interface RunErrorData {
  error?: {
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

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
      console.log(`🔍 Loading run details: ${id}`);
      
      const response = await runsApi.getById(id);
      setRun(response.data.run);
      
      console.log(`✅ Run loaded: ${id} (Status: ${response.data.run.status})`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error loading run:', { errorMessage, errorDetails, originalError: err });
    } finally {
      setLoading(false);
    }
  };

  const handleStopRun = async () => {
    if (!id || !run) return;

    try {
      console.log(`🛑 Stopping run: ${id}`);
      await runsApi.stop(id);
      setRun({ ...run, status: 'stopped' });
      console.log(`✅ Run stopped: ${id}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error stopping run:', { errorMessage, errorDetails, originalError: err });
    }
  };

  const getStatusColor = (status: string): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'stopped':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CircularProgress size={16} />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      default:
        return undefined;
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
        console.log(`✅ Run completed: ${id}`);
        setRun(prev => prev ? { ...prev, status: 'completed' } : null);
        // Reload to get final summary
        setTimeout(loadRun, 1000);
      };

      const handleRunFailed = (error: unknown) => {
        console.error(`❌ Run failed: ${id}`, error);
        const errorData = error as RunErrorData;
        setRun(prev => prev ? { 
          ...prev, 
          status: 'failed',
          error: errorData.error || { 
            message: 'Run failed', 
            timestamp: new Date().toISOString() 
          }
        } : null);
      };

      const handleRunStopped = () => {
        console.log(`🛑 Run stopped: ${id}`);
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
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading run details...
        </Typography>
      </Box>
    );
  }

  if (!run) {
    return (
      <Box>
        <Alert severity="error">
          <Typography variant="subtitle2" gutterBottom>
            Run not found
          </Typography>
          <Typography variant="body2">
            The requested load test run could not be found. It may have been deleted or the ID is incorrect.
          </Typography>
        </Alert>
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
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          <Typography variant="subtitle2" gutterBottom>
            {error}
          </Typography>
        </Alert>
      )}

      {/* Run Error Display */}
      {run.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Run Failed: {run.error.message}
          </Typography>
          {run.error.details && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Details: {`${typeof run.error.details === 'string' ? run.error.details : JSON.stringify(run.error.details || {})}`}
            </Typography>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Failed at: {new Date(run.error.timestamp).toLocaleString()}
          </Typography>
        </Alert>
      )}

      <Box display="flex" gap={3} sx={{ flexWrap: 'wrap' }}>
        {/* Status and Metrics */}
        <Box sx={{ flex: '2 1 600px', minWidth: 600 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ mr: 2 }}>
                Status:
              </Typography>
              <Chip
                label={run.status.toUpperCase()}
                color={getStatusColor(run.status)}
                icon={getStatusIcon(run.status)}
                variant="outlined"
              />
            </Box>
            
            {/* Real-time Metrics Cards */}
            <Box display="flex" gap={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Current RPS
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {run.progress.currentRps.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      requests/second
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Requests
                    </Typography>
                    <Typography variant="h5" color="info.main">
                      {run.progress.totalRequests.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {run.progress.successfulRequests.toLocaleString()} successful, {run.progress.failedRequests.toLocaleString()} failed
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Success Rate
                    </Typography>
                    <Typography variant="h5" color={
                      run.progress.totalRequests > 0 
                        ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100) >= 95 
                          ? 'success.main' 
                          : ((run.progress.successfulRequests / run.progress.totalRequests) * 100) >= 90 
                            ? 'warning.main' 
                            : 'error.main'
                        : 'text.primary'
                    }>
                      {run.progress.totalRequests > 0 
                        ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100).toFixed(1)
                        : 0}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      error rate: {run.progress.totalRequests > 0 
                        ? ((run.progress.failedRequests / run.progress.totalRequests) * 100).toFixed(1)
                        : 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Avg Latency
                    </Typography>
                    <Typography variant="h5" color="warning.main">
                      {run.progress.averageLatency.toFixed(0)}ms
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      response time
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Run Info */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
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
            {run.completedAt && (
              <Typography variant="body2" gutterBottom>
                <strong>Completed:</strong> {new Date(run.completedAt).toLocaleString()}
              </Typography>
            )}
            <Typography variant="body2" gutterBottom>
              <strong>Elapsed:</strong> {run.progress.elapsedTime}s
            </Typography>
            {run.summary && (
              <>
                <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                  <strong>Final Results:</strong>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • Total Requests: {run.summary.totalRequests.toLocaleString()}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • Average RPS: {run.summary.averageRps.toFixed(1)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • P99 Latency: {run.summary.p99Latency}ms
                </Typography>
                <Typography variant="body2" gutterBottom>
                  • Error Rate: {run.summary.errorRate.toFixed(2)}%
                </Typography>
              </>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Console Logs */}
      <Paper sx={{ p: 3, mt: 3 }}>
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
            border: '1px solid #e0e0e0',
            borderRadius: 1,
          }}
        >
          {logs.length === 0 ? (
            <Typography color="textSecondary">No logs yet...</Typography>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '4px' }}>
                {log}
              </div>
            ))
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default RunDashboard; 