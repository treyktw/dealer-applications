// public/pdfjs-viewer/fix-field-heights.js
// Dynamically fix field heights to prevent text cutoff

(() => {
  console.log('🔧 Field height fixer initialized');

  // Wait for viewer to be ready
  const waitForViewer = setInterval(() => {
    if (typeof PDFViewerApplication !== 'undefined' && PDFViewerApplication.pdfDocument) {
      clearInterval(waitForViewer);
      
      // Wait a bit for rendering to complete
      setTimeout(() => {
        fixAllFieldHeights();
        setupMutationObserver();
      }, 500);
    }
  }, 100);

  function fixAllFieldHeights() {
    console.log('🔧 Fixing field heights...');

    // Find all input fields in annotation layer
    const inputs = document.querySelectorAll('.annotationLayer input[type="text"], .annotationLayer textarea');
    
    let fixedCount = 0;

    inputs.forEach((input) => {
      if (fixFieldHeight(input)) {
        fixedCount++;
      }
    });

    console.log(`✅ Fixed ${fixedCount} fields with height issues`);
  }

  function fixFieldHeight(input) {
    try {
      // Get the parent section (field container)
      const section = input.closest('section');
      if (!section) return false;

      // Get current dimensions
      const computedStyle = window.getComputedStyle(input);
      const currentHeight = parseFloat(computedStyle.height);
      const fontSize = parseFloat(computedStyle.fontSize);
      const lineHeight = parseFloat(computedStyle.lineHeight);

      // Calculate minimum height needed for text
      // Font size + padding + border + buffer
      const minHeight = Math.max(fontSize * 1.6, 20);

      // If field is too short, fix it
      if (currentHeight < minHeight) {
        console.log(`🔧 Fixing field: ${input.name || 'unnamed'} (${currentHeight}px → ${minHeight}px)`);
        
        // Apply fixes
        input.style.height = 'auto';
        input.style.minHeight = `${minHeight}px`;
        input.style.paddingTop = '2px';
        input.style.paddingBottom = '2px';
        input.style.lineHeight = '1.2';
        input.style.boxSizing = 'border-box';
        
        // Also fix the section container if needed
        const sectionHeight = parseFloat(window.getComputedStyle(section).height);
        if (sectionHeight < minHeight) {
          section.style.height = 'auto';
          section.style.minHeight = `${minHeight}px`;
        }

        return true;
      }

      // Check if text is being clipped
      if (input.scrollHeight > input.clientHeight + 2) {
        console.log(`🔧 Text clipped in field: ${input.name || 'unnamed'}, expanding...`);
        
        input.style.height = 'auto';
        input.style.minHeight = `${input.scrollHeight + 4}px`;
        
        return true;
      }

      return false;

    } catch (err) {
      console.warn('⚠️ Error fixing field height:', err);
      return false;
    }
  }

  function setupMutationObserver() {
    // Watch for new fields being added (page changes, etc)
    const observer = new MutationObserver((mutations) => {
      let needsFix = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && 
              (node.classList?.contains('annotationLayer') || 
               node.querySelector?.('.annotationLayer'))) {
            needsFix = true;
          }
        });
      });

      if (needsFix) {
        setTimeout(fixAllFieldHeights, 200);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('✅ Mutation observer set up for dynamic fields');
  }

  // Also fix fields when window resizes or zooms
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(fixAllFieldHeights, 300);
  });

  // Fix fields when user types (in case content causes clipping)
  document.addEventListener('input', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      setTimeout(() => fixFieldHeight(e.target), 50);
    }
  }, true);

  console.log('✅ Field height fixer ready');
})();