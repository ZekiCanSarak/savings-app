/**
 * Web version of share-image.ts (same exports). Must be called straight from
 * a tap: browsers only allow the share sheet in response to one, so the image
 * is made beforehand. Phones get the share sheet; computers download it.
 */
export async function shareImage(fileName: string, pngBase64: string): Promise<void> {
  const bytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
  const file = new File([bytes], fileName, { type: 'image/png' });
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      // Closing the share sheet isn't an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
