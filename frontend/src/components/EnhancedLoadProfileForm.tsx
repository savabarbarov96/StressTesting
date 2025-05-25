import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Stack,
  InputAdornment,
  Button,
  Card,
  CardContent,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Speed,
  People,
  Timer,
  TrendingUp,
  Http,
  Add,
  Delete,
  ExpandMore,
  Settings,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface LoadProfile {
  rampUp: number;
  users: number;
  steady: number;
  rampDown: number;
  requestsPerSecond?: number;
  testType?: 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
}

interface TestSpec {
  name: string;
  request: RequestConfig;
  loadProfile: LoadProfile;
}

interface EnhancedLoadProfileFormProps {
  spec: TestSpec;
  onChange: (spec: TestSpec) => void;
  onTestRequest?: () => Promise<{ success: boolean; status?: number; responseTime?: number; error?: string }>;
  testResult?: { success: boolean; status?: number; responseTime?: number; error?: string } | null;
  isTestingRequest?: boolean;
  errors?: {
    name?: string;
    'request.url'?: string;
    'request.method'?: string;
    'loadProfile.rampUp'?: string;
    'loadProfile.users'?: string;
    'loadProfile.steady'?: string;
    'loadProfile.rampDown'?: string;
    'loadProfile.requestsPerSecond'?: string;
  };
}

// Predefined test presets
const testPresets = {
  smoke: {
    name: 'Smoke Test',
    description: 'Minimal load to verify basic functionality',
    loadProfile: { rampUp: 10, users: 2, steady: 30, rampDown: 10, requestsPerSecond: 0.5, testType: 'smoke' as const },
    color: '#4caf50'
  },
  load: {
    name: 'Load Test',
    description: 'Normal expected load to test performance',
    loadProfile: { rampUp: 30, users: 50, steady: 120, rampDown: 30, requestsPerSecond: 1, testType: 'load' as const },
    color: '#2196f3'
  },
  stress: {
    name: 'Stress Test',
    description: 'Beyond normal capacity to find breaking point',
    loadProfile: { rampUp: 60, users: 200, steady: 300, rampDown: 60, requestsPerSecond: 2, testType: 'stress' as const },
    color: '#ff9800'
  },
  spike: {
    name: 'Spike Test',
    description: 'Sudden load increases to test elasticity',
    loadProfile: { rampUp: 5, users: 100, steady: 60, rampDown: 5, requestsPerSecond: 3, testType: 'spike' as const },
    color: '#f44336'
  },
  soak: {
    name: 'Soak Test',
    description: 'Extended duration to test stability',
    loadProfile: { rampUp: 120, users: 30, steady: 3600, rampDown: 120, requestsPerSecond: 0.8, testType: 'soak' as const },
    color: '#9c27b0'
  }
};

const EnhancedLoadProfileForm: React.FC<EnhancedLoadProfileFormProps> = ({
  spec,
  onChange,
  onTestRequest,
  testResult,
  isTestingRequest = false,
  errors = {}
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handleSpecChange = (field: string, value: string | number | Record<string, string> | LoadProfile) => {
    const keys = field.split('.');
    if (keys.length === 1) {
      onChange({ ...spec, [field]: value });
    } else if (keys.length === 2) {
      const parentKey = keys[0] as keyof TestSpec;
      const childKey = keys[1];
      
      // Create a properly typed copy of the parent object
      const parentObj = {...spec[parentKey]};
      
      // Apply the update to the copy
      (parentObj as any)[childKey] = value;
      
      // Update the spec with the modified copy
      onChange({
        ...spec,
        [parentKey]: parentObj
      });
    }
  };

  const handleSliderChange = (field: string) => (
    _event: Event,
    newValue: number | number[]
  ) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    handleSpecChange(field, value);
  };

  const applyPreset = (presetKey: string) => {
    const preset = testPresets[presetKey as keyof typeof testPresets];
    if (preset) {
      setSelectedPreset(presetKey);
      handleSpecChange('loadProfile', preset.loadProfile);
    }
  };

  const addKeyValuePair = (type: 'headers' | 'queryParams') => {
    const current = spec.request[type];
    const newKey = `key${Object.keys(current).length + 1}`;
    handleSpecChange(`request.${type}`, { ...current, [newKey]: '' });
  };

  const updateKeyValuePair = (type: 'headers' | 'queryParams', oldKey: string, newKey: string, value: string) => {
    const current = spec.request[type];
    const updated = { ...current };
    
    if (oldKey !== newKey) {
      delete updated[oldKey];
    }
    updated[newKey] = value;
    
    handleSpecChange(`request.${type}`, updated);
  };

  const removeKeyValuePair = (type: 'headers' | 'queryParams', key: string) => {
    const current = spec.request[type];
    const updated = { ...current };
    delete updated[key];
    handleSpecChange(`request.${type}`, updated);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Improved request calculation that matches backend autocannon behavior
  const calculateEstimatedRequests = () => {
    const { rampUp, users, steady, rampDown, requestsPerSecond = 1 } = spec.loadProfile;
    
    // Calculate the peak RPS (requests per second) across all users
    const peakRps = users * requestsPerSecond;
    
    // Using trapezoidal area calculation for ramp-up and ramp-down phases
    // This matches the backend calculation for more accurate estimates
    const rampUpRequests = (rampUp > 0) ? (0.5 * peakRps * rampUp) : 0;
    const steadyRequests = peakRps * steady;
    const rampDownRequests = (rampDown > 0) ? (0.5 * peakRps * rampDown) : 0;
    
    return Math.round(rampUpRequests + steadyRequests + rampDownRequests);
  };

  const totalDuration = spec.loadProfile.rampUp + spec.loadProfile.steady + spec.loadProfile.rampDown;
  const estimatedRequests = calculateEstimatedRequests();
  const peakRps = spec.loadProfile.users * (spec.loadProfile.requestsPerSecond || 1);

  const KeyValueTable: React.FC<{
    title: string;
    data: Record<string, string>;
    type: 'headers' | 'queryParams';
  }> = ({ title, data, type }) => (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Button
          size="small"
          startIcon={<Add />}
          onClick={() => addKeyValuePair(type)}
          variant="outlined"
        >
          Add {title.slice(0, -1)}
        </Button>
      </Box>
      
      {Object.keys(data).length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Value</TableCell>
                <TableCell width={50}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(data).map(([key, value], index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={key}
                      onChange={(e) => updateKeyValuePair(type, key, e.target.value, value)}
                      placeholder="Key"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={value}
                      onChange={(e) => updateKeyValuePair(type, key, key, e.target.value)}
                      placeholder="Value"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => removeKeyValuePair(type, key)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No {title.toLowerCase()} configured
        </Typography>
      )}
    </Box>
  );

  return (
    <Box>
      {/* Test Name */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings />
          Test Configuration
        </Typography>
        
        <TextField
          fullWidth
          label="Test Name"
          value={spec.name}
          onChange={(e) => handleSpecChange('name', e.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name || 'Choose a descriptive name for this load test'}
          margin="normal"
          placeholder="e.g., API Load Test - User Authentication"
        />
      </Paper>

      {/* Load Profile Presets */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp />
          Load Profile Presets
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {Object.entries(testPresets).map(([key, preset]) => (
            <Card
              key={key}
              sx={{
                cursor: 'pointer',
                border: selectedPreset === key ? 2 : 1,
                borderColor: selectedPreset === key ? preset.color : 'divider',
                '&:hover': { borderColor: preset.color }
              }}
              onClick={() => applyPreset(key)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: preset.color,
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {preset.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {preset.description}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip size="small" label={`${preset.loadProfile.users} users`} />
                  <Chip size="small" label={`${formatTime(preset.loadProfile.steady)}`} />
                  <Chip size="small" label={`${preset.loadProfile.requestsPerSecond} RPS/user`} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Request Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Http />
          Request Configuration
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '120px 1fr' }, gap: 2, mb: 2 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Method</InputLabel>
            <Select
              value={spec.request.method}
              onChange={(e) => handleSpecChange('request.method', e.target.value)}
              label="Method"
              error={Boolean(errors['request.method'])}
            >
              <MenuItem value="GET">GET</MenuItem>
              <MenuItem value="POST">POST</MenuItem>
              <MenuItem value="PUT">PUT</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
              <MenuItem value="PATCH">PATCH</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Target URL"
            value={spec.request.url}
            onChange={(e) => handleSpecChange('request.url', e.target.value)}
            error={Boolean(errors['request.url'])}
            helperText={errors['request.url'] || 'The endpoint URL to test'}
            margin="normal"
            placeholder="https://api.example.com/endpoint"
          />
        </Box>

        {/* Headers and Query Parameters */}
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Headers & Query Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <KeyValueTable title="Headers" data={spec.request.headers} type="headers" />
            <KeyValueTable title="Query Parameters" data={spec.request.queryParams} type="queryParams" />
          </AccordionDetails>
        </Accordion>

        {/* Request Body */}
        {['POST', 'PUT', 'PATCH'].includes(spec.request.method) && (
          <TextField
            fullWidth
            label="Request Body (JSON)"
            value={spec.request.body}
            onChange={(e) => handleSpecChange('request.body', e.target.value)}
            multiline
            rows={4}
            margin="normal"
            placeholder='{"key": "value"}'
            helperText="Optional: JSON payload for the request"
          />
        )}

        {/* Test Request Button */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={onTestRequest}
            disabled={isTestingRequest || !spec.request.url || !spec.request.method}
            startIcon={isTestingRequest ? <Timer /> : <PlayArrow />}
          >
            {isTestingRequest ? 'Testing...' : 'Test Request'}
          </Button>
          {testResult && (
            <Chip
              label={testResult.success ? `✓ ${testResult.status} (${testResult.responseTime}ms)` : `✗ ${testResult.error}`}
              color={testResult.success ? 'success' : 'error'}
              icon={testResult.success ? <CheckCircle /> : <ErrorIcon />}
              variant="outlined"
            />
          )}
        </Box>
        
        {testResult && !testResult.success && testResult.error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {testResult.error}
          </Alert>
        )}
        {testResult && testResult.success && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Request successful! Status: {testResult.status} (Response time: {testResult.responseTime}ms)
          </Alert>
        )}
      </Paper>

      {/* Load Profile Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp />
          Load Profile Configuration
        </Typography>

        {/* Load Parameters */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
          {/* Concurrent Users */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People fontSize="small" />
              Concurrent Users
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={spec.loadProfile.users}
              onChange={(e) => handleSpecChange('loadProfile.users', Number(e.target.value))}
              error={Boolean(errors['loadProfile.users'])}
              helperText={errors['loadProfile.users']}
              InputProps={{
                startAdornment: <InputAdornment position="start"><People /></InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            <Slider
              value={spec.loadProfile.users}
              onChange={handleSliderChange('loadProfile.users')}
              min={1}
              max={1000}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 100, label: '100' },
                { value: 500, label: '500' },
                { value: 1000, label: '1000' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          {/* Requests per Second per User */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Speed fontSize="small" />
              Requests/sec per User
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={spec.loadProfile.requestsPerSecond || 1}
              onChange={(e) => handleSpecChange('loadProfile.requestsPerSecond', Number(e.target.value))}
              error={Boolean(errors['loadProfile.requestsPerSecond'])}
              helperText={errors['loadProfile.requestsPerSecond']}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Speed /></InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            <Slider
              value={spec.loadProfile.requestsPerSecond || 1}
              onChange={handleSliderChange('loadProfile.requestsPerSecond')}
              min={0.1}
              max={10}
              step={0.1}
              marks={[
                { value: 0.1, label: '0.1' },
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>
        </Box>

        {/* Timing Parameters */}
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Timer fontSize="small" />
          Timing Configuration
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Ramp Up (seconds)"
            type="number"
            value={spec.loadProfile.rampUp}
            onChange={(e) => handleSpecChange('loadProfile.rampUp', Number(e.target.value))}
            error={Boolean(errors['loadProfile.rampUp'])}
            helperText={errors['loadProfile.rampUp'] || `Duration: ${formatTime(spec.loadProfile.rampUp)}`}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Steady State (seconds)"
            type="number"
            value={spec.loadProfile.steady}
            onChange={(e) => handleSpecChange('loadProfile.steady', Number(e.target.value))}
            error={Boolean(errors['loadProfile.steady'])}
            helperText={errors['loadProfile.steady'] || `Duration: ${formatTime(spec.loadProfile.steady)}`}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Ramp Down (seconds)"
            type="number"
            value={spec.loadProfile.rampDown}
            onChange={(e) => handleSpecChange('loadProfile.rampDown', Number(e.target.value))}
            error={Boolean(errors['loadProfile.rampDown'])}
            helperText={errors['loadProfile.rampDown'] || `Duration: ${formatTime(spec.loadProfile.rampDown)}`}
            margin="normal"
          />
        </Box>

        {/* Summary Statistics */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Test Summary
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip
              label={`Total Duration: ${formatTime(totalDuration)}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Peak RPS: ${Math.round(peakRps)}`}
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`Est. Total Requests: ${estimatedRequests.toLocaleString()}`}
              color="success"
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This calculation accounts for ramp-up and ramp-down phases where user count gradually increases/decreases.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedLoadProfileForm; 