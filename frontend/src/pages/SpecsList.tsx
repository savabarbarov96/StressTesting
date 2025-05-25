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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { specsApi, runsApi, type Spec } from '../services/api';

const SpecsList: React.FC = () => {
  const navigate = useNavigate();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningSpecs, setRunningSpecs] = useState<Set<string>>(new Set());

  const loadSpecs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await specsApi.getAll();
      setSpecs(response.data.specs);
    } catch (err) {
      setError('Failed to load test specifications');
      console.error('Error loading specs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpec = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test specification?')) {
      return;
    }

    try {
      await specsApi.delete(id);
      setSpecs(specs.filter(spec => spec._id !== id));
    } catch (err) {
      setError('Failed to delete test specification');
      console.error('Error deleting spec:', err);
    }
  };

  const handleRunSpec = async (specId: string) => {
    if (!specId) return;

    try {
      setRunningSpecs(prev => new Set(prev).add(specId));
      const response = await runsApi.start(specId);
      
      // Navigate to the run dashboard
      navigate(`/runs/${response.data.runId}`);
    } catch (err) {
      setError('Failed to start load test');
      console.error('Error starting run:', err);
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

  useEffect(() => {
    loadSpecs();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
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
    </Box>
  );
};

export default SpecsList; 