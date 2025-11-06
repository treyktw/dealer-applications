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
  try {
    // In production builds, use CDN with exact version match
    // The CDN URL is reliable and automatically matches the pdfjs version
    const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    // Configure additional options for better performance
    pdfjs.GlobalWorkerOptions.workerPort = null; // Let browser choose

    console.log(`📚 PDF.js initialized successfully`);
    console.log(`   Version: ${pdfjs.version}`);
    console.log(`   Worker: ${workerSrc}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize PDF.js:', error);
    return false;
  }
}

// Auto-initialize on import
const initialized = initializePdfJs();

if (!initialized) {
  console.warn('⚠️ PDF.js initialization failed. PDFs may not render correctly.');
}

export { pdfjs };