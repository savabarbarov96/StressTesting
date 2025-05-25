import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { ExpandMore, Info, Speed, Timeline } from '@mui/icons-material';

interface LoadProfile {
  rampUp: number;
  users: number;
  steady: number;
  rampDown: number;
  requestsPerSecond?: number;
  testType?: 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
}

interface LoadProfileExplanationProps {
  loadProfile: LoadProfile;
}

const LoadProfileExplanation: React.FC<LoadProfileExplanationProps> = ({ loadProfile }) => {
  const [expanded, setExpanded] = useState(false);

  const theoreticalMaxRPS = loadProfile.users * (loadProfile.requestsPerSecond || 1);
  const totalDuration = loadProfile.rampUp + loadProfile.steady + loadProfile.rampDown;
  
  // Calculate more realistic expected RPS considering ramp-up/down
  const averageUsers = (
    (loadProfile.rampUp * loadProfile.users) / 2 + // Ramp-up: average users
    loadProfile.steady * loadProfile.users + // Steady: full users
    (loadProfile.rampDown * loadProfile.users) / 2 // Ramp-down: average users
  ) / totalDuration;
  
  const realisticExpectedRPS = averageUsers * (loadProfile.requestsPerSecond || 1);

  return (
    <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f8f9fa' }}>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info color="primary" />
            <Typography variant="subtitle2">
              Understanding RPS Calculations
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                There's often a difference between theoretical and actual RPS during load tests. 
                Here's why and what to expect:
              </Typography>
            </Alert>

            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed />
                RPS Calculations
              </Typography>
              
              <Stack spacing={2}>
                <Box sx={{ p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Theoretical Maximum RPS
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    If all {loadProfile.users} users make {loadProfile.requestsPerSecond || 1} request(s) 
                    per second simultaneously:
                  </Typography>
                  <Chip 
                    label={`${theoreticalMaxRPS} RPS`} 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Box sx={{ p: 2, backgroundColor: '#f3e5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="secondary" gutterBottom>
                    Realistic Expected RPS (Average)
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Considering ramp-up and ramp-down phases:
                  </Typography>
                  <Chip 
                    label={`${realisticExpectedRPS.toFixed(1)} RPS`} 
                    color="secondary" 
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Box sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    Actual RPS (What You'll See)
                  </Typography>
                  <Typography variant="body2">
                    Will likely be lower due to:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Network latency and response times</li>
                    <li>Server processing time</li>
                    <li>Connection establishment overhead</li>
                    <li>Client-side processing delays</li>
                  </ul>
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline />
                Load Profile Breakdown
              </Typography>
              
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Ramp-up phase:</Typography>
                  <Chip label={`${loadProfile.rampUp}s (0 → ${loadProfile.users} users)`} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Steady phase:</Typography>
                  <Chip label={`${loadProfile.steady}s (${loadProfile.users} users)`} size="small" color="primary" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Ramp-down phase:</Typography>
                  <Chip label={`${loadProfile.rampDown}s (${loadProfile.users} → 0 users)`} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #e0e0e0' }}>
                  <Typography variant="body2" fontWeight="bold">Total duration:</Typography>
                  <Chip label={`${totalDuration}s`} color="secondary" />
                </Box>
              </Stack>
            </Box>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>Pro Tip:</strong> The actual RPS during your test will fluctuate and is typically 
                60-90% of the theoretical maximum, depending on your target server's performance and 
                network conditions.
              </Typography>
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default LoadProfileExplanation; 