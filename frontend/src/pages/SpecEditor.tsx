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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import { 
  Save, 
  ArrowBack, 
  Http, 
  Settings, 
  Timeline, 
  Preview,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { specsApi } from '../services/api';
import LoadProfileForm from '../components/LoadProfileForm';
import SimpleLoadChart from '../components/SimpleLoadChart';

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
    requestsPerSecond: yup.number().min(0.1, 'Must be at least 0.1').optional(),
    testType: yup.string().oneOf(['smoke', 'load', 'stress', 'spike', 'soak']).optional(),
  }),
});

const steps = ['Basic Info', 'Request Config', 'Load Profile', 'Review'];

const SpecEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

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
        rampUp: 30,
        users: 10,
        steady: 60,
        rampDown: 30,
        requestsPerSecond: 1,
        testType: 'load' as const,
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
        loadProfile: {
          ...spec.loadProfile,
          requestsPerSecond: spec.loadProfile.requestsPerSecond || 1,
          testType: spec.loadProfile.testType || 'load',
        },
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

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings />
              Basic Information
            </Typography>
            <TextField
              fullWidth
              name="name"
              label="Test Specification Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              margin="normal"
              placeholder="e.g., API Load Test - User Authentication"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choose a descriptive name that clearly identifies the purpose of this test.
            </Typography>
          </Paper>
        );

      case 1:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Http />
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
                  label="Target URL"
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
                  rows={6}
                  margin="normal"
                  placeholder='{"key": "value"}'
                  helperText="Optional: JSON payload for POST/PUT requests"
                />
              </Grid>
            </Grid>
          </Paper>
        );

      case 2:
        return (
          <Box>
            <LoadProfileForm
              loadProfile={formik.values.loadProfile}
              onChange={(loadProfile) => formik.setFieldValue('loadProfile', loadProfile)}
              errors={{
                rampUp: formik.touched.loadProfile?.rampUp && formik.errors.loadProfile?.rampUp ? String(formik.errors.loadProfile.rampUp) : undefined,
                users: formik.touched.loadProfile?.users && formik.errors.loadProfile?.users ? String(formik.errors.loadProfile.users) : undefined,
                steady: formik.touched.loadProfile?.steady && formik.errors.loadProfile?.steady ? String(formik.errors.loadProfile.steady) : undefined,
                rampDown: formik.touched.loadProfile?.rampDown && formik.errors.loadProfile?.rampDown ? String(formik.errors.loadProfile.rampDown) : undefined,
              }}
            />
            <Box sx={{ mt: 3 }}>
              <SimpleLoadChart loadProfile={formik.values.loadProfile} />
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Preview />
                Test Specification Review
              </Typography>
              
              <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Basic Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Name: {formik.values.name || 'Not specified'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Request Config */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Request Configuration
                      </Typography>
                      <Stack spacing={1}>
                        <Chip 
                          label={formik.values.request.method} 
                          color="primary" 
                          size="small" 
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          {formik.values.request.url || 'No URL specified'}
                        </Typography>
                        {formik.values.request.body && (
                          <Typography variant="body2" color="text.secondary">
                            Has request body
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Load Profile Summary */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Load Profile Summary
                      </Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Chip 
                          label={`${formik.values.loadProfile.testType?.toUpperCase()} Test`}
                          color="secondary"
                        />
                        <Chip 
                          label={`${formik.values.loadProfile.users} Users`}
                          variant="outlined"
                        />
                        <Chip 
                          label={`${formik.values.loadProfile.requestsPerSecond} RPS/User`}
                          variant="outlined"
                        />
                        <Chip 
                          label={`${formik.values.loadProfile.rampUp + formik.values.loadProfile.steady + formik.values.loadProfile.rampDown}s Total`}
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>

            {/* Validation Status */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Validation Status
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {formik.values.name ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <ErrorIcon color="error" fontSize="small" />
                  )}
                  <Typography variant="body2">
                    Test name: {formik.values.name ? 'Valid' : 'Required'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {formik.values.request.url ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <ErrorIcon color="error" fontSize="small" />
                  )}
                  <Typography variant="body2">
                    Target URL: {formik.values.request.url ? 'Valid' : 'Required'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" fontSize="small" />
                  <Typography variant="body2">
                    Load profile: Valid
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
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

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Form Content */}
      <form onSubmit={formik.handleSubmit}>
        {getStepContent(activeStep)}

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep < steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  (activeStep === 0 && !formik.values.name) ||
                  (activeStep === 1 && (!formik.values.request.url || !formik.values.request.method))
                }
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                disabled={saving || !formik.isValid}
              >
                {saving ? 'Saving...' : (isEditing ? 'Update Specification' : 'Create Specification')}
              </Button>
            )}
          </Box>
        </Box>
      </form>
    </Box>
  );
};

export default SpecEditor; 