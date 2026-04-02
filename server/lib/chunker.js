const CHUNK_SIZE = 200
const OVERLAP    = 20

function chunkPageText(text, pageNumber, startIndex) {
  // Clean each page's text before chunking
  const clean = text
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const words = clean.split(' ').filter(w => w.length > 0)
  const chunks = []
  let i = 0

  while (i < words.length) {
    const slice = words.slice(i, i + CHUNK_SIZE)
    if (slice.length > 10) {  // skip tiny chunks
      chunks.push({
        content:    slice.join(' '),
        pageNumber,
        chunkIndex: startIndex + chunks.length,
        tokenCount: Math.round(slice.length * 1.3),
      })
    }
    i += CHUNK_SIZE - OVERLAP
    if (i < 0) break
  }
  return chunks
}

export function buildChunks(pdfData) {
  const rawPages  = pdfData.text.split(/\f/)
  const allChunks = []

  for (let i = 0; i < rawPages.length; i++) {
    const text = rawPages[i].trim()
    if (!text || text.length < 20) continue
    const pageChunks = chunkPageText(text, i + 1, allChunks.length)
    allChunks.push(...pageChunks)
  }

  return allChunks
}