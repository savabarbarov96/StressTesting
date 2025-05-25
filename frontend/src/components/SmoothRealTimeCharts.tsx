import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Timeline,
  TrendingUp,
  Speed,
  CheckCircle,
  Error,
  Pause,
  PlayArrow,
  Fullscreen,
  FullscreenExit,
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
  Legend,
  ReferenceLine,
} from 'recharts';
import type { ProgressMetrics } from '../services/api';

interface SmoothRealTimeChartsProps {
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
  smoothedRps: number;
  smoothedLatency: number;
  smoothedSuccessRate: number;
}

const SmoothRealTimeCharts: React.FC<SmoothRealTimeChartsProps> = ({
  currentMetrics,
  isRunning,
  onPauseResume,
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSmoothed, setShowSmoothed] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  
  const maxDataPoints = 100; // Keep more data points for better smoothing
  const smoothingFactor = 0.3; // Exponential smoothing factor
  const previousValuesRef = useRef<{
    rps: number;
    latency: number;
    successRate: number;
  }>({ rps: 0, latency: 0, successRate: 100 });

  // Exponential smoothing function
  const smoothValue = (newValue: number, previousValue: number, factor: number) => {
    return factor * newValue + (1 - factor) * previousValue;
  };

  // Update chart data when new metrics arrive
  useEffect(() => {
    if (!isPaused && currentMetrics) {
      const currentSuccessRate = currentMetrics.totalRequests > 0 
        ? (currentMetrics.successfulRequests / currentMetrics.totalRequests) * 100 
        : 100;

      // Apply exponential smoothing
      const smoothedRps = smoothValue(
        currentMetrics.currentRps, 
        previousValuesRef.current.rps, 
        smoothingFactor
      );
      const smoothedLatency = smoothValue(
        currentMetrics.averageLatency, 
        previousValuesRef.current.latency, 
        smoothingFactor
      );
      const smoothedSuccessRate = smoothValue(
        currentSuccessRate, 
        previousValuesRef.current.successRate, 
        smoothingFactor
      );

      // Update previous values
      previousValuesRef.current = {
        rps: smoothedRps,
        latency: smoothedLatency,
        successRate: smoothedSuccessRate,
      };

      const newDataPoint: ChartDataPoint = {
        timestamp: new Date().toLocaleTimeString(),
        time: currentMetrics.elapsedTime,
        rps: currentMetrics.currentRps,
        latency: currentMetrics.averageLatency,
        successRate: currentSuccessRate,
        totalRequests: currentMetrics.totalRequests,
        errors: currentMetrics.failedRequests,
        smoothedRps,
        smoothedLatency,
        smoothedSuccessRate,
      };

      setChartData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only the last maxDataPoints
        return updated.slice(-maxDataPoints);
      });
    }
  }, [currentMetrics, isPaused, smoothingFactor]);

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    onPauseResume?.();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
    : 100;

  // Calculate chart domains for auto-scaling
  const rpsValues = chartData.map(d => showSmoothed ? d.smoothedRps : d.rps);
  const latencyValues = chartData.map(d => showSmoothed ? d.smoothedLatency : d.latency);

  const rpsDomain = autoScale && rpsValues.length > 0 
    ? [0, Math.max(...rpsValues) * 1.1] 
    : undefined;
  const latencyDomain = autoScale && latencyValues.length > 0 
    ? [0, Math.max(...latencyValues) * 1.1] 
    : undefined;

  const containerSx = isFullscreen 
    ? { 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 9999, 
        backgroundColor: 'background.default',
        p: 2,
        overflow: 'auto'
      }
    : {};

  return (
    <Box sx={containerSx}>
      {/* Control Panel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6" display="flex" alignItems="center">
          <Timeline sx={{ mr: 1 }} />
          Real-Time Performance Metrics
        </Typography>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch
                checked={showSmoothed}
                onChange={(e) => setShowSmoothed(e.target.checked)}
                size="small"
              />
            }
            label="Smoothed"
            sx={{ mr: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={autoScale}
                onChange={(e) => setAutoScale(e.target.checked)}
                size="small"
              />
            }
            label="Auto Scale"
            sx={{ mr: 1 }}
          />
          <Chip
            label={isRunning ? 'RUNNING' : 'STOPPED'}
            color={isRunning ? 'success' : 'default'}
            icon={isRunning ? <PlayArrow /> : <Pause />}
            variant="outlined"
            size="small"
          />
          <Tooltip title={isPaused ? 'Resume updates' : 'Pause updates'}>
            <IconButton onClick={handlePauseResume} size="small">
              {isPaused ? <PlayArrow /> : <Pause />}
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            <IconButton onClick={toggleFullscreen} size="small">
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Box display="flex" gap={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Current RPS
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {currentMetrics.currentRps.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total: {formatNumber(currentMetrics.totalRequests)}
                  </Typography>
                </Box>
                <Speed color="primary" sx={{ fontSize: 40 }} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((currentMetrics.currentRps / 1000) * 100, 100)}
                sx={{ mt: 1 }}
                color="primary"
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
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
                  <Typography variant="caption" color="textSecondary">
                    Errors: {currentMetrics.failedRequests}
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
            <CardContent sx={{ pb: 2 }}>
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
                  <Typography variant="caption" color="textSecondary">
                    Elapsed: {Math.floor(currentMetrics.elapsedTime / 60)}m {currentMetrics.elapsedTime % 60}s
                  </Typography>
                </Box>
                <TrendingUp 
                  color={currentMetrics.averageLatency < 200 ? 'success' : currentMetrics.averageLatency < 500 ? 'warning' : 'error'} 
                  sx={{ fontSize: 40 }} 
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, 100 - (currentMetrics.averageLatency / 10)))}
                color={currentMetrics.averageLatency < 200 ? 'success' : currentMetrics.averageLatency < 500 ? 'warning' : 'error'}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* RPS Chart */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Requests per Second
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                type="number"
                scale="linear"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`}
              />
              <YAxis domain={rpsDomain} />
              <RechartsTooltip 
                labelFormatter={(value) => `Time: ${Math.floor(Number(value) / 60)}:${(Number(value) % 60).toString().padStart(2, '0')}`}
                formatter={(value: number, name: string) => [value.toFixed(1), name === 'rps' ? 'Raw RPS' : 'Smoothed RPS']}
              />
              <Legend />
              {!showSmoothed && (
                <Area
                  type="monotone"
                  dataKey="rps"
                  stroke="#2196f3"
                  fill="#2196f3"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Raw RPS"
                />
              )}
              {showSmoothed && (
                <Area
                  type="monotone"
                  dataKey="smoothedRps"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Smoothed RPS"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </Paper>

        {/* Latency Chart */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Response Latency
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                type="number"
                scale="linear"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`}
              />
              <YAxis domain={latencyDomain} />
              <RechartsTooltip 
                labelFormatter={(value) => `Time: ${Math.floor(Number(value) / 60)}:${(Number(value) % 60).toString().padStart(2, '0')}`}
                formatter={(value: number, name: string) => [`${value.toFixed(0)}ms`, name === 'latency' ? 'Raw Latency' : 'Smoothed Latency']}
              />
              <Legend />
              <ReferenceLine y={200} stroke="#4caf50" strokeDasharray="5 5" label="Good (200ms)" />
              <ReferenceLine y={500} stroke="#ff9800" strokeDasharray="5 5" label="Warning (500ms)" />
              {!showSmoothed && (
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#ff9800"
                  strokeWidth={2}
                  dot={false}
                  name="Raw Latency"
                />
              )}
              {showSmoothed && (
                <Line
                  type="monotone"
                  dataKey="smoothedLatency"
                  stroke="#f57c00"
                  strokeWidth={2}
                  dot={false}
                  name="Smoothed Latency"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* Success Rate Chart */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Success Rate
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                type="number"
                scale="linear"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`}
              />
              <YAxis domain={[0, 100]} />
              <RechartsTooltip 
                labelFormatter={(value) => `Time: ${Math.floor(Number(value) / 60)}:${(Number(value) % 60).toString().padStart(2, '0')}`}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'successRate' ? 'Raw Success Rate' : 'Smoothed Success Rate']}
              />
              <Legend />
              <ReferenceLine y={95} stroke="#4caf50" strokeDasharray="5 5" label="Target (95%)" />
              <ReferenceLine y={90} stroke="#ff9800" strokeDasharray="5 5" label="Warning (90%)" />
              {!showSmoothed && (
                <Area
                  type="monotone"
                  dataKey="successRate"
                  stroke="#4caf50"
                  fill="#4caf50"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Raw Success Rate"
                />
              )}
              {showSmoothed && (
                <Area
                  type="monotone"
                  dataKey="smoothedSuccessRate"
                  stroke="#388e3c"
                  fill="#388e3c"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Smoothed Success Rate"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </Paper>

        {/* Error Count Chart */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Error Count
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                type="number"
                scale="linear"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`}
              />
              <YAxis />
              <RechartsTooltip 
                labelFormatter={(value) => `Time: ${Math.floor(Number(value) / 60)}:${(Number(value) % 60).toString().padStart(2, '0')}`}
                formatter={(value: number) => [value, 'Errors']}
              />
              <Area
                type="monotone"
                dataKey="errors"
                stroke="#f44336"
                fill="#f44336"
                fillOpacity={0.3}
                strokeWidth={2}
                name="Errors"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default SmoothRealTimeCharts; 