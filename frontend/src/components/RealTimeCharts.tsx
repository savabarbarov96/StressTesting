import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  TrendingUp,
  Speed,
  CheckCircle,
  Error,
  Pause,
  PlayArrow,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import type { ProgressMetrics } from '../services/api';

interface RealTimeChartsProps {
  currentMetrics: ProgressMetrics;
  isRunning: boolean;
  onPauseResume?: () => void;
}

interface ChartDataPoint {
  timestamp: string;
  time: number;
  rps: number;
  latency: number;
  successRate: number;
  totalRequests: number;
  errors: number;
}

const RealTimeCharts: React.FC<RealTimeChartsProps> = ({
  currentMetrics,
  isRunning,
  onPauseResume,
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const maxDataPoints = 50; // Keep last 50 data points

  // Update chart data when new metrics arrive
  useEffect(() => {
    if (!isPaused && currentMetrics) {
      const newDataPoint: ChartDataPoint = {
        timestamp: new Date().toLocaleTimeString(),
        time: currentMetrics.elapsedTime,
        rps: currentMetrics.currentRps,
        latency: currentMetrics.averageLatency,
        successRate: currentMetrics.totalRequests > 0 
          ? (currentMetrics.successfulRequests / currentMetrics.totalRequests) * 100 
          : 0,
        totalRequests: currentMetrics.totalRequests,
        errors: currentMetrics.failedRequests,
      };

      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only the last maxDataPoints
        return updated.slice(-maxDataPoints);
      });
    }
  }, [currentMetrics, isPaused]);

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    onPauseResume?.();
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'success.main';
    if (value >= thresholds.warning) return 'warning.main';
    return 'error.main';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const currentSuccessRate = currentMetrics.totalRequests > 0 
    ? (currentMetrics.successfulRequests / currentMetrics.totalRequests) * 100 
    : 0;

  return (
    <Box>
      {/* Control Panel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center">
          <Timeline sx={{ mr: 1 }} />
          Real-Time Performance Metrics
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={isRunning ? 'RUNNING' : 'STOPPED'}
            color={isRunning ? 'success' : 'default'}
            icon={isRunning ? <PlayArrow /> : <Pause />}
            variant="outlined"
          />
          <Tooltip title={isPaused ? 'Resume updates' : 'Pause updates'}>
            <IconButton onClick={handlePauseResume} size="small">
              {isPaused ? <PlayArrow /> : <Pause />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Box display="flex" gap={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Current RPS
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {currentMetrics.currentRps.toFixed(1)}
                  </Typography>
                </Box>
                <Speed color="primary" sx={{ fontSize: 40 }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((currentMetrics.currentRps / 1000) * 100, 100)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Success Rate
                  </Typography>
                  <Typography 
                    variant="h4" 
                    color={getStatusColor(currentSuccessRate, { good: 95, warning: 90 })}
                  >
                    {currentSuccessRate.toFixed(1)}%
                  </Typography>
                </Box>
                {currentSuccessRate >= 95 ? (
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                ) : (
                  <Error color="error" sx={{ fontSize: 40 }} />
                )}
              </Box>
              <LinearProgress
                variant="determinate"
                value={currentSuccessRate}
                color={currentSuccessRate >= 95 ? 'success' : currentSuccessRate >= 90 ? 'warning' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Avg Latency
                  </Typography>
                  <Typography 
                    variant="h4" 
                    color={getStatusColor(1000 - currentMetrics.averageLatency, { good: 800, warning: 500 })}
                  >
                    {currentMetrics.averageLatency.toFixed(0)}ms
                  </Typography>
                </Box>
                <TrendingUp 
                  color={currentMetrics.averageLatency < 200 ? 'success' : 'warning'} 
                  sx={{ fontSize: 40 }} 
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((currentMetrics.averageLatency / 1000) * 100, 100)}
                color={currentMetrics.averageLatency < 200 ? 'success' : currentMetrics.averageLatency < 500 ? 'warning' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Requests
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {formatNumber(currentMetrics.totalRequests)}
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="caption" color="success.main">
                    ✓ {formatNumber(currentMetrics.successfulRequests)}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="error.main">
                    ✗ {formatNumber(currentMetrics.failedRequests)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts */}
      <Box display="flex" gap={2} sx={{ flexWrap: 'wrap' }}>
        {/* RPS Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Requests Per Second
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value: number) => [value.toFixed(1), 'RPS']}
                />
                <Area 
                  type="monotone" 
                  dataKey="rps" 
                  stroke="#1976d2" 
                  fill="#1976d2" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Latency Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Average Latency
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Latency']}
                />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#ff9800" 
                  strokeWidth={2}
                  dot={{ fill: '#ff9800', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Success Rate Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Success Rate
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <RechartsTooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
                />
                <Area 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#4caf50" 
                  fill="#4caf50" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Error Rate Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Error Count
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value: number) => [value, 'Errors']}
                />
                <Bar 
                  dataKey="errors" 
                  fill="#f44336" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default RealTimeCharts; 