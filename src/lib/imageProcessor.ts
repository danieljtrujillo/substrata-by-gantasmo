/**
 * Utility for processing images for laser engraving.
 * Includes grayscale conversion, thresholding, dithering, and edge detection.
 */

export interface ImageProcessOptions {
  brightness: number; // -1 to 1
  contrast: number; // -1 to 1
  threshold: number; // 0 to 255
  dither: boolean;
  invert: boolean;
  edgeDetection: boolean;
  rotate: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
}

export const processImageForLaser = async (
  imageSource: string | HTMLImageElement,
  options: ImageProcessOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Could not get canvas context");

      // Handle orientation
      const is90 = options.rotate === 90 || options.rotate === 270;
      canvas.width = is90 ? img.height : img.width;
      canvas.height = is90 ? img.width : img.height;

      // Center and rotate
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((options.rotate * Math.PI) / 180);
      
      // Flip
      const scaleX = options.flipH ? -1 : 1;
      const scaleY = options.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);
      
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Grayscale, Brightness, Contrast, Invert
      const brightness = options.brightness || 0;
      const contrast = options.contrast || 0;
      const threshold = options.threshold ?? 128;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Luma grayscale
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Brightness
        gray += brightness * 255;

        // Contrast
        let factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        if (isNaN(factor) || !isFinite(factor)) factor = 1;
        gray = factor * (gray - 128) + 128;

        // Clamp
        gray = Math.max(0, Math.min(255, gray));

        if (options.invert) {
          gray = 255 - gray;
        }

        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      // 2. Filter application
      if (options.edgeDetection) {
          const sobelData = new Uint8ClampedArray(data.length);
          const width = canvas.width;
          const height = canvas.height;
          
          for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                  const i = (y * width + x) * 4;
                  
                  // Sobel kernels
                  const h = 
                      -1 * data[((y-1)*width + (x-1))*4] + 1 * data[((y-1)*width + (x+1))*4] +
                      -2 * data[(y*width + (x-1))*4] + 2 * data[(y*width + (x+1))*4] +
                      -1 * data[((y+1)*width + (x-1))*4] + 1 * data[((y+1)*width + (x+1))*4];
                      
                  const v = 
                      -1 * data[((y-1)*width + (x-1))*4] + -2 * data[((y-1)*width + x)*4] + -1 * data[((y-1)*width + (x+1))*4] +
                      1 * data[((y+1)*width + (x-1))*4] + 2 * data[((y+1)*width + x)*4] + 1 * data[((y+1)*width + (x+1))*4];
                      
                  const mag = Math.sqrt(h*h + v*v);
                  sobelData[i] = sobelData[i+1] = sobelData[i+2] = mag > threshold ? 255 : 0;
                  sobelData[i+3] = 255;
              }
          }
          for (let i = 0; i < data.length; i++) data[i] = sobelData[i];
      } else if (options.dither) {
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const oldPixel = data[i];
            const newPixel = oldPixel < threshold ? 0 : 255;
            data[i] = data[i + 1] = data[i + 2] = newPixel;
            const error = oldPixel - newPixel;

            // Distribute error
            distributeError(data, x + 1, y, canvas.width, canvas.height, error * 7/16);
            distributeError(data, x - 1, y + 1, canvas.width, canvas.height, error * 3/16);
            distributeError(data, x, y + 1, canvas.width, canvas.height, error * 5/16);
            distributeError(data, x + 1, y + 1, canvas.width, canvas.height, error * 1/16);
          }
        }
      } else {
        // Simple Threshold
        for (let i = 0; i < data.length; i += 4) {
          const val = data[i] < threshold ? 0 : 255;
          data[i] = data[i + 1] = data[i + 2] = val;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = typeof imageSource === "string" ? imageSource : imageSource.src;
  });
};

function distributeError(data: Uint8ClampedArray, x: number, y: number, width: number, height: number, error: number) {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    const i = (y * width + x) * 4;
    data[i] = Math.max(0, Math.min(255, data[i] + error));
    data[i + 1] = data[i];
    data[i + 2] = data[i];
  }
}

/**
 * Generate an SVG silhouette outline from an image.
 * Uses alpha channel (or luminance for opaque images) + edge detection
 * to create a vector cut path suitable for laser cutting stickers to shape.
 */
export const generateEdgeSilhouette = async (
  imageSource: string,
  threshold: number = 128,
  simplify: number = 2
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Could not get canvas context");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Create binary mask: 1 = content, 0 = background
      const mask = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 10) {
          mask[i / 4] = 0; // transparent = background
        } else {
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          mask[i / 4] = luma < threshold ? 1 : (alpha > 200 ? 1 : 0);
        }
      }

      // Find boundary pixels (content pixels adjacent to background)
      const edgePoints: { x: number; y: number }[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x] === 0) continue;
          // Check 4-neighbors for background
          const neighbors = [
            y > 0 ? mask[(y - 1) * w + x] : 0,
            y < h - 1 ? mask[(y + 1) * w + x] : 0,
            x > 0 ? mask[y * w + (x - 1)] : 0,
            x < w - 1 ? mask[y * w + (x + 1)] : 0,
          ];
          if (neighbors.some(n => n === 0)) {
            edgePoints.push({ x, y });
          }
        }
      }

      if (edgePoints.length === 0) {
        // Fallback: rectangular outline
        resolve(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
          <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="red" stroke-width="0.5"/>
        </svg>`);
        return;
      }

      // Order points by angle from centroid to create continuous path
      const cx = edgePoints.reduce((s, p) => s + p.x, 0) / edgePoints.length;
      const cy = edgePoints.reduce((s, p) => s + p.y, 0) / edgePoints.length;
      edgePoints.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

      // Simplify: take every Nth point
      const simplified = edgePoints.filter((_, i) => i % simplify === 0);
      if (simplified.length < 3) {
        resolve(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
          <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="red" stroke-width="0.5"/>
        </svg>`);
        return;
      }

      // Build SVG path
      let pathD = `M ${simplified[0].x} ${simplified[0].y}`;
      for (let i = 1; i < simplified.length; i++) {
        pathD += ` L ${simplified[i].x} ${simplified[i].y}`;
      }
      pathD += ' Z';

      // Add offset margin (1px outward from centroid)
      const offsetPath = simplified.map(p => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: p.x + (dx / dist) * 2, y: p.y + (dy / dist) * 2 };
      });
      let cutD = `M ${offsetPath[0].x.toFixed(1)} ${offsetPath[0].y.toFixed(1)}`;
      for (let i = 1; i < offsetPath.length; i++) {
        cutD += ` L ${offsetPath[i].x.toFixed(1)} ${offsetPath[i].y.toFixed(1)}`;
      }
      cutD += ' Z';

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">
  <!-- Inner silhouette (reference) -->
  <path d="${pathD}" fill="none" stroke="#0066ff" stroke-width="0.3" opacity="0.5"/>
  <!-- Outer cut line (laser cut path with 2px offset) -->
  <path d="${cutD}" fill="none" stroke="red" stroke-width="0.5"/>
  <!-- Cut line: red = laser cut path | Blue = design boundary -->
</svg>`;

      resolve(svg);
    };
    img.onerror = reject;
    img.src = imageSource;
  });
};

/**
 * Extracts a 2D profile from an image and generates OpenSCAD code to extrude it as a 3D solid.
 * Reuses the same boundary-extraction pipeline as generateEdgeSilhouette.
 */
export interface ExtrusionResult {
  openscad: string;
  svgProfile: string;
  pointCount: number;
  boundingBox: { width: number; height: number };
}

export const extractProfileForExtrusion = async (
  imageSource: string,
  options: {
    threshold?: number;
    simplify?: number;
    extrudeHeight?: number;
    scaleMm?: number;
  } = {}
): Promise<ExtrusionResult> => {
  const { threshold = 128, simplify = 3, extrudeHeight = 10, scaleMm = 50 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Could not get canvas context");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Binary mask
      const mask = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 10) { mask[i / 4] = 0; continue; }
        const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        mask[i / 4] = luma < threshold ? 1 : (alpha > 200 ? 1 : 0);
      }

      // Extract boundary pixels
      const edgePoints: { x: number; y: number }[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x] === 0) continue;
          const neighbors = [
            y > 0 ? mask[(y - 1) * w + x] : 0,
            y < h - 1 ? mask[(y + 1) * w + x] : 0,
            x > 0 ? mask[y * w + (x - 1)] : 0,
            x < w - 1 ? mask[y * w + (x + 1)] : 0,
          ];
          if (neighbors.some(n => n === 0)) edgePoints.push({ x, y });
        }
      }

      if (edgePoints.length < 3) {
        return reject("Could not extract enough boundary points from image");
      }

      // Sort by angle from centroid
      const cx = edgePoints.reduce((s, p) => s + p.x, 0) / edgePoints.length;
      const cy = edgePoints.reduce((s, p) => s + p.y, 0) / edgePoints.length;
      edgePoints.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

      // Simplify
      const simplified = edgePoints.filter((_, i) => i % simplify === 0);
      if (simplified.length < 3) {
        return reject("Not enough points after simplification");
      }

      // Scale to mm: normalize so widest dimension = scaleMm
      const minX = Math.min(...simplified.map(p => p.x));
      const maxX = Math.max(...simplified.map(p => p.x));
      const minY = Math.min(...simplified.map(p => p.y));
      const maxY = Math.max(...simplified.map(p => p.y));
      const pw = maxX - minX || 1;
      const ph = maxY - minY || 1;
      const scale = scaleMm / Math.max(pw, ph);
      const scaledH = ph * scale;

      // Center and flip Y (image Y is top-down, OpenSCAD Y is bottom-up)
      const points = simplified.map(p => ({
        x: parseFloat(((p.x - minX) * scale).toFixed(3)),
        y: parseFloat(((maxY - p.y) * scale).toFixed(3))
      }));

      // Generate OpenSCAD
      const pointsStr = points.map(p => `[${p.x}, ${p.y}]`).join(',\n    ');
      const openscad = `// Auto-generated from image profile extraction
// Bounding box: ${(pw * scale).toFixed(1)}mm x ${scaledH.toFixed(1)}mm x ${extrudeHeight}mm
// Point count: ${points.length}

linear_extrude(height = ${extrudeHeight}, center = false, convexity = 10) {
  polygon(points = [
    ${pointsStr}
  ]);
}`;

      // Generate SVG profile for preview
      const svgPoints = points.map(p => `${p.x},${(scaledH - p.y).toFixed(3)}`).join(' ');
      const svgW = (pw * scale).toFixed(1);
      const svgH = scaledH.toFixed(1);
      const svgProfile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}mm" height="${svgH}mm">
  <polygon points="${svgPoints}" fill="none" stroke="#0066ff" stroke-width="0.3"/>
</svg>`;

      resolve({
        openscad,
        svgProfile,
        pointCount: points.length,
        boundingBox: { width: pw * scale, height: scaledH }
      });
    };
    img.onerror = reject;
    img.src = imageSource;
  });
};
