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
