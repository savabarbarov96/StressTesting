import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { 
  Save, 
  ArrowBack, 
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { specsApi } from '../services/api';
import EnhancedLoadProfileForm from '../components/EnhancedLoadProfileForm';

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

const SpecEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingRequest, setTestingRequest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status?: number;
    statusText?: string;
    responseTime?: number;
    error?: string;
    browserTest?: boolean;
  } | null>(null);

  const formik = useFormik({
    initialValues: {
      name: '',
      request: {
        method: 'GET' as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        url: '',
        headers: {} as Record<string, string>,
        queryParams: {} as Record<string, string>,
        body: '',
      },
      loadProfile: {
        rampUp: 30,
        users: 10,
        steady: 60,
        rampDown: 30,
        requestsPerSecond: 1,
        testType: 'load' as 'smoke' | 'load' | 'stress' | 'spike' | 'soak',
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
        request: {
          ...spec.request,
          headers: spec.request.headers || {},
          queryParams: spec.request.queryParams || {},
          body: spec.request.body || '',
        },
        loadProfile: {
          ...spec.loadProfile,
          requestsPerSecond: (spec.loadProfile as any).requestsPerSecond || 1,
          testType: (spec.loadProfile as any).testType || 'load',
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

  const handleTestRequest = async (): Promise<{ success: boolean; status?: number; responseTime?: number; error?: string }> => {
    if (!formik.values.request.url || !formik.values.request.method) {
      setError('Please provide both URL and method before testing');
      return { success: false, error: 'Please provide both URL and method before testing' };
    }

    setTestingRequest(true);
    setTestResult(null);
    setError(null);

    try {
      const startTime = Date.now();
      
      // Test directly from browser (works for CORS-enabled endpoints)
      const requestOptions: RequestInit = {
        method: formik.values.request.method,
        headers: {
          'Content-Type': 'application/json',
          ...formik.values.request.headers,
        },
      };

      // Add query parameters to URL if present
      let testUrl = formik.values.request.url;
      if (formik.values.request.queryParams && Object.keys(formik.values.request.queryParams).length > 0) {
        const url = new URL(formik.values.request.url);
        Object.entries(formik.values.request.queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
        testUrl = url.toString();
      }

      if (formik.values.request.body && 
          ['POST', 'PUT', 'PATCH'].includes(formik.values.request.method)) {
        requestOptions.body = formik.values.request.body;
      }

      const response = await fetch(testUrl, requestOptions);
      const responseTime = Date.now() - startTime;

      const result = {
        success: response.ok,
        status: response.status,
        responseTime,
      };

      setTestResult({
        ...result,
        statusText: response.statusText,
      });

      return result;
    } catch (err) {
      const result = {
        success: false,
        error: err instanceof Error ? err.message : 'Network error occurred',
        responseTime: 0,
      };

      setTestResult(result);
      return result;
    } finally {
      setTestingRequest(false);
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
            {isEditing ? 'Edit Test Specification' : 'Create Test Specification'}
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={() => formik.handleSubmit()}
          disabled={saving || !formik.isValid}
          size="large"
        >
          {saving ? 'Saving...' : isEditing ? 'Update Spec' : 'Create Spec'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Enhanced Load Profile Form */}
      <EnhancedLoadProfileForm
        spec={formik.values}
        onChange={(spec) => formik.setValues(spec)}
        onTestRequest={handleTestRequest}
        testResult={testResult}
        isTestingRequest={testingRequest}
        errors={{
          name: formik.touched.name && formik.errors.name ? formik.errors.name : undefined,
          'request.url': formik.touched.request?.url && formik.errors.request?.url ? formik.errors.request.url : undefined,
          'request.method': formik.touched.request?.method && formik.errors.request?.method ? formik.errors.request.method : undefined,
          'loadProfile.rampUp': formik.touched.loadProfile?.rampUp && formik.errors.loadProfile?.rampUp ? String(formik.errors.loadProfile.rampUp) : undefined,
          'loadProfile.users': formik.touched.loadProfile?.users && formik.errors.loadProfile?.users ? String(formik.errors.loadProfile.users) : undefined,
          'loadProfile.steady': formik.touched.loadProfile?.steady && formik.errors.loadProfile?.steady ? String(formik.errors.loadProfile.steady) : undefined,
          'loadProfile.rampDown': formik.touched.loadProfile?.rampDown && formik.errors.loadProfile?.rampDown ? String(formik.errors.loadProfile.rampDown) : undefined,
          'loadProfile.requestsPerSecond': formik.touched.loadProfile?.requestsPerSecond && formik.errors.loadProfile?.requestsPerSecond ? String(formik.errors.loadProfile.requestsPerSecond) : undefined,
        }}
      />
    </Box>
  );
};

export default SpecEditor; 