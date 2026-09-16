import { ScanFilter } from '../types';

/**
 * Applies rotation and image processing filters (Document B&W, Grayscale, Color Boost, Original)
 * to a base64/dataURL image using HTML5 Canvas.
 */
export async function processScannedImage(
  dataUrl: string,
  filter: ScanFilter,
  rotation: number = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const targetWidth = isRotated90or270 ? img.height : img.width;
      const targetHeight = isRotated90or270 ? img.width : img.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Handle rotation around center
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      if (filter === 'original') {
        resolve(canvas.toDataURL('image/jpeg', 0.92));
        return;
      }

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const len = data.length;

      if (filter === 'grayscale') {
        for (let i = 0; i < len; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
      } else if (filter === 'document') {
        // High-contrast clean black & white document filter (CamScanner style)
        for (let i = 0; i < len; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Dynamic curve: push light grays/shadows to pure white (paper), keep dark inks crisp
          let adjusted: number;
          if (gray > 140) {
            adjusted = Math.min(255, 255 - (255 - gray) * 0.25);
          } else if (gray < 90) {
            adjusted = Math.max(0, gray * 0.7);
          } else {
            // steep S-curve between 90 and 140
            const t = (gray - 90) / 50;
            adjusted = t * 240 + (1 - t) * 60;
          }
          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }
      } else if (filter === 'contrast') {
        // Enhanced Color Document (whiten paper background while enhancing ink colors & stamps)
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          // If close to white/light gray background, lighten towards paper white
          if (brightness > 155) {
            const boost = 1 + (brightness - 155) / 100 * 0.5;
            data[i] = Math.min(255, r * boost);
            data[i + 1] = Math.min(255, g * boost);
            data[i + 2] = Math.min(255, b * boost);
          } else {
            // Boost saturation and contrast for text, signatures, and stamps
            const factor = 1.15;
            data[i] = Math.max(0, Math.min(255, ((r - 128) * factor) + 128));
            data[i + 1] = Math.max(0, Math.min(255, ((g - 128) * factor) + 128));
            data[i + 2] = Math.max(0, Math.min(255, ((b - 128) * factor) + 128));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('Failed to load image for processing'));
    img.src = dataUrl;
  });
}
