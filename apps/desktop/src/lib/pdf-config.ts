// src/lib/pdf-config.ts
// PDF.js configuration with annotation support

import { pdfjs } from 'react-pdf';

// Import required styles for annotations (form fields, links, etc.)
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

/**
 * Configure PDF.js worker
 * This ensures the worker version matches the library version
 */
export function initializePdfJs() {
  // Use CDN with exact version match
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  
  console.log(`📚 PDF.js initialized with version ${pdfjs.version}`);
}

// Auto-initialize on import
initializePdfJs();

export { pdfjs };