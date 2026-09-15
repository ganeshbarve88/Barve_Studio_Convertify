export type AppMode = 'pdf-to-image' | 'image-to-pdf';

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export type PageSizeOption = 'a4' | 'letter' | 'legal' | 'a3' | 'fit-image';

export type PageOrientation = 'auto' | 'portrait' | 'landscape';

export type MarginOption = 'none' | 'small' | 'normal' | 'large';

export type ImageFitMode = 'contain' | 'cover' | 'center';

export interface PdfPageItem {
  pageNumber: number;
  selected: boolean;
  thumbnailUrl: string;
  width: number;
  height: number;
  renderedBlob?: Blob;
  renderedUrl?: string;
  isRendering?: boolean;
}

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

export interface PdfToImageSettings {
  format: ImageFormat;
  quality: number; // 0.1 to 1.0
  scale: number; // 1, 1.5, 2, 3
  backgroundColor: 'white' | 'transparent';
}

export interface ImageToPdfSettings {
  pageSize: PageSizeOption;
  orientation: PageOrientation;
  margin: MarginOption;
  fitMode: ImageFitMode;
  quality: number; // 0.5 to 1.0
  fileName: string;
}
