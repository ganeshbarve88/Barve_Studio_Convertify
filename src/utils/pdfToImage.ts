import JSZip from 'jszip';
import { pdfjsLib } from './pdfHelper';
import { PdfPageItem, PdfToImageSettings } from '../types';

export interface LoadedPdfData {
  pdfDoc: any;
  numPages: number;
  initialPages: PdfPageItem[];
}

export async function loadPdfDocument(
  file: File,
  onThumbnailProgress?: (loaded: number, total: number) => void
): Promise<LoadedPdfData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PdfPageItem[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    
    // Generate quick thumbnail with scale capped for fast preview
    const thumbScale = Math.min(200 / viewport.width, 260 / viewport.height, 0.4);
    const thumbViewport = page.getViewport({ scale: Math.max(thumbScale, 0.2) });
    
    const canvas = document.createElement('canvas');
    canvas.width = thumbViewport.width;
    canvas.height = thumbViewport.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await (page.render as any)({
        canvasContext: ctx,
        viewport: thumbViewport,
        canvas,
      }).promise;
    }

    const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);

    pages.push({
      pageNumber: i,
      selected: true,
      thumbnailUrl: thumbUrl,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
    });

    if (onThumbnailProgress) {
      onThumbnailProgress(i, numPages);
    }
  }

  return {
    pdfDoc,
    numPages,
    initialPages: pages,
  };
}

export async function renderPdfPageToBlob(
  pdfDoc: any,
  pageNumber: number,
  settings: PdfToImageSettings
): Promise<{ blob: Blob; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: settings.scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  if (settings.backgroundColor === 'white' || settings.format !== 'png') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await (page.render as any)({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  const mimeType =
    settings.format === 'png'
      ? 'image/png'
      : settings.format === 'jpeg'
      ? 'image/jpeg'
      : 'image/webp';

  const quality = settings.format === 'png' ? undefined : settings.quality;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error(`Failed to convert page ${pageNumber} to image`));
      },
      mimeType,
      quality
    );
  });

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}

export async function buildImagesZip(
  images: { pageNumber: number; blob: Blob }[],
  baseName: string,
  extension: string
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(baseName) || zip;

  images.forEach(({ pageNumber, blob }) => {
    const filename = `${baseName}_page_${String(pageNumber).padStart(3, '0')}.${extension}`;
    folder.file(filename, blob);
  });

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
