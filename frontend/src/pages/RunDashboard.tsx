import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

import { 
  ArrowBack, 
  Stop, 
  Error as ErrorIcon, 
  GetApp,
  PictureAsPdf,
  Language,
  TextSnippet,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { runsApi, getErrorMessage, getErrorDetails, type Run, type ProgressMetrics } from '../services/api';
import socketService from '../services/socket';
import RealTimeCharts from '../components/RealTimeCharts';
import EnhancedConsole from '../components/EnhancedConsole';
import { ExportUtils } from '../components/ExportUtils';

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
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    socketService.connect();
    
    // Listen for connection status changes
    const handleConnectionChange = (connected: boolean) => {
      setSocketConnected(connected);
    };
    
    socketService.onConnectionChange(handleConnectionChange);
    
    return () => {
      socketService.offConnectionChange(handleConnectionChange);
      socketService.disconnect();
    };
  }, []);

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

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = async (format: 'pdf' | 'html' | 'logs') => {
    if (!run) return;

    setIsExporting(true);
    handleExportMenuClose();

    try {
      const exportData = {
        run,
        logs,
      };

      switch (format) {
        case 'pdf':
          await ExportUtils.exportToPDF(exportData);
          break;
        case 'html':
          await ExportUtils.exportToHTML(exportData);
          break;
        case 'logs':
          await ExportUtils.exportLogs(logs);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (id && socketConnected) {
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
  }, [id, socketConnected]);

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
          <Chip
            label={run.status.toUpperCase()}
            color={getStatusColor(run.status)}
            icon={getStatusIcon(run.status)}
            variant="outlined"
            sx={{ ml: 2 }}
          />
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
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
          
          <Tooltip title="Export Results">
            <IconButton
              onClick={handleExportMenuOpen}
              disabled={isExporting}
              color="primary"
            >
              {isExporting ? <CircularProgress size={24} /> : <GetApp />}
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
          >
            <MenuItem onClick={() => handleExport('pdf')}>
              <ListItemIcon>
                <PictureAsPdf fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export as PDF</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('html')}>
              <ListItemIcon>
                <Language fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export as HTML</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('logs')}>
              <ListItemIcon>
                <TextSnippet fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export Logs</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
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
      {run.error && (() => {
        const detailsString = run.error.details
          ? (typeof run.error.details === 'string'
            ? run.error.details
            : JSON.stringify(run.error.details, null, 2))
          : '';

        return (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Run Failed: {run.error.message}
            </Typography>
            {detailsString && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Details: {detailsString}
              </Typography>
            )}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Failed at: {new Date(run.error.timestamp).toLocaleString()}
            </Typography>
          </Alert>
        );
      })()}

      {/* Run Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Run Information
        </Typography>
        <Box display="flex" gap={4} sx={{ flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Run ID
            </Typography>
            <Typography variant="body1" fontFamily="monospace">
              {run._id}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Started
            </Typography>
            <Typography variant="body1">
              {new Date(run.startedAt).toLocaleString()}
            </Typography>
          </Box>
          {run.completedAt && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="body1">
                {new Date(run.completedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography variant="body2" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body1">
              {run.progress.elapsedTime}s
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Connection Status
            </Typography>
            <Chip
              label={socketConnected ? 'Connected' : 'Disconnected'}
              color={socketConnected ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        {run.summary && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Final Results
            </Typography>
            <Box display="flex" gap={4} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Requests
                </Typography>
                <Typography variant="h6" color="primary">
                  {run.summary.totalRequests.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Average RPS
                </Typography>
                <Typography variant="h6" color="primary">
                  {run.summary.averageRps.toFixed(1)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  P99 Latency
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {run.summary.p99Latency}ms
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Error Rate
                </Typography>
                <Typography variant="h6" color="error.main">
                  {run.summary.errorRate.toFixed(2)}%
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Real-time Charts */}
      <Box sx={{ mb: 3 }}>
        {run && (
          <RealTimeCharts 
            data={run.progress} 
            status={run.status}
            summary={run.status !== 'running' ? run.summary : undefined}
          />
        )}
      </Box>

      {/* Enhanced Console */}
      <EnhancedConsole
        logs={logs}
        isRunning={run.status === 'running'}
        onExport={() => handleExport('logs')}
      />
    </Box>
  );
};

export default RunDashboard; 