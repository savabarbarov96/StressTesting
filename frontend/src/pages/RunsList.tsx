import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Refresh,
  Visibility,
  Stop,
  Download,
  Delete,
  PlayArrow,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { runsApi, getErrorMessage, getErrorDetails, type Run, type ProgressMetrics, type RunSummary } from '../services/api';
import socketService from '../services/socket';

const RunsList: React.FC = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stoppingRuns, setStoppingRuns] = useState<Set<string>>(new Set());

  const loadRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading runs...');
      
      const response = await runsApi.getAll();
      setRuns(response.data.runs);
      
      console.log(`✅ Loaded ${response.data.runs.length} runs`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error loading runs:', { errorMessage, errorDetails, originalError: err });
    } finally {
      setLoading(false);
    }
  };

  const handleStopRun = async (runId: string) => {
    try {
      console.log(`🛑 Stopping run: ${runId}`);
      setStoppingRuns(prev => new Set(prev).add(runId));
      setError(null);
      
      await runsApi.stop(runId);
      setSuccessMessage('Run stopped successfully');
      
      // Update the run status locally
      setRuns(prev => prev.map(run => 
        run._id === runId ? { ...run, status: 'stopped' as const } : run
      ));
      
      console.log(`✅ Run stopped: ${runId}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error stopping run:', { errorMessage, errorDetails, originalError: err });
    } finally {
      setStoppingRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!window.confirm('Are you sure you want to delete this run?')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting run: ${runId}`);
      await runsApi.delete(runId);
      setRuns(runs.filter(run => run._id !== runId));
      setSuccessMessage('Run deleted successfully');
      console.log(`✅ Run deleted: ${runId}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error deleting run:', { errorMessage, errorDetails, originalError: err });
    }
  };

  const handleDownloadCsv = async (runId: string) => {
    try {
      console.log(`📊 Downloading CSV for run: ${runId}`);
      const response = await runsApi.downloadCsv(runId);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `run-${runId}-results.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('CSV downloaded successfully');
      console.log(`✅ CSV downloaded for run: ${runId}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error downloading CSV:', { errorMessage, errorDetails, originalError: err });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
      default:
        return undefined;
    }
  };

  const calculateProgress = (run: Run): number => {
    if (run.status === 'completed') return 100;
    if (run.status === 'failed' || run.status === 'stopped') return 0;
    
    // For running tests, calculate based on elapsed time vs expected duration
    const elapsedTime = run.progress?.elapsedTime || 0;
    // Estimate total duration from spec if available, otherwise use a default
    const estimatedDuration = 60; // Default 60 seconds, should come from spec
    return Math.min((elapsedTime / estimatedDuration) * 100, 95); // Cap at 95% for running tests
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  // Set up real-time updates for running runs
  useEffect(() => {
    const runningRuns = runs.filter(run => run.status === 'running');
    
    runningRuns.forEach(run => {
      socketService.joinRun(run._id);
    });

    const handleProgress = (data: ProgressMetrics) => {
      // Note: Socket events don't include runId, so we update all running runs
      // This is a limitation of the current socket implementation
      setRuns(prev => prev.map(run => 
        run.status === 'running' 
          ? { ...run, progress: data }
          : run
      ));
    };

    const handleRunCompleted = (summary: RunSummary) => {
      // Update all running runs to completed status
      setRuns(prev => prev.map(run => 
        run.status === 'running' 
          ? { ...run, status: 'completed' as const, summary }
          : run
      ));
    };

    const handleRunFailed = (error: unknown) => {
      // Update all running runs to failed status
      setRuns(prev => prev.map(run => 
        run.status === 'running' 
          ? { ...run, status: 'failed' as const, error: error as { message: string; details?: unknown; timestamp: string } }
          : run
      ));
    };

    const handleRunStopped = () => {
      // Update all running runs to stopped status
      setRuns(prev => prev.map(run => 
        run.status === 'running' 
          ? { ...run, status: 'stopped' as const }
          : run
      ));
    };

    socketService.onProgress(handleProgress);
    socketService.onRunCompleted(handleRunCompleted);
    socketService.onRunFailed(handleRunFailed);
    socketService.onRunStopped(handleRunStopped);

    return () => {
      runningRuns.forEach(run => {
        socketService.leaveRun(run._id);
      });
      socketService.offProgress(handleProgress);
      socketService.offRunCompleted(handleRunCompleted);
      socketService.offRunFailed(handleRunFailed);
      socketService.offRunStopped(handleRunStopped);
    };
  }, [runs]);

  useEffect(() => {
    loadRuns();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading runs...
        </Typography>
      </Box>
    );
  }

  const runningRuns = runs.filter(run => run.status === 'running');
  const completedRuns = runs.filter(run => run.status === 'completed');
  const failedRuns = runs.filter(run => run.status === 'failed');

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Load Test Runs
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadRuns}
          disabled={loading}
        >
          Refresh
        </Button>
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

      {/* Summary Cards */}
      <Box display="flex" gap={3} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Running
              </Typography>
              <Typography variant="h4" color="primary">
                {runningRuns.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {completedRuns.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">
                {failedRuns.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total
              </Typography>
              <Typography variant="h4">
                {runs.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {runs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No runs found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Start a load test from the Test Specifications page to see runs here.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => navigate('/specs')}
          >
            Go to Test Specs
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Run ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Requests</TableCell>
                <TableCell>RPS</TableCell>
                <TableCell>Success Rate</TableCell>
                <TableCell>Started</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run._id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {run._id.slice(-8)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={run.status.toUpperCase()}
                      color={getStatusColor(run.status)}
                      icon={getStatusIcon(run.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ width: 150 }}>
                    <Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={calculateProgress(run)}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption">
                        {run.progress?.elapsedTime || 0}s elapsed
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {run.progress?.totalRequests?.toLocaleString() || 0}
                    </Typography>
                    {run.progress?.failedRequests > 0 && (
                      <Typography variant="caption" color="error">
                        ({run.progress.failedRequests} failed)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {run.progress?.currentRps?.toFixed(1) || '0.0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2"
                      color={
                        run.progress?.totalRequests > 0 
                          ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100) >= 95 
                            ? 'success.main' 
                            : ((run.progress.successfulRequests / run.progress.totalRequests) * 100) >= 90 
                              ? 'warning.main' 
                              : 'error.main'
                          : 'text.primary'
                      }
                    >
                      {run.progress?.totalRequests > 0 
                        ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100).toFixed(1)
                        : '0.0'}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(run.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/runs/${run._id}`)}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      
                      {run.status === 'running' && (
                        <Tooltip title="Stop Run">
                          <IconButton
                            size="small"
                            onClick={() => handleStopRun(run._id)}
                            disabled={stoppingRuns.has(run._id)}
                            color="error"
                          >
                            {stoppingRuns.has(run._id) ? (
                              <CircularProgress size={20} />
                            ) : (
                              <Stop />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {run.status === 'completed' && run.summary && (
                        <Tooltip title="Download CSV">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadCsv(run._id)}
                            color="primary"
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {run.status !== 'running' && (
                        <Tooltip title="Delete Run">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRun(run._id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}

                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RunsList; 