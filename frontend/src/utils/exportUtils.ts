/**
 * Export utilities for canvas-based flow diagrams
 * Supports PNG, SVG, and PDF export formats
 */

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf';
  quality?: number; // 0.1 to 1.0 for PNG
  scale?: number; // Scale factor for export
  backgroundColor?: string;
  filename?: string;
  includeGrid?: boolean;
}

export interface ExportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate the bounding box of all components and connections
 */
export function calculateCanvasBounds(svgElement: SVGSVGElement): ExportBounds {
  const bbox = svgElement.getBBox();
  
  // Add padding around the content
  const padding = 50;
  
  return {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + (padding * 2),
    height: bbox.height + (padding * 2),
  };
}

/**
 * Clone SVG element and prepare it for export
 */
export function prepareSVGForExport(
  svgElement: SVGSVGElement, 
  bounds: ExportBounds,
  options: ExportOptions
): SVGSVGElement {
  // Clone the SVG element
  const clonedSVG = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Set viewBox to the calculated bounds
  clonedSVG.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  clonedSVG.setAttribute('width', bounds.width.toString());
  clonedSVG.setAttribute('height', bounds.height.toString());
  
  // Set background color if specified
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', bounds.x.toString());
    rect.setAttribute('y', bounds.y.toString());
    rect.setAttribute('width', bounds.width.toString());
    rect.setAttribute('height', bounds.height.toString());
    rect.setAttribute('fill', options.backgroundColor);
    clonedSVG.insertBefore(rect, clonedSVG.firstChild);
  }
  
  // Remove grid if not included in export
  if (!options.includeGrid) {
    const gridElements = clonedSVG.querySelectorAll('.grid-background');
    gridElements.forEach(element => element.remove());
  }
  
  // Remove interactive elements (selection boxes, hover states, etc.)
  const interactiveElements = clonedSVG.querySelectorAll(
    '.selection-box, .selection-bounds, .connection-point, .temp-connection'
  );
  interactiveElements.forEach(element => element.remove());
  
  // Ensure all styles are inline (for better compatibility)
  inlineStyles(clonedSVG);
  
  return clonedSVG;
}

/**
 * Convert inline styles to attributes for better SVG compatibility
 */
function inlineStyles(svgElement: SVGSVGElement) {
  const elements = svgElement.querySelectorAll('*');
  
  elements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const htmlElement = element as HTMLElement;
    
    // Common style properties to inline
    const styleProps = [
      'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity',
      'font-family', 'font-size', 'font-weight', 'text-anchor'
    ];
    
    styleProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal') {
        element.setAttribute(prop, value);
      }
    });
    
    // Remove style attribute to avoid conflicts
    htmlElement.removeAttribute('style');
  });
}

/**
 * Export SVG as SVG file
 */
export async function exportAsSVG(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  const bounds = calculateCanvasBounds(svgElement);
  const exportSVG = prepareSVGForExport(svgElement, bounds, options);
  
  // Convert to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(exportSVG);
  
  // Add XML declaration and DOCTYPE
  const fullSVG = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${svgString}`;
  
  // Create and download file
  const blob = new Blob([fullSVG], { type: 'image/svg+xml' });
  downloadBlob(blob, options.filename || 'flow-diagram.svg');
}

/**
 * Export SVG as PNG file
 */
export async function exportAsPNG(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  const bounds = calculateCanvasBounds(svgElement);
  const exportSVG = prepareSVGForExport(svgElement, bounds, options);
  
  const scale = options.scale || 2; // Default to 2x for high quality
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  canvas.width = bounds.width * scale;
  canvas.height = bounds.height * scale;
  
  // Set background color
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Convert SVG to data URL
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(exportSVG);
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
  
  // Create image and draw to canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and download
      canvas.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, options.filename || 'flow-diagram.png');
            resolve();
          } else {
            reject(new Error('Failed to create PNG blob'));
          }
        },
        'image/png',
        options.quality || 0.9
      );
    };
    img.onerror = () => reject(new Error('Failed to load SVG image'));
    img.src = svgDataUrl;
  });
}

/**
 * Export SVG as PDF file (using jsPDF)
 */
export async function exportAsPDF(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  // For PDF export, we'll first convert to PNG and then embed in PDF
  // This approach ensures better compatibility
  
  const bounds = calculateCanvasBounds(svgElement);
  const exportSVG = prepareSVGForExport(svgElement, bounds, options);
  
  const scale = options.scale || 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  canvas.width = bounds.width * scale;
  canvas.height = bounds.height * scale;
  
  // Set background color
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Convert SVG to data URL
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(exportSVG);
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      try {
        // Dynamic import of jsPDF to avoid bundle size issues
        const { jsPDF } = await import('jspdf');
        
        // Calculate PDF dimensions (A4 or custom)
        const pdfWidth = Math.max(210, bounds.width * 0.75); // mm, minimum A4 width
        const pdfHeight = Math.max(297, bounds.height * 0.75); // mm, minimum A4 height
        
        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        
        // Convert canvas to image data
        const imgData = canvas.toDataURL('image/png', options.quality || 0.9);
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Save PDF
        pdf.save(options.filename || 'flow-diagram.pdf');
        resolve();
      } catch (error) {
        reject(new Error(`PDF export failed: ${error}`));
      }
    };
    img.onerror = () => reject(new Error('Failed to load SVG image'));
    img.src = svgDataUrl;
  });
}

/**
 * Generic export function that delegates to specific format handlers
 */
export async function exportCanvas(
  svgElement: SVGSVGElement,
  options: ExportOptions
): Promise<void> {
  try {
    switch (options.format) {
      case 'svg':
        await exportAsSVG(svgElement, options);
        break;
      case 'png':
        await exportAsPNG(svgElement, options);
        break;
      case 'pdf':
        await exportAsPDF(svgElement, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get suggested filename based on current date and format
 */
export function getSuggestedFilename(format: string, projectName?: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const baseName = projectName ? `${projectName}-flow` : 'flow-diagram';
  return `${baseName}-${dateStr}-${timeStr}.${format}`;
}