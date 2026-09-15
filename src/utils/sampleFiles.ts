import { jsPDF } from 'jspdf';

export function createSamplePdf(): File {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Page 1: Title & Document Info
  doc.setFillColor(243, 244, 246);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFillColor(30, 41, 59);
  doc.rect(20, 25, 170, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Sample Offline Document', 30, 42);

  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);
  doc.text('Client-Side In-Browser Conversion Test • Page 1 of 3', 30, 50);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.text('1. Secure Local Processing', 20, 75);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const text1 =
    'This PDF was generated directly inside your browser. When you convert this PDF to images (PNG, JPEG, WebP), all rendering is performed client-side using HTML5 Canvas and WebAssembly/Web Workers. No data is sent to external servers.';
  doc.text(doc.splitTextToSize(text1, 170), 20, 85);

  // Decorative color card
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(20, 110, 170, 60, 4, 4, 'FD');

  doc.setTextColor(67, 56, 202);
  doc.setFontSize(12);
  doc.text('Features Verified in this Document:', 30, 125);

  doc.setTextColor(55, 65, 81);
  doc.setFontSize(10);
  doc.text('• High-fidelity vector typography & anti-aliased curves', 35, 137);
  doc.text('• Multi-page batch extraction to PNG / JPG / WebP', 35, 147);
  doc.text('• Selectable resolution scaling up to 300 DPI print quality', 35, 157);

  // Page 2: Analytical Chart / Visual Diagram
  doc.addPage('a4', 'portrait');
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text('Page 2: Graphic & Metrics Layout', 20, 30);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Visual rendering test with charts and data blocks', 20, 38);

  // Mock bar chart
  const barHeights = [45, 75, 60, 90, 110, 85];
  const barLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startX = 35;
  const baseY = 140;

  doc.setDrawColor(226, 232, 240);
  doc.line(25, baseY, 185, baseY);

  barHeights.forEach((h, idx) => {
    const x = startX + idx * 25;
    doc.setFillColor(79, 70, 229);
    doc.rect(x, baseY - h, 16, h, 'F');

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text(barLabels[idx], x + 3, baseY + 6);
  });

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Weekly Extraction Efficiency (ms/page)', 25, 60);

  // Page 3: Summary & Notes
  doc.addPage('a4', 'portrait');
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text('Page 3: Notes & Certification', 20, 30);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 45, 170, 90, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text('Conversion Fidelity Verification', 30, 60);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'This page tests pagination, background fills, rounded corners, and fine borders.',
    30,
    72
  );
  doc.text('Notice how text remains crisp at 2x and 3x scale settings.', 30, 82);

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  doc.rect(30, 95, 40, 25);
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(9);
  doc.text('PASSED', 41, 110);

  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], 'Sample_Offline_Document.pdf', {
    type: 'application/pdf',
  });
}

export function createSampleImages(): File[] {
  const images: File[] = [];

  const specs = [
    {
      name: 'Sample_Image_1_Landscape.jpg',
      w: 800,
      h: 600,
      title: 'Landscape Photograph Test',
      colorA: '#3b82f6',
      colorB: '#1e40af',
      badge: 'Photo 1 of 3',
    },
    {
      name: 'Sample_Image_2_Portrait.jpg',
      w: 600,
      h: 800,
      title: 'Portrait Document Page',
      colorA: '#10b981',
      colorB: '#047857',
      badge: 'Photo 2 of 3',
    },
    {
      name: 'Sample_Image_3_Graphic.png',
      w: 700,
      h: 700,
      title: 'Infographic Test Asset',
      colorA: '#8b5cf6',
      colorB: '#6d28d9',
      badge: 'Photo 3 of 3',
    },
  ];

  specs.forEach((spec) => {
    const canvas = document.createElement('canvas');
    canvas.width = spec.w;
    canvas.height = spec.h;
    const ctx = canvas.getContext('2d')!;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, spec.w, spec.h);
    grad.addColorStop(0, spec.colorA);
    grad.addColorStop(1, spec.colorB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, spec.w, spec.h);

    // Decorative grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < spec.w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, spec.h);
      ctx.stroke();
    }
    for (let y = 0; y < spec.h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(spec.w, y);
      ctx.stroke();
    }

    // Card in center
    const cardW = spec.w * 0.75;
    const cardH = spec.h * 0.5;
    const cardX = (spec.w - cardW) / 2;
    const cardY = (spec.h - cardH) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    // Typography
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(spec.title, spec.w / 2, cardY + cardH * 0.4);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px sans-serif';
    ctx.fillText(
      `${spec.w} × ${spec.h} px • Ready for Image to PDF Assembly`,
      spec.w / 2,
      cardY + cardH * 0.58
    );

    // Badge
    ctx.fillStyle = spec.colorA;
    ctx.beginPath();
    ctx.roundRect(spec.w / 2 - 60, cardY + cardH * 0.72, 120, 30, 15);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(spec.badge, spec.w / 2, cardY + cardH * 0.72 + 19);

    const isPng = spec.name.endsWith('.png');
    const mime = isPng ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mime, 0.92);

    // Convert dataUrl to File
    const byteString = atob(dataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mime });
    images.push(new File([blob], spec.name, { type: mime }));
  });

  return images;
}
