import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title':      'AskMyDocs',
  },
})

const MODEL = 'openai/text-embedding-3-small'
const BATCH = 20

export async function embedText(text) {
  const res = await openai.embeddings.create({
    model: MODEL,
    input: text.replace(/\n/g, ' ').slice(0, 8000),
  })
  return res.data[0].embedding
}

export async function embedBatch(texts) {
  const results = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts
      .slice(i, i + BATCH)
      .map(t => t.replace(/\n/g, ' ').slice(0, 8000))
    const res = await openai.embeddings.create({ model: MODEL, input: batch })
    results.push(...res.data.map(d => d.embedding))
    console.log(`Embedded ${Math.min(i + BATCH, texts.length)} / ${texts.length} chunks`)
  }
  return results
}
