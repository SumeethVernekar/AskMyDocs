const CHUNK_SIZE = 300  // bigger chunks = fewer chunks = faster
const OVERLAP    = 30

function cleanText(text) {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildChunks(pdfData) {
  // Join all pages into one text, split into chunks
  // Avoids tiny per-page chunks that slow down embedding
  const fullText = pdfData.text
    .split(/\f/)
    .map((page, i) => ({ page: i + 1, text: cleanText(page) }))
    .filter(p => p.text.length > 20)

  const allChunks = []
  let   chunkIndex = 0

  for (const { page, text } of fullText) {
    const words = text.split(' ').filter(Boolean)
    let i = 0
    while (i < words.length) {
      const slice = words.slice(i, i + CHUNK_SIZE)
      if (slice.length > 10) {
        allChunks.push({
          content:    slice.join(' '),
          pageNumber: page,
          chunkIndex: chunkIndex++,
          tokenCount: Math.round(slice.length * 1.3),
        })
      }
      i += CHUNK_SIZE - OVERLAP
    }
  }

  return allChunks
}