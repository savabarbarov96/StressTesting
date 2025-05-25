import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { specsApi } from '../services/api';

const validationSchema = yup.object({
  name: yup.string().required('Name is required').max(100, 'Name must be less than 100 characters'),
  request: yup.object({
    method: yup.string().required('Method is required'),
    url: yup.string().url('Must be a valid URL').required('URL is required'),
    headers: yup.object(),
    queryParams: yup.object(),
    body: yup.string(),
  }),
  loadProfile: yup.object({
    rampUp: yup.number().min(0, 'Must be 0 or greater').required('Ramp up time is required'),
    users: yup.number().min(1, 'Must be at least 1 user').required('Number of users is required'),
    steady: yup.number().min(0, 'Must be 0 or greater').required('Steady time is required'),
    rampDown: yup.number().min(0, 'Must be 0 or greater').required('Ramp down time is required'),
  }),
});

const SpecEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      request: {
        method: 'GET' as const,
        url: '',
        headers: {},
        queryParams: {},
        body: '',
      },
      loadProfile: {
        rampUp: 0,
        users: 10,
        steady: 60,
        rampDown: 0,
      },
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setSaving(true);
        setError(null);

        if (isEditing && id) {
          await specsApi.update(id, values);
        } else {
          await specsApi.create(values);
        }

        navigate('/specs');
      } catch (err) {
        setError(isEditing ? 'Failed to update test specification' : 'Failed to create test specification');
        console.error('Error saving spec:', err);
      } finally {
        setSaving(false);
      }
    },
  });

  const loadSpec = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await specsApi.getById(id);
      const spec = response.data.spec;
      
      formik.setValues({
        name: spec.name,
        request: spec.request,
        loadProfile: spec.loadProfile,
      });
    } catch (err) {
      setError('Failed to load test specification');
      console.error('Error loading spec:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadSpec();
    }
  }, [id, isEditing]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/specs')}
          sx={{ mr: 2 }}
        >
          Back to Specs
        </Button>
        <Typography variant="h4" component="h1">
          {isEditing ? 'Edit Test Specification' : 'Create Test Specification'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <TextField
                fullWidth
                name="name"
                label="Test Name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                margin="normal"
              />
            </Paper>
          </Grid>

          {/* Request Configuration */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Request Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Method</InputLabel>
                    <Select
                      name="request.method"
                      value={formik.values.request.method}
                      onChange={formik.handleChange}
                      label="Method"
                    >
                      <MenuItem value="GET">GET</MenuItem>
                      <MenuItem value="POST">POST</MenuItem>
                      <MenuItem value="PUT">PUT</MenuItem>
                      <MenuItem value="DELETE">DELETE</MenuItem>
                      <MenuItem value="PATCH">PATCH</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="request.url"
                    label="URL"
                    value={formik.values.request.url}
                    onChange={formik.handleChange}
                    error={formik.touched.request?.url && Boolean(formik.errors.request?.url)}
                    helperText={formik.touched.request?.url && formik.errors.request?.url}
                    margin="normal"
                    placeholder="https://api.example.com/endpoint"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="request.body"
                    label="Request Body (JSON)"
                    value={formik.values.request.body}
                    onChange={formik.handleChange}
                    multiline
                    rows={4}
                    margin="normal"
                    placeholder='{"key": "value"}'
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Load Profile */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Load Profile
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="loadProfile.rampUp"
                    label="Ramp Up (seconds)"
                    type="number"
                    value={formik.values.loadProfile.rampUp}
                    onChange={formik.handleChange}
                    error={formik.touched.loadProfile?.rampUp && Boolean(formik.errors.loadProfile?.rampUp)}
                    helperText={formik.touched.loadProfile?.rampUp && formik.errors.loadProfile?.rampUp}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="loadProfile.users"
                    label="Concurrent Users"
                    type="number"
                    value={formik.values.loadProfile.users}
                    onChange={formik.handleChange}
                    error={formik.touched.loadProfile?.users && Boolean(formik.errors.loadProfile?.users)}
                    helperText={formik.touched.loadProfile?.users && formik.errors.loadProfile?.users}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="loadProfile.steady"
                    label="Steady State (seconds)"
                    type="number"
                    value={formik.values.loadProfile.steady}
                    onChange={formik.handleChange}
                    error={formik.touched.loadProfile?.steady && Boolean(formik.errors.loadProfile?.steady)}
                    helperText={formik.touched.loadProfile?.steady && formik.errors.loadProfile?.steady}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="loadProfile.rampDown"
                    label="Ramp Down (seconds)"
                    type="number"
                    value={formik.values.loadProfile.rampDown}
                    onChange={formik.handleChange}
                    error={formik.touched.loadProfile?.rampDown && Boolean(formik.errors.loadProfile?.rampDown)}
                    helperText={formik.touched.loadProfile?.rampDown && formik.errors.loadProfile?.rampDown}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate('/specs')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                disabled={saving}
              >
                {saving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default SpecEditor; 