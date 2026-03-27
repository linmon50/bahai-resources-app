/**
 * Resizes and compresses an image file on the client-side.
 * @param {File} file The original image file.
 * @param {number} maxWidth Maximum width (aspect ratio preserved).
 * @param {number} quality JPEG quality (0.0 to 1.0).
 * @returns {Promise<File>} A new compressed File object.
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.7) {
  // If it's not an image, return original
  if (!file.type.startsWith('image/')) return file;
  
  // If it's already small enough (under 400KB), don't bother compressing hard
  if (file.size < 400 * 1024) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic (maintain aspect ratio)
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Fill white background for JPEGs (transparency fix)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
