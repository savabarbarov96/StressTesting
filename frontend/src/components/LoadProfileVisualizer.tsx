import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  TooltipProps,
} from 'recharts';
import { TrendingUp, Timer, People, Assessment } from '@mui/icons-material';

interface LoadProfile {
  rampUp: number;
  users: number;
  steady: number;
  rampDown: number;
  requestsPerSecond?: number;
  testType?: 'smoke' | 'load' | 'stress' | 'spike' | 'soak';
}

interface LoadProfileVisualizerProps {
  loadProfile: LoadProfile;
}

interface ChartDataPoint {
  time: number;
  users: number;
  requests: number;
}

const LoadProfileVisualizer: React.FC<LoadProfileVisualizerProps> = ({ loadProfile }) => {
  const { rampUp, users, steady, rampDown, requestsPerSecond = 1, testType = 'load' } = loadProfile;

  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];
    const totalDuration = rampUp + steady + rampDown;
    const points = Math.max(50, totalDuration);
    
    for (let i = 0; i <= points; i++) {
      const time = (i / points) * totalDuration;
      let currentUsers = 0;
      
      if (time <= rampUp) {
        currentUsers = (time / rampUp) * users;
      } else if (time <= rampUp + steady) {
        currentUsers = users;
      } else {
        const rampDownTime = time - rampUp - steady;
        currentUsers = users * (1 - rampDownTime / rampDown);
      }
      
      data.push({
        time: Math.round(time),
        users: Math.max(0, Math.round(currentUsers)),
        requests: Math.max(0, Math.round(currentUsers * requestsPerSecond)),
      });
    }
    
    return data;
  }, [rampUp, users, steady, rampDown, requestsPerSecond]);

  const calculations = useMemo(() => {
    const totalDuration = rampUp + steady + rampDown;
    const rampUpRequests = (rampUp * users * requestsPerSecond) / 2;
    const steadyRequests = steady * users * requestsPerSecond;
    const rampDownRequests = (rampDown * users * requestsPerSecond) / 2;
    const totalRequests = Math.round(rampUpRequests + steadyRequests + rampDownRequests);
    const peakRPS = users * requestsPerSecond;
    
    return {
      totalDuration,
      totalRequests,
      peakRPS: Math.round(peakRPS),
    };
  }, [rampUp, users, steady, rampDown, requestsPerSecond]);

  const getTestTypeColor = (type: string) => {
    const colors = {
      smoke: '#4caf50',
      load: '#2196f3',
      stress: '#ff9800',
      spike: '#f44336',
      soak: '#9c27b0',
    };
    return colors[type as keyof typeof colors] || '#2196f3';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, border: '1px solid #ccc' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Time: {formatTime(Number(label))}
          </Typography>
          <Typography variant="body2" color="primary">
            Users: {payload[0]?.value || 0}
          </Typography>
          <Typography variant="body2" color="secondary">
            Requests/sec: {payload[1]?.value || 0}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Timer sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" component="div">
                {formatTime(calculations.totalDuration)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Duration
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" component="div">
                {users}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Peak Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6" component="div">
                {calculations.peakRPS.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Peak RPS
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h6" component="div">
                {calculations.totalRequests.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Load Profile Visualization
          </Typography>
          <Chip 
            label={testType.toUpperCase()} 
            sx={{ 
              backgroundColor: getTestTypeColor(testType),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Box>
        
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatTime}
              label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              yAxisId="users"
              orientation="left"
              label={{ value: 'Concurrent Users', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="requests"
              orientation="right"
              label={{ value: 'Requests/sec', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="users"
              type="monotone"
              dataKey="users"
              stroke={getTestTypeColor(testType)}
              fill={getTestTypeColor(testType)}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Line
              yAxisId="requests"
              type="monotone"
              dataKey="requests"
              stroke="#ff7300"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: '#4caf50', borderRadius: '50%' }} />
            <Typography variant="body2">Ramp Up ({formatTime(rampUp)})</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: getTestTypeColor(testType), borderRadius: '50%' }} />
            <Typography variant="body2">Steady State ({formatTime(steady)})</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: '#f44336', borderRadius: '50%' }} />
            <Typography variant="body2">Ramp Down ({formatTime(rampDown)})</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoadProfileVisualizer; 