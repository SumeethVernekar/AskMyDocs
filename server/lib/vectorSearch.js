import Chunk from '../models/Chunk.js'

// Cosine similarity between two equal-length vectors
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Find top-k most similar chunks for a document
export async function searchChunks(documentId, queryEmbedding, topK = 5) {
  // Fetch all chunks for this document (embeddings included)
  const chunks = await Chunk.find({ documentId }).lean()

  if (chunks.length === 0) return []

  // Score each chunk
  const scored = chunks.map(chunk => ({
    ...chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }))

  // Sort descending and return top-k
  scored.sort((a, b) => b.similarity - a.similarity)

  return scored.slice(0, topK).map(c => ({
    _id:        c._id,
    content:    c.content,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    similarity: c.similarity,
  }))
}
