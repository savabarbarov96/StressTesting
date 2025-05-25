import type { Run } from '../services/api';

export const generateHTMLReport = (run: Run): string => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const successRate = run.progress?.totalRequests > 0 
    ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100).toFixed(1)
    : '0.0';

  const avgResponseTime = run.summary?.p50Latency || run.progress?.averageLatency || 0;
  const p95ResponseTime = run.summary?.p95Latency || 0;
  const p99ResponseTime = run.summary?.p99Latency || 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${run._id.slice(-8)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .section {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #2c3e50;
            margin: 10px 0;
        }
        .metric-label {
            color: #7f8c8d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8em;
        }
        .status-completed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-stopped { background: #fff3cd; color: #856404; }
        .error-section {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .error-title {
            color: #721c24;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .error-details {
            background: #fff;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .info-table th,
        .info-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .info-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .info-table tr:hover {
            background-color: #f5f5f5;
        }
        .footer {
            text-align: center;
            color: #7f8c8d;
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #ecf0f1;
        }
        @media print {
            body { background-color: white; }
            .section { box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Load Test Report</h1>
        <p>Run ID: ${run._id} | Generated on ${formatDate(new Date().toISOString())}</p>
    </div>

    <div class="section">
        <h2>Test Overview</h2>
        <table class="info-table">
            <tr>
                <th>Status</th>
                <td>
                    <span class="status-badge status-${run.status}">
                        ${run.status.toUpperCase()}
                    </span>
                </td>
            </tr>
            <tr>
                <th>Started</th>
                <td>${formatDate(run.createdAt)}</td>
            </tr>
            ${run.completedAt ? `
            <tr>
                <th>Completed</th>
                <td>${formatDate(run.completedAt)}</td>
            </tr>
            ` : ''}
            <tr>
                <th>Duration</th>
                <td>${formatDuration(run.progress?.elapsedTime || 0)}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Test Configuration</h2>
        <table class="info-table">
            ${(typeof run.specId === 'object' && run.specId) ? `
            <tr>
                <th>Test Name</th>
                <td>${run.specId.name}</td>
            </tr>
            <tr>
                <th>Target Endpoint</th>
                <td>
                    <strong>${run.specId.request.method}</strong> ${run.specId.request.url}
                </td>
            </tr>
            <tr>
                <th>Load Profile</th>
                <td>
                    ${run.specId.loadProfile.users} users | 
                    Ramp-up: ${run.specId.loadProfile.rampUp}s | 
                    Steady: ${run.specId.loadProfile.steady}s | 
                    Ramp-down: ${run.specId.loadProfile.rampDown}s
                </td>
            </tr>
            ${run.specId.request.headers && Object.keys(run.specId.request.headers).length > 0 ? `
            <tr>
                <th>Headers</th>
                <td>
                    <div style="font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                        ${Object.entries(run.specId.request.headers).map(([key, value]) => 
                            `${key}: ${value}`
                        ).join('<br>')}
                    </div>
                </td>
            </tr>
            ` : ''}
            ${run.specId.request.body ? `
            <tr>
                <th>Request Body</th>
                <td>
                    <div style="font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                        ${run.specId.request.body}
                    </div>
                </td>
            </tr>
            ` : ''}
            ` : `
            <tr>
                <td colspan="2"><em>Specification details not available</em></td>
            </tr>
            `}
        </table>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Requests</div>
                <div class="metric-value">${(run.progress?.totalRequests || 0).toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Successful Requests</div>
                <div class="metric-value">${(run.progress?.successfulRequests || 0).toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Failed Requests</div>
                <div class="metric-value">${(run.progress?.failedRequests || 0).toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">${successRate}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average RPS</div>
                <div class="metric-value">${(run.progress?.currentRps || 0).toFixed(1)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg Response Time</div>
                <div class="metric-value">${avgResponseTime.toFixed(1)}ms</div>
            </div>
            ${p95ResponseTime > 0 ? `
            <div class="metric-card">
                <div class="metric-label">95th Percentile</div>
                <div class="metric-value">${p95ResponseTime.toFixed(1)}ms</div>
            </div>
            ` : ''}
            ${p99ResponseTime > 0 ? `
            <div class="metric-card">
                <div class="metric-label">99th Percentile</div>
                <div class="metric-value">${p99ResponseTime.toFixed(1)}ms</div>
            </div>
            ` : ''}
        </div>
    </div>

    ${run.error ? `
    <div class="section">
        <h2>Error Details</h2>
        <div class="error-section">
            <div class="error-title">Error Message:</div>
            <div class="error-details">${run.error.message}</div>
            ${run.error.details ? `
            <div class="error-title" style="margin-top: 15px;">Technical Details:</div>
            <div class="error-details">${typeof run.error.details === 'string' ? run.error.details : JSON.stringify(run.error.details, null, 2)}</div>
            ` : ''}
            ${run.error.stack ? `
            <div class="error-title" style="margin-top: 15px;">Stack Trace:</div>
            <div class="error-details">${run.error.stack}</div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was generated automatically by the Load Testing System</p>
        <p>For more information, visit the test dashboard</p>
    </div>
</body>
</html>
  `.trim();
};

export const downloadHTMLReport = (run: Run): void => {
  const htmlContent = generateHTMLReport(run);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `load-test-report-${run._id.slice(-8)}-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const downloadPDFReport = (run: Run): void => {
  const htmlContent = generateHTMLReport(run);
  
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}; 