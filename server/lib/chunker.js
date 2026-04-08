const CHUNK_SIZE = 500   // words per chunk
const OVERLAP    = 30

function cleanText(text) {
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildChunks(pdfData) {
  const fullText = cleanText(pdfData.text)
  const words    = fullText.split(' ').filter(Boolean)

  // Use page breaks to track page numbers per word
  const pages    = pdfData.text.split(/\f/)
  const pageWordCounts = pages.map(p => p.split(/\s+/).filter(Boolean).length)

  const chunks   = []
  let   wordPos  = 0
  let   chunkIdx = 0

  for (let i = 0; i < words.length; i += CHUNK_SIZE - OVERLAP) {
    const slice = words.slice(i, i + CHUNK_SIZE)
    if (slice.length < 5) break

    // Estimate page number from word position
    let cumulative = 0
    let pageNum    = 1
    for (let p = 0; p < pageWordCounts.length; p++) {
      cumulative += pageWordCounts[p]
      if (i < cumulative) { pageNum = p + 1; break }
    }

    chunks.push({
      content:    slice.join(' '),
      pageNumber: pageNum,
      chunkIndex: chunkIdx++,
      tokenCount: Math.round(slice.length * 1.3),
    })
  }

  return chunks
}