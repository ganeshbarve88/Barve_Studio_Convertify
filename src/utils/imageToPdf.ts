import { jsPDF } from 'jspdf';
import { ImageFileItem, ImageToPdfSettings } from '../types';

const PAGE_DIMENSIONS_PT: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612.0, 792.0],
  legal: [612.0, 1008.0],
  a3: [841.89, 1190.55],
};

const MARGIN_PT: Record<string, number> = {
  none: 0,
  small: 14.17, // ~5mm
  normal: 28.35, // ~10mm
  large: 42.52, // ~15mm
};

// Helper to load and rotate image onto a canvas and return canvas + dimensions
export async function getOrientedImageData(
  item: ImageFileItem,
  quality: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const rotation = ((item.rotation % 360) + 360) % 360;
      const isRotated90or270 = rotation === 90 || rotation === 270;

      const destW = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const destH = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = destW;
      canvas.height = destH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, destW, destH);

      ctx.save();
      ctx.translate(destW / 2, destH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        -img.naturalWidth / 2,
        -img.naturalHeight / 2,
        img.naturalWidth,
        img.naturalHeight
      );
      ctx.restore();

      const format = item.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(format, quality);

      resolve({
        dataUrl,
        width: destW,
        height: destH,
      });
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${item.name}`));
    };

    img.src = item.previewUrl;
  });
}

export async function convertImagesToPdf(
  images: ImageFileItem[],
  settings: ImageToPdfSettings,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error('No images provided for PDF generation');
  }

  let pdf: jsPDF | null = null;
  const margin = MARGIN_PT[settings.margin] ?? 0;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const { dataUrl, width: imgW, height: imgH } = await getOrientedImageData(
      item,
      settings.quality
    );

    let pageW: number;
    let pageH: number;
    let orientation: 'p' | 'l' = 'p';

    if (settings.pageSize === 'fit-image') {
      // Page dimensions match the image dimensions exactly + margin
      pageW = imgW + margin * 2;
      pageH = imgH + margin * 2;
      orientation = pageW >= pageH ? 'l' : 'p';
    } else {
      const baseDim = PAGE_DIMENSIONS_PT[settings.pageSize] || PAGE_DIMENSIONS_PT.a4;
      let [dimW, dimH] = baseDim;

      if (settings.orientation === 'portrait') {
        pageW = Math.min(dimW, dimH);
        pageH = Math.max(dimW, dimH);
        orientation = 'p';
      } else if (settings.orientation === 'landscape') {
        pageW = Math.max(dimW, dimH);
        pageH = Math.min(dimW, dimH);
        orientation = 'l';
      } else {
        // Auto orientation based on image aspect ratio
        if (imgW > imgH) {
          pageW = Math.max(dimW, dimH);
          pageH = Math.min(dimW, dimH);
          orientation = 'l';
        } else {
          pageW = Math.min(dimW, dimH);
          pageH = Math.max(dimW, dimH);
          orientation = 'p';
        }
      }
    }

    // Available drawable area
    const availW = Math.max(1, pageW - margin * 2);
    const availH = Math.max(1, pageH - margin * 2);

    let drawW = availW;
    let drawH = availH;
    let drawX = margin;
    let drawY = margin;

    if (settings.pageSize === 'fit-image') {
      drawW = imgW;
      drawH = imgH;
      drawX = margin;
      drawY = margin;
    } else if (settings.fitMode === 'contain') {
      // Preserve aspect ratio inside availW x availH
      const imgAspect = imgW / imgH;
      const availAspect = availW / availH;

      if (imgAspect > availAspect) {
        drawW = availW;
        drawH = availW / imgAspect;
        drawX = margin;
        drawY = margin + (availH - drawH) / 2;
      } else {
        drawH = availH;
        drawW = availH * imgAspect;
        drawX = margin + (availW - drawW) / 2;
        drawY = margin;
      }
    } else if (settings.fitMode === 'cover') {
      // Fill full available area (may overflow margins slightly)
      drawW = availW;
      drawH = availH;
      drawX = margin;
      drawY = margin;
    } else if (settings.fitMode === 'center') {
      // 1:1 original scale if smaller, or scaled down if larger than available
      const scale = Math.min(1, availW / imgW, availH / imgH);
      drawW = imgW * scale;
      drawH = imgH * scale;
      drawX = margin + (availW - drawW) / 2;
      drawY = margin + (availH - drawH) / 2;
    }

    if (i === 0) {
      pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [pageW, pageH],
        compress: true,
      });
    } else {
      pdf!.addPage([pageW, pageH], orientation);
    }

    const imageFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    pdf!.addImage(dataUrl, imageFormat, drawX, drawY, drawW, drawH, undefined, 'FAST');

    if (onProgress) {
      onProgress(i + 1, images.length);
    }
  }

  if (!pdf) {
    throw new Error('Failed to create PDF document');
  }

  return pdf.output('blob');
}
