import React from 'react';
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
} from '@mui/material';
import { Speed, People, Timer, TrendingUp } from '@mui/icons-material';

interface LoadProfile {
  rampUp: number;
  users: number;
  steady: number;
  rampDown: number;
  requestsPerSecond?: number;
  testType?: 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
}

interface LoadProfileFormProps {
  loadProfile: LoadProfile;
  onChange: (loadProfile: LoadProfile) => void;
  errors?: {
    rampUp?: string;
    users?: string;
    steady?: string;
    rampDown?: string;
    requestsPerSecond?: string;
  };
}

const testTypeDescriptions = {
  smoke: 'Minimal load to verify basic functionality',
  load: 'Normal expected load to test performance',
  stress: 'Beyond normal capacity to find breaking point',
  spike: 'Sudden load increases to test elasticity',
  soak: 'Extended duration to test stability',
};

const testTypeColors = {
  smoke: '#4caf50',
  load: '#2196f3',
  stress: '#ff9800',
  spike: '#f44336',
  soak: '#9c27b0',
};

const LoadProfileForm: React.FC<LoadProfileFormProps> = ({ loadProfile, onChange, errors = {} }) => {
  const handleChange = (field: keyof LoadProfile) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    onChange({
      ...loadProfile,
      [field]: typeof value === 'string' ? (field === 'testType' ? value : Number(value)) : value,
    });
  };

  const handleSliderChange = (field: keyof LoadProfile) => (
    _event: Event,
    newValue: number | number[]
  ) => {
    onChange({
      ...loadProfile,
      [field]: Array.isArray(newValue) ? newValue[0] : newValue,
    });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const totalDuration = loadProfile.rampUp + loadProfile.steady + loadProfile.rampDown;
  const estimatedRequests = Math.round(
    ((loadProfile.rampUp * loadProfile.users) / 2 + 
     loadProfile.steady * loadProfile.users + 
     (loadProfile.rampDown * loadProfile.users) / 2) * 
    (loadProfile.requestsPerSecond || 1)
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUp />
        Load Profile Configuration
      </Typography>

      {/* Test Type Selection */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Test Type</InputLabel>
          <Select
            value={loadProfile.testType || 'load'}
            onChange={handleChange('testType')}
            label="Test Type"
          >
            {Object.entries(testTypeDescriptions).map(([type]) => (
              <MenuItem key={type} value={type}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: testTypeColors[type as keyof typeof testTypeColors],
                    }}
                  />
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {type}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {loadProfile.testType && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
            {testTypeDescriptions[loadProfile.testType as keyof typeof testTypeDescriptions]}
          </Typography>
        )}
      </Box>

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
            value={loadProfile.users}
            onChange={handleChange('users')}
            error={Boolean(errors.users)}
            helperText={errors.users}
            InputProps={{
              startAdornment: <InputAdornment position="start"><People /></InputAdornment>,
            }}
            sx={{ mb: 2 }}
          />
          <Slider
            value={loadProfile.users}
            onChange={handleSliderChange('users')}
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
            value={loadProfile.requestsPerSecond || 1}
            onChange={handleChange('requestsPerSecond')}
            error={Boolean(errors.requestsPerSecond)}
            helperText={errors.requestsPerSecond}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Speed /></InputAdornment>,
            }}
            sx={{ mb: 2 }}
          />
          <Slider
            value={loadProfile.requestsPerSecond || 1}
            onChange={handleSliderChange('requestsPerSecond')}
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
          value={loadProfile.rampUp}
          onChange={handleChange('rampUp')}
          error={Boolean(errors.rampUp)}
          helperText={errors.rampUp || `Duration: ${formatTime(loadProfile.rampUp)}`}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Steady State (seconds)"
          type="number"
          value={loadProfile.steady}
          onChange={handleChange('steady')}
          error={Boolean(errors.steady)}
          helperText={errors.steady || `Duration: ${formatTime(loadProfile.steady)}`}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Ramp Down (seconds)"
          type="number"
          value={loadProfile.rampDown}
          onChange={handleChange('rampDown')}
          error={Boolean(errors.rampDown)}
          helperText={errors.rampDown || `Duration: ${formatTime(loadProfile.rampDown)}`}
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
            label={`Peak RPS: ${Math.round(loadProfile.users * (loadProfile.requestsPerSecond || 1))}`}
            color="secondary"
            variant="outlined"
          />
          <Chip
            label={`Est. Total Requests: ${estimatedRequests.toLocaleString()}`}
            color="success"
            variant="outlined"
          />
        </Stack>
      </Box>
    </Paper>
  );
};

export default LoadProfileForm; 