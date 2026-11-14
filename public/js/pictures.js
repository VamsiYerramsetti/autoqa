// Slide pictures, made in the speaker's browser after a file is added: PDF pages are photographed, PowerPoint
// slides (drawn by the server as SVG) are turned into small JPEGs. Used when material is added from the talk page.
// (The setup page has its own copy that also shows progress in its file list.)
export async function makePictures(talkId, auth, file, src, onProgress = () => {}) {
  const post = (n, blob) => fetch(`/api/talks/${talkId}/files/${src.id}/pages/${n}`, { method: 'POST', headers: { ...auth, 'Content-Type': 'image/jpeg' }, body: blob });
  try {
    if (src.pdf) {
      const pdfjs = await import('/vendor/pdfjs/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const total = Math.min(doc.numPages, 300);
      for (let n = 1; n <= total; n++) {
        onProgress(n, total);
        const page = await doc.getPage(n), base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2.5, 1400 / base.width) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), canvas, viewport }).promise;
        await post(n, await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82)));
      }
    }
    for (const [i, n] of (src.drawn || []).entries()) {
      onProgress(i + 1, src.drawn.length);
      const svg = await fetch(`/api/talks/${talkId}/files/${src.id}/drawn/${n}`, { headers: auth }).then((r) => (r.ok ? r.blob() : null));
      if (!svg) continue;
      const url = URL.createObjectURL(svg), img = new Image();
      img.src = url; await img.decode();
      const width = 1600, height = Math.round(width * (img.naturalHeight || 900) / (img.naturalWidth || 1600));
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, width, height); g.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob) await post(n, blob);
    }
  } catch (x) { console.warn('slide pictures skipped:', x); }
}
