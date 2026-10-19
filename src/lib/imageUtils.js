// Shrinks a photo in the browser before upload: phone photos are often 5-12 MB,
// this brings them to a few hundred KB without visible quality loss.

const MAX_SIDE = 1600
const QUALITY = 0.82

export async function compressImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('This image format cannot be read. Please use a JPEG or PNG photo.')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  if (!blob) throw new Error('Could not process this image.')
  return blob
}
