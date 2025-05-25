import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ProgressMetrics } from '../services/api';

interface RealTimeChartsProps {
  data: ProgressMetrics;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  summary?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageRps: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    duration: number;
    targetRequests?: number;
    targetDuration?: number;
  };
}

interface ChartData {
  time: number;
  rps: number;
  successfulRequests: number;
  failedRequests: number;
  latency: number;
}

const RealTimeCharts: React.FC<RealTimeChartsProps> = ({ data, status, summary }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const maxDataPoints = 100; // Limit data points to prevent performance issues
  
  // Format a number with appropriate units (k for thousands, m for millions)
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    } else {
      return num.toString();
    }
  };

  // Add current data point to chart
  useEffect(() => {
    if (data && (status === 'running' || status === 'completed')) {
      const newDataPoint = {
        time: data.elapsedTime,
        rps: Math.round(data.currentRps * 10) / 10, // Round to 1 decimal place
        successfulRequests: data.successfulRequests,
        failedRequests: data.failedRequests,
        latency: data.averageLatency
      };
      
      // Add data point and limit size
      setChartData(prev => {
        const newData = [...prev, newDataPoint];
        return newData.length > maxDataPoints ? newData.slice(-maxDataPoints) : newData;
      });
    }
  }, [data, status]);

  // Show placeholder while loading
  if (!data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Calculate completion percentage based on expected progress if available, otherwise use time-based estimate
  const completionPercentage = data.expectedProgress !== undefined 
    ? Math.min(100, data.expectedProgress) 
    : (summary && summary.targetDuration 
      ? Math.min(100, (data.elapsedTime / summary.targetDuration) * 100) 
      : Math.min(100, (data.elapsedTime / (data.elapsedTime + 10)) * 100));

  return (
    <Grid container spacing={3}>
      {/* Progress Bar */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="medium">Test Progress</Typography>
            <Typography variant="body1">
              {status === 'running' ? `${Math.round(completionPercentage)}%` : status === 'completed' ? '100%' : status}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={status === 'completed' ? 100 : completionPercentage} 
            color={status === 'failed' ? 'error' : status === 'stopped' ? 'warning' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {data.elapsedTime}s elapsed
            </Typography>
            {summary?.targetDuration && (
              <Typography variant="body2" color="text.secondary">
                Target: {summary.targetDuration}s
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Key Metrics */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Key Metrics
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Requests per Second
              </Typography>
              <Typography variant="h4">
                {Math.round(data.currentRps)}
              </Typography>
              {summary && (
                <Chip 
                  size="small" 
                  label={`Target: ${Math.round(summary.averageRps)}`} 
                  color="primary" 
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
              <Typography variant="h4">
                {formatNumber(data.totalRequests)}
              </Typography>
              {summary?.targetRequests && (
                <Chip 
                  size="small" 
                  label={`Target: ${formatNumber(summary.targetRequests)}`} 
                  color="primary" 
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Average Latency
              </Typography>
              <Typography variant="h4">
                {Math.round(data.averageLatency)}ms
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      {/* Success/Failure Metrics */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Request Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card sx={{ bgcolor: 'success.light', height: '100%' }}>
                <CardContent>
                  <Typography variant="body2" color="success.contrastText">
                    Successful
                  </Typography>
                  <Typography variant="h4" color="success.contrastText">
                    {formatNumber(data.successfulRequests)}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText" sx={{ opacity: 0.8 }}>
                    {data.totalRequests > 0 
                      ? `${Math.round((data.successfulRequests / data.totalRequests) * 100)}%` 
                      : '0%'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card sx={{ bgcolor: 'error.light', height: '100%' }}>
                <CardContent>
                  <Typography variant="body2" color="error.contrastText">
                    Failed
                  </Typography>
                  <Typography variant="h4" color="error.contrastText">
                    {formatNumber(data.failedRequests)}
                  </Typography>
                  <Typography variant="body2" color="error.contrastText" sx={{ opacity: 0.8 }}>
                    {data.totalRequests > 0 
                      ? `${Math.round((data.failedRequests / data.totalRequests) * 100)}%` 
                      : '0%'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* RPS Chart */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Requests per Second
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} 
              />
              <YAxis label={{ value: 'RPS', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => [`${value}`, '']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="rps"
                name="Requests/sec"
                stroke="#2196f3"
                activeDot={{ r: 8 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Latency Chart */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Latency
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} 
              />
              <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => [`${value} ms`, '']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="latency"
                name="Avg Latency"
                stroke="#ff9800"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Summary Section (only shown when completed) */}
      {status !== 'running' && summary && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Test Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Requests</Typography>
                  <Typography variant="h6">
                    {formatNumber(summary.totalRequests)}
                    {summary.targetRequests && (
                      <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                        of {formatNumber(summary.targetRequests)} target
                      </Typography>
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Avg RPS</Typography>
                  <Typography variant="h6">
                    {Math.round(summary.averageRps * 10) / 10}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Duration</Typography>
                  <Typography variant="h6">
                    {summary.duration}s
                    {summary.targetDuration && (
                      <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                        of {summary.targetDuration}s target
                      </Typography>
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                  <Typography variant="h6">
                    {Math.round(summary.errorRate)}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Latency
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography variant="body2">P50</Typography>
                    <Typography variant="h6">{summary.p50Latency}ms</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">P95</Typography>
                    <Typography variant="h6">{summary.p95Latency}ms</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">P99</Typography>
                    <Typography variant="h6">{summary.p99Latency}ms</Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default RealTimeCharts; 