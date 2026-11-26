export type ImageCompressOptions = {
  maxDimension?: number;
  quality?: number;
  skipIfSmallerThanBytes?: number;
};

/**
 * Compresses raster images (JPEG/PNG/WebP) on the client using an offscreen Canvas
 * before uploading, reducing network transfer time and server memory pressure.
 * Non-raster files (e.g., PDF) or animated GIFs are returned untouched.
 */
export async function compressImageForUpload(
  file: File,
  options: ImageCompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 1600,
    quality = 0.82,
    skipIfSmallerThanBytes = 200 * 1024,
  } = options;

  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  if (file.size <= skipIfSmallerThanBytes) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? quality : undefined)
    );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const ext = outputType === 'image/png' ? '.png' : '.jpg';
    return new File([blob], `${baseName}${ext}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
