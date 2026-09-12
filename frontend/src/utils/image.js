/**
 * Reads an image File, scales it down so its longest edge is at most
 * maxSize px, and returns a JPEG data URL. Keeps profile pictures small
 * enough to store directly on the Firestore user document (which caps at 1MB).
 */
export function resizeImageToDataUrl(file, maxSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Could not read the image file'))

    reader.onload = () => {
      const img = new Image()

      img.onerror = () => reject(new Error('Could not load the image'))

      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.src = reader.result
    }

    reader.readAsDataURL(file)
  })
}
