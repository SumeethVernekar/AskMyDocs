import { pipeline, env } from '@xenova/transformers'

env.cacheDir         = './models'
env.allowLocalModels = false

let embedder = null

async function getEmbedder() {
  if (!embedder) {
    console.log('Loading embedding model...')
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    console.log('Embedding model ready!')
  }
  return embedder
}

export async function embedText(text) {
  const embed  = await getEmbedder()
  const clean  = text.replace(/\n/g, ' ').trim().slice(0, 512)
  const output = await embed(clean, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

// Process all texts in one batch call — much faster than one by one
export async function embedBatch(texts) {
  const embed   = await getEmbedder()
  const cleaned = texts.map(t => t.replace(/\n/g, ' ').trim().slice(0, 512))

  console.log(`Embedding ${cleaned.length} chunks in one batch...`)

  const output = await embed(cleaned, { pooling: 'mean', normalize: true })

  // output.data is a flat Float32Array: [vec0, vec1, vec2, ...]
  const dims    = output.data.length / cleaned.length
  const results = []

  for (let i = 0; i < cleaned.length; i++) {
    results.push(Array.from(output.data.slice(i * dims, (i + 1) * dims)))
  }

  console.log(`Done — ${results.length} embeddings created`)
  return results
}