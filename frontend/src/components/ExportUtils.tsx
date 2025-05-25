import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { Run } from '../services/api';

interface ExportData {
  run: Run;
  logs: string[];
  chartData?: unknown[];
}

export class ExportUtils {
  static async exportToPDF(data: ExportData): Promise<void> {
    const { run, logs } = data;
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        if (isBold) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
        
        // Check if we need a new page
        if (yPosition + (lines.length * fontSize * 0.35) > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * fontSize * 0.35 + 5;
      };

      // Title
      addText('Load Test Report', 20, true);
      yPosition += 10;

      // Test Information
      addText('Test Information', 16, true);
      addText(`Run ID: ${run._id}`);
      addText(`Started: ${new Date(run.startedAt).toLocaleString()}`);
      if (run.completedAt) {
        addText(`Completed: ${new Date(run.completedAt).toLocaleString()}`);
      }
      addText(`Status: ${run.status.toUpperCase()}`);
      addText(`Duration: ${run.progress.elapsedTime}s`);
      yPosition += 10;

      // Performance Metrics
      addText('Performance Metrics', 16, true);
      addText(`Total Requests: ${run.progress.totalRequests.toLocaleString()}`);
      addText(`Successful Requests: ${run.progress.successfulRequests.toLocaleString()}`);
      addText(`Failed Requests: ${run.progress.failedRequests.toLocaleString()}`);
      addText(`Success Rate: ${run.progress.totalRequests > 0 ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100).toFixed(2) : 0}%`);
      addText(`Current RPS: ${run.progress.currentRps.toFixed(2)}`);
      addText(`Average Latency: ${run.progress.averageLatency.toFixed(2)}ms`);
      yPosition += 10;

      // Final Summary (if available)
      if (run.summary) {
        addText('Final Summary', 16, true);
        addText(`Total Requests: ${run.summary.totalRequests.toLocaleString()}`);
        addText(`Average RPS: ${run.summary.averageRps.toFixed(2)}`);
        addText(`P99 Latency: ${run.summary.p99Latency}ms`);
        addText(`Error Rate: ${run.summary.errorRate.toFixed(2)}%`);
        yPosition += 10;
      }

      // Error Information (if any)
      if (run.error) {
        addText('Error Information', 16, true);
        addText(`Error: ${run.error.message}`);
        if (run.error.details) {
          addText(`Details: ${typeof run.error.details === 'string' ? run.error.details : JSON.stringify(run.error.details)}`);
        }
        addText(`Timestamp: ${new Date(run.error.timestamp).toLocaleString()}`);
        yPosition += 10;
      }

      // Logs Section
      if (logs.length > 0) {
        addText('Console Logs', 16, true);
        
        // Add recent logs (last 50 to avoid too many pages)
        const recentLogs = logs.slice(-50);
        recentLogs.forEach((log) => {
          const timestamp = new Date().toLocaleTimeString();
          addText(`[${timestamp}] ${log}`, 10);
        });
      }

      // Try to capture charts if available
      const chartsContainer = document.querySelector('[data-export-charts]');
      if (chartsContainer) {
        try {
          const canvas = await html2canvas(chartsContainer as HTMLElement, {
            backgroundColor: '#ffffff',
            scale: 1,
            useCORS: true,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Add new page for charts
          pdf.addPage();
          yPosition = margin;
          addText('Performance Charts', 16, true);
          
          if (yPosition + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        } catch (error) {
          console.warn('Could not capture charts for PDF:', error);
        }
      }

      // Save the PDF
      const fileName = `load-test-report-${run._id}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  static async exportToHTML(data: ExportData): Promise<void> {
    const { run, logs } = data;
    
    try {
      // Create HTML content
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${run._id}</title>
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
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1976d2;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 10px;
        }
        h2 {
            color: #424242;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #1976d2;
        }
        .metric-label {
            font-weight: bold;
            color: #666;
            font-size: 0.9em;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #1976d2;
            margin-top: 5px;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.8em;
        }
        .status.completed { background: #e8f5e8; color: #2e7d32; }
        .status.running { background: #e3f2fd; color: #1976d2; }
        .status.failed { background: #ffebee; color: #d32f2f; }
        .status.stopped { background: #fff3e0; color: #f57c00; }
        .logs-container {
            background: #1e1e1e;
            color: #ffffff;
            padding: 20px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            max-height: 400px;
            overflow-y: auto;
            margin-top: 15px;
        }
        .log-entry {
            margin-bottom: 5px;
            padding: 2px 0;
        }
        .timestamp {
            color: #888;
            margin-right: 10px;
        }
        .error { color: #f44336; }
        .warning { color: #ff9800; }
        .success { color: #4caf50; }
        .info { color: #2196f3; }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .summary-table th,
        .summary-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .summary-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .error-section {
            background: #ffebee;
            border: 1px solid #ffcdd2;
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
        }
        .error-title {
            color: #d32f2f;
            font-weight: bold;
            margin-bottom: 10px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Load Test Report</h1>
        
        <h2>Test Information</h2>
        <table class="summary-table">
            <tr><td><strong>Run ID:</strong></td><td>${run._id}</td></tr>
            <tr><td><strong>Started:</strong></td><td>${new Date(run.startedAt).toLocaleString()}</td></tr>
            ${run.completedAt ? `<tr><td><strong>Completed:</strong></td><td>${new Date(run.completedAt).toLocaleString()}</td></tr>` : ''}
            <tr><td><strong>Status:</strong></td><td><span class="status ${run.status}">${run.status}</span></td></tr>
            <tr><td><strong>Duration:</strong></td><td>${run.progress.elapsedTime}s</td></tr>
        </table>

        <h2>Performance Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Requests</div>
                <div class="metric-value">${run.progress.totalRequests.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Successful Requests</div>
                <div class="metric-value">${run.progress.successfulRequests.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Failed Requests</div>
                <div class="metric-value">${run.progress.failedRequests.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Success Rate</div>
                <div class="metric-value">${run.progress.totalRequests > 0 ? ((run.progress.successfulRequests / run.progress.totalRequests) * 100).toFixed(2) : 0}%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Current RPS</div>
                <div class="metric-value">${run.progress.currentRps.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average Latency</div>
                <div class="metric-value">${run.progress.averageLatency.toFixed(2)}ms</div>
            </div>
        </div>

        ${run.summary ? `
        <h2>Final Summary</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Total Requests</div>
                <div class="metric-value">${run.summary.totalRequests.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average RPS</div>
                <div class="metric-value">${run.summary.averageRps.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">P99 Latency</div>
                <div class="metric-value">${run.summary.p99Latency}ms</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Error Rate</div>
                <div class="metric-value">${run.summary.errorRate.toFixed(2)}%</div>
            </div>
        </div>
        ` : ''}

        ${run.error ? `
        <h2>Error Information</h2>
        <div class="error-section">
            <div class="error-title">Error: ${run.error.message}</div>
            ${run.error.details ? `<div><strong>Details:</strong> ${typeof run.error.details === 'string' ? run.error.details : JSON.stringify(run.error.details)}</div>` : ''}
            <div><strong>Timestamp:</strong> ${new Date(run.error.timestamp).toLocaleString()}</div>
        </div>
        ` : ''}

        ${logs.length > 0 ? `
        <h2>Console Logs</h2>
        <div class="logs-container">
            ${logs.slice(-100).map((log) => {
              const timestamp = new Date().toLocaleTimeString();
              let logClass = 'info';
              if (log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')) {
                logClass = 'error';
              } else if (log.toLowerCase().includes('warning') || log.toLowerCase().includes('warn')) {
                logClass = 'warning';
              } else if (log.toLowerCase().includes('success') || log.toLowerCase().includes('completed')) {
                logClass = 'success';
              }
              
              return `<div class="log-entry ${logClass}">
                <span class="timestamp">[${timestamp}]</span>
                ${log}
              </div>`;
            }).join('')}
        </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em;">
            <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `load-test-report-${run._id}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw new Error('Failed to generate HTML report');
    }
  }

  static async exportLogs(logs: string[]): Promise<void> {
    try {
      const logContent = logs.map((log) => {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${log}`;
      }).join('\n');

      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `load-test-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting logs:', error);
      throw new Error('Failed to export logs');
    }
  }
} 