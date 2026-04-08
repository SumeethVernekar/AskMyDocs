import { pipeline, env } from '@xenova/transformers'

env.cacheDir         = './models'
env.allowLocalModels = false

let embedder    = null
let modelLoading = false

export async function getEmbedder() {
  if (embedder) return embedder
  if (modelLoading) {
    // Wait for model to finish loading
    while (modelLoading) {
      await new Promise(r => setTimeout(r, 100))
    }
    return embedder
  }
  modelLoading = true
  console.log('Loading embedding model...')
  embedder     = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  modelLoading = false
  console.log('Embedding model ready!')
  return embedder
}

export async function embedText(text) {
  const embed  = await getEmbedder()
  const clean  = text.replace(/\n/g, ' ').trim().slice(0, 512)
  const output = await embed(clean, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

// Process in batches of 32 — optimal for local model
export async function embedBatch(texts, onProgress) {
  const embed     = await getEmbedder()
  const BATCH     = 32
  const results   = []
  const cleaned   = texts.map(t => t.replace(/\n/g, ' ').trim().slice(0, 512))

  for (let i = 0; i < cleaned.length; i += BATCH) {
    const batch  = cleaned.slice(i, i + BATCH)
    const output = await embed(batch, { pooling: 'mean', normalize: true })
    const dims   = output.data.length / batch.length

    for (let j = 0; j < batch.length; j++) {
      results.push(Array.from(output.data.slice(j * dims, (j + 1) * dims)))
    }

    // Report progress
    const pct = Math.round(((i + batch.length) / cleaned.length) * 100)
    if (onProgress) onProgress(pct)
    console.log(`Embedded ${Math.min(i + BATCH, cleaned.length)}/${cleaned.length} chunks`)
  }

  return results
}