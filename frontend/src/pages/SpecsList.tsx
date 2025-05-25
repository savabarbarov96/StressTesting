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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { specsApi, runsApi, getErrorMessage, getErrorDetails, type Spec } from '../services/api';

const SpecsList: React.FC = () => {
  const navigate = useNavigate();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningSpecs, setRunningSpecs] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSpecs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading test specifications...');
      
      const response = await specsApi.getAll();
      setSpecs(response.data.specs);
      
      console.log(`✅ Loaded ${response.data.specs.length} test specifications`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error loading specs:', { errorMessage, errorDetails, originalError: err });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpec = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test specification?')) {
      return;
    }

    try {
      console.log(`🗑️ Deleting spec: ${id}`);
      await specsApi.delete(id);
      setSpecs(specs.filter(spec => spec._id !== id));
      setSuccessMessage('Test specification deleted successfully');
      console.log(`✅ Spec deleted: ${id}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error deleting spec:', { errorMessage, errorDetails, originalError: err });
    }
  };

  const handleRunSpec = async (specId: string) => {
    if (!specId) return;

    try {
      console.log(`🚀 Starting load test for spec: ${specId}`);
      setRunningSpecs(prev => new Set(prev).add(specId));
      setError(null);
      
      const response = await runsApi.start(specId);
      
      console.log(`✅ Load test started: ${response.data.runId}`);
      setSuccessMessage(`Load test started successfully! Run ID: ${response.data.runId}`);
      
      // Navigate to the run dashboard
      navigate(`/runs/${response.data.runId}`);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const errorDetails = getErrorDetails(err);
      
      setError(errorMessage);
      console.error('❌ Error starting run:', { errorMessage, errorDetails, originalError: err });
      
      setRunningSpecs(prev => {
        const newSet = new Set(prev);
        newSet.delete(specId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
      GET: 'primary',
      POST: 'success',
      PUT: 'warning',
      DELETE: 'error',
      PATCH: 'secondary',
    };
    return colors[method] || 'primary';
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  useEffect(() => {
    loadSpecs();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading test specifications...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Test Specifications
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSpecs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/specs/new')}
          >
            New Test Spec
          </Button>
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

      {specs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No test specifications found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first test specification to get started with load testing.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/specs/new')}
          >
            Create Test Spec
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Load Profile</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {specs.map((spec) => (
                <TableRow key={spec._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {spec.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={spec.request.method}
                      color={getMethodColor(spec.request.method)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {spec.request.url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {spec.loadProfile.users} users, {spec.loadProfile.steady}s
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {spec.createdAt ? formatDate(spec.createdAt) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        onClick={() => handleRunSpec(spec._id!)}
                        disabled={runningSpecs.has(spec._id!)}
                        color="primary"
                        title="Run Test"
                      >
                        {runningSpecs.has(spec._id!) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <PlayArrow />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/specs/${spec._id}/edit`)}
                        color="primary"
                        title="Edit"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSpec(spec._id!)}
                        color="error"
                        title="Delete"
                      >
                        <Delete />
                      </IconButton>
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

export default SpecsList; 