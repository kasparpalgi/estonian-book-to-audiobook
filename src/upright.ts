// Phone cameras often store the photo sideways plus an EXIF "rotate me" flag.
// tesseract.js only reads big-endian flags (iPhone), not little-endian ones (many
// Androids), and then OCRs sideways text into gibberish. Browsers apply every
// flag when they draw an <img>, so we redraw the photo upright as a plain JPEG.
// The size cap keeps tesseract's memory in check on phones.
const MAX_SIDE = 3000

export async function upright(photo: Blob): Promise<Blob> {
  const url = URL.createObjectURL(photo)
  try {
    const img = new Image()
    img.src = url
    await img.decode().catch(() => {
      throw new Error('This file is not a photo the browser can open.')
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not prepare the photo.'))), 'image/jpeg', 0.95),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
