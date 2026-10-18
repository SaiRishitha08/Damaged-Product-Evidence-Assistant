/**
 * Utility to convert image paths, URLs, or data URLs to base64 DataURL and raw base64 string
 * for Google Gemini API inlineData and jsPDF addImage.
 * Works seamlessly in both Browser and Node.js environments.
 */

export async function resolveImageBase64(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;

  // Case 1: Already a data URL
  if (src.startsWith('data:image')) {
    const parts = src.split(',');
    const mimeMatch = src.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    return {
      dataUrl: src,
      base64Data: parts[1] || '',
      mimeType: mimeType
    };
  }

  // Case 2: In Browser environment, use Image & Canvas
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const base64Data = dataUrl.split(',')[1] || '';
          resolve({
            dataUrl: dataUrl,
            base64Data: base64Data,
            mimeType: 'image/jpeg'
          });
        } catch (err) {
          console.warn('Canvas conversion failed for image src:', src, err);
          resolve(null);
        }
      };
      img.onerror = (err) => {
        console.warn('Image failed to load in browser:', src, err);
        resolve(null);
      };
      img.src = src;
    });
  }

  // Case 3: In Node.js environment (e.g. testing / SSR)
  if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fsPkg = 'fs';
      const pathPkg = 'path';
      const fs = await import(/* @vite-ignore */ fsPkg);
      const path = await import(/* @vite-ignore */ pathPkg);
      const cleanPath = src.startsWith('/') ? src.slice(1) : src;
      const candidates = [
        path.resolve(cleanPath),
        path.resolve('public', cleanPath)
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const ext = path.extname(p).toLowerCase().replace('.', '') || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          const b64 = buf.toString('base64');
          return {
            dataUrl: `data:${mime};base64,${b64}`,
            base64Data: b64,
            mimeType: mime
          };
        }
      }
    } catch (e) {
      // Ignore Node.js fs errors
    }
  }

  return null;
}
