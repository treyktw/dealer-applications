// public/pdfjs-viewer/field-change-listener.js
// Add this script to capture field changes in PDF.js viewer and send to parent window

(() => {
  console.log('📝 Field change listener initialized');

  let fieldListenersSetup = false;
  let pdfViewer = null;

  // Wait for PDFViewerApplication to be ready
  const waitForViewer = setInterval(() => {
    if (typeof PDFViewerApplication !== 'undefined' && PDFViewerApplication.pdfDocument) {
      clearInterval(waitForViewer);
      setupFieldListeners();
    }
  }, 100);

  // Also listen for when PDF is loaded
  if (typeof PDFViewerApplication !== 'undefined') {
    const originalSetDocument = PDFViewerApplication.setDocument;
    PDFViewerApplication.setDocument = function(...args) {
      const result = originalSetDocument.apply(this, args);
      if (!fieldListenersSetup) {
        setTimeout(() => setupFieldListeners(), 500);
      }
      return result;
    };
  }

  function setupFieldListeners() {
    if (fieldListenersSetup) return;
    
    console.log('✅ PDF viewer ready, setting up field listeners');
    fieldListenersSetup = true;

    // Method 1: Listen for DOM events on annotation layer
    document.addEventListener('input', handleFieldChange, true);
    document.addEventListener('change', handleFieldChange, true);
    document.addEventListener('blur', handleFieldChange, true);
    document.addEventListener('keyup', handleFieldChange, true);

    // Method 2: Listen for annotation layer mutations (for dynamically added fields)
    const annotationLayer = document.querySelector('#viewerContainer') || document.body;
    if (annotationLayer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Check if this is a form field
              const inputs = node.querySelectorAll?.('input, textarea, select');
              inputs?.forEach((input) => {
                input.addEventListener('input', handleFieldChange, true);
                input.addEventListener('change', handleFieldChange, true);
                input.addEventListener('blur', handleFieldChange, true);
              });
            }
          });
        });
      });

      observer.observe(annotationLayer, {
        childList: true,
        subtree: true,
      });
    }

    // Method 3: Use PDF.js annotation layer events if available
    if (typeof PDFViewerApplication !== 'undefined' && PDFViewerApplication.pdfViewer) {
      pdfViewer = PDFViewerApplication.pdfViewer;
      
      // Listen for annotation layer updates
      const pages = pdfViewer._pages || [];
      pages.forEach((page) => {
        if (page.annotationLayer) {
          page.annotationLayer.addEventListener('annotationLayerRendered', () => {
            // Re-setup listeners for new fields
            setTimeout(() => {
              const inputs = document.querySelectorAll('.annotationLayer input, .annotationLayer textarea, .annotationLayer select');
              inputs.forEach((input) => {
                input.addEventListener('input', handleFieldChange, true);
                input.addEventListener('change', handleFieldChange, true);
                input.addEventListener('blur', handleFieldChange, true);
              });
            }, 100);
          });
        }
      });
    }

    console.log('✅ Field listeners attached');
  }

  function handleFieldChange(event) {
    const target = event.target;
    
    // Check if it's a form element
    if (!target || !(target instanceof HTMLInputElement || 
                     target instanceof HTMLTextAreaElement || 
                     target instanceof HTMLSelectElement)) {
      return;
    }

    // Skip if not in annotation layer (PDF.js forms are usually there)
    if (!target.closest('.annotationLayer') && !target.closest('#viewerContainer')) {
      return;
    }

    // Get field name from various possible attributes
    // PDF.js typically uses the 'name' attribute for form fields
    let fieldName = target.name;
    
    if (!fieldName) {
      // Try other attributes
      fieldName = target.getAttribute('data-field-name') ||
                  target.getAttribute('aria-label') ||
                  target.id ||
                  target.getAttribute('title') ||
                  target.getAttribute('data-l10n-id');
    }

    // If still no name, try to extract from PDF.js widget annotation
    // Note: Most PDF.js forms should have the name attribute populated
    // This is primarily a fallback check
    if (!fieldName && target.parentElement) {
      const widget = target.closest('[data-annotation-id]');
      // Widget found but no name - PDF.js should handle this, but we'll log it
      if (widget && typeof PDFViewerApplication !== 'undefined' && PDFViewerApplication.pdfDocument) {
        // Could potentially extract from PDF.js annotation data in the future
      }
    }

    if (!fieldName) {
      console.warn('⚠️ Field changed but no name found:', target, {
        name: target.name,
        id: target.id,
        className: target.className,
        parent: target.parentElement?.tagName
      });
      return;
    }

    // Get field value
    let value;
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'radio') {
      value = target.checked ? target.value : null;
    } else {
      value = target.value || '';
    }

    console.log(`📝 Field changed: ${fieldName} = ${value}`, {
      type: target.type,
      checked: target.checked,
      value: target.value
    });

    // Send to parent window
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'pdf-field-change',
        fieldName: fieldName,
        value: value,
        timestamp: Date.now(),
        source: 'pdf-viewer'
      }, '*'); // Use specific origin in production
    }
  }

  // Listen for messages from parent to update fields or refresh PDF
  window.addEventListener('message', (event) => {
    if (typeof PDFViewerApplication === 'undefined') return;

    // Update specific field values without reload
    if (event.data?.type === 'pdf-update-fields') {
      const { fieldValues } = event.data;
      console.log('🔄 Updating fields in PDF viewer:', fieldValues);
      
      try {
        // Update fields directly in the DOM
        Object.entries(fieldValues).forEach(([fieldName, value]) => {
          // Find the field input element
          const fieldInput = document.querySelector(
            `.annotationLayer input[name="${fieldName}"], .annotationLayer textarea[name="${fieldName}"], .annotationLayer select[name="${fieldName}"]`
          ) || document.querySelector(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
          
          if (fieldInput) {
            if (fieldInput instanceof HTMLInputElement) {
              if (fieldInput.type === 'checkbox') {
                fieldInput.checked = Boolean(value);
              } else if (fieldInput.type === 'radio') {
                const radio = document.querySelector(`input[name="${fieldName}"][value="${value}"]`);
                if (radio) radio.checked = true;
              } else {
                fieldInput.value = String(value || '');
              }
            } else if (fieldInput instanceof HTMLTextAreaElement) {
              fieldInput.value = String(value || '');
            } else if (fieldInput instanceof HTMLSelectElement) {
              fieldInput.value = String(value || '');
            }
            
            // Trigger change event to update PDF.js internal state
            fieldInput.dispatchEvent(new Event('input', { bubbles: true }));
            fieldInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log(`✅ Updated field ${fieldName} = ${value}`);
          } else {
            console.warn(`⚠️ Field not found: ${fieldName}`);
          }
        });

        // Notify parent that update is complete
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'pdf-fields-updated',
            timestamp: Date.now()
          }, '*');
        }
      } catch (error) {
        console.error('❌ Failed to update fields:', error);
        
        // Fallback to full reload if update fails
        if (event.data?.fileUrl) {
          console.log('🔄 Falling back to full reload...');
          if (PDFViewerApplication.pdfDocument) {
            PDFViewerApplication.pdfDocument.destroy();
            PDFViewerApplication.open(event.data.fileUrl);
          }
        }
      }
      return;
    }

    // Full refresh request (fallback)
    if (event.data?.type === 'pdf-refresh-request') {
      console.log('🔄 Refreshing PDF viewer...');
      // Reload the current document
      if (PDFViewerApplication.pdfDocument) {
        PDFViewerApplication.pdfDocument.destroy();
        PDFViewerApplication.open(event.data.fileUrl || window.location.search.match(/file=([^&]+)/)?.[1]);
      }
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('input', handleFieldChange, true);
    document.removeEventListener('change', handleFieldChange, true);
    document.removeEventListener('blur', handleFieldChange, true);
    document.removeEventListener('keyup', handleFieldChange, true);
  });
})();