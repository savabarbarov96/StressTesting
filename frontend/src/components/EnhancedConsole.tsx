import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
} from '@mui/material';
import {
  Clear,
  Search,
  FilterList,
  Download,
  Pause,
  PlayArrow,
  Circle,
} from '@mui/icons-material';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
}

interface EnhancedConsoleProps {
  logs: string[];
  isRunning: boolean;
  onExport?: () => void;
}

const EnhancedConsole: React.FC<EnhancedConsoleProps> = ({
  logs,
  isRunning,
  onExport,
}) => {
  const [parsedLogs, setParsedLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Parse raw log strings into structured log entries
  useEffect(() => {
    const parsed = logs.map((log, index) => {
      const id = `log-${Date.now()}-${index}`;
      const timestamp = new Date().toLocaleTimeString();
      
      // Simple log level detection
      let level: LogEntry['level'] = 'info';
      if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) {
        level = 'error';
      } else if (log.toLowerCase().includes('warning') || log.toLowerCase().includes('warn')) {
        level = 'warning';
      } else if (log.toLowerCase().includes('success') || log.toLowerCase().includes('completed')) {
        level = 'success';
      }

      return {
        id,
        timestamp,
        level,
        message: log,
        source: 'load-test',
      };
    });

    if (!isPaused) {
      setParsedLogs(parsed);
    }
  }, [logs, isPaused]);

  // Filter logs based on search term and level
  useEffect(() => {
    let filtered = parsedLogs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    setFilteredLogs(filtered);
  }, [parsedLogs, searchTerm, levelFilter]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleClearLogs = () => {
    setParsedLogs([]);
    setFilteredLogs([]);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'success':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    return <Circle sx={{ fontSize: 8, color: getLevelColor(level) }} />;
  };

  const getLogCounts = () => {
    const counts = {
      total: parsedLogs.length,
      error: parsedLogs.filter(log => log.level === 'error').length,
      warning: parsedLogs.filter(log => log.level === 'warning').length,
      success: parsedLogs.filter(log => log.level === 'success').length,
      info: parsedLogs.filter(log => log.level === 'info').length,
    };
    return counts;
  };

  const counts = getLogCounts();

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">
            Console Logs
          </Typography>
          <Badge badgeContent={counts.total} color="primary" max={999}>
            <Circle sx={{ fontSize: 12, color: isRunning ? '#4caf50' : '#9e9e9e' }} />
          </Badge>
          {isRunning && (
            <Chip
              label="LIVE"
              size="small"
              color="success"
              variant="outlined"
              icon={<Circle sx={{ fontSize: 8, animation: 'pulse 1s infinite' }} />}
            />
          )}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={isPaused ? 'Resume logging' : 'Pause logging'}>
            <IconButton onClick={handleTogglePause} size="small">
              {isPaused ? <PlayArrow /> : <Pause />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Export logs">
            <IconButton onClick={onExport} size="small">
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear logs">
            <IconButton onClick={handleClearLogs} size="small">
              <Clear />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={2} sx={{ flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Level</InputLabel>
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            label="Level"
            startAdornment={<FilterList sx={{ mr: 1 }} />}
          >
            <MenuItem value="all">All ({counts.total})</MenuItem>
            <MenuItem value="error">
              <Box display="flex" alignItems="center" gap={1}>
                {getLevelIcon('error')}
                Error ({counts.error})
              </Box>
            </MenuItem>
            <MenuItem value="warning">
              <Box display="flex" alignItems="center" gap={1}>
                {getLevelIcon('warning')}
                Warning ({counts.warning})
              </Box>
            </MenuItem>
            <MenuItem value="success">
              <Box display="flex" alignItems="center" gap={1}>
                {getLevelIcon('success')}
                Success ({counts.success})
              </Box>
            </MenuItem>
            <MenuItem value="info">
              <Box display="flex" alignItems="center" gap={1}>
                {getLevelIcon('info')}
                Info ({counts.info})
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Auto-scroll:
          </Typography>
          <IconButton
            size="small"
            onClick={() => setAutoScroll(!autoScroll)}
            color={autoScroll ? 'primary' : 'default'}
          >
            <Circle sx={{ fontSize: 8 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Console Output */}
      <Box
        ref={consoleRef}
        sx={{
          height: 400,
          overflow: 'auto',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          p: 2,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: '0.875rem',
          border: '1px solid #333',
          borderRadius: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#2e2e2e',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#555',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#777',
          },
        }}
      >
        {filteredLogs.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            {parsedLogs.length === 0 ? 'No logs yet...' : 'No logs match the current filter'}
          </Typography>
        ) : (
          filteredLogs.map((log) => (
            <Box
              key={log.id}
              display="flex"
              alignItems="flex-start"
              gap={1}
              sx={{
                mb: 0.5,
                p: 0.5,
                borderRadius: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <Box sx={{ mt: 0.5 }}>
                {getLevelIcon(log.level)}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: '#888',
                  minWidth: 80,
                  fontFamily: 'inherit',
                }}
              >
                {log.timestamp}
              </Typography>
              <Typography
                sx={{
                  color: getLevelColor(log.level),
                  fontFamily: 'inherit',
                  wordBreak: 'break-word',
                  flex: 1,
                }}
              >
                {log.message}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      {/* Status Bar */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={1}
        sx={{
          fontSize: '0.75rem',
          color: 'text.secondary',
        }}
      >
        <Box>
          Showing {filteredLogs.length} of {parsedLogs.length} logs
        </Box>
        <Box display="flex" gap={2}>
          <Box display="flex" alignItems="center" gap={0.5}>
            {getLevelIcon('error')}
            {counts.error}
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {getLevelIcon('warning')}
            {counts.warning}
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {getLevelIcon('success')}
            {counts.success}
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {getLevelIcon('info')}
            {counts.info}
          </Box>
        </Box>
      </Box>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Paper>
  );
};

export default EnhancedConsole; 