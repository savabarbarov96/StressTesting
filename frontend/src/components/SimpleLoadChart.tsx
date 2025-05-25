import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Timer, People, Assessment } from '@mui/icons-material';

interface LoadProfile {
  rampUp: number;
  users: number;
  steady: number;
  rampDown: number;
  requestsPerSecond?: number;
  testType?: string;
}

interface SimpleLoadChartProps {
  loadProfile: LoadProfile;
}

const SimpleLoadChart: React.FC<SimpleLoadChartProps> = ({ loadProfile }) => {
  const { rampUp, users, steady, rampDown, requestsPerSecond = 1 } = loadProfile;

  const chartData = useMemo(() => {
    const data = [];
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

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <Box>
      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
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
      </Box>

      {/* Load Profile Chart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Load Profile Visualization
        </Typography>
        
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tickFormatter={formatTime}
            />
            <YAxis 
              yAxisId="users"
              orientation="left"
            />
            <YAxis 
              yAxisId="requests"
              orientation="right"
            />
            <Tooltip 
              formatter={(value, name) => [value, name === 'users' ? 'Users' : 'Requests/sec']}
              labelFormatter={(label) => `Time: ${formatTime(Number(label))}`}
            />
            <Area
              yAxisId="users"
              type="monotone"
              dataKey="users"
              stroke="#2196f3"
              fill="#2196f3"
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
            <Box sx={{ width: 16, height: 16, backgroundColor: '#2196f3', borderRadius: '50%' }} />
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

export default SimpleLoadChart; 