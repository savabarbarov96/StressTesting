import React from 'react';
import type { Run } from '../services/api';
import { downloadHTMLReport, downloadPDFReport } from '../utils/reportUtils';

interface ReportExporterProps {
  run: Run;
  format: 'html' | 'pdf';
}

// This component is now just a placeholder since the utility functions have been moved to utils/reportUtils.ts
// The actual export functions are imported and used directly in the RunsList component

const ReportExporter: React.FC<ReportExporterProps> = () => {
  return null; // This is a utility component, no UI needed
};

export default ReportExporter;
export { downloadHTMLReport, downloadPDFReport }; 