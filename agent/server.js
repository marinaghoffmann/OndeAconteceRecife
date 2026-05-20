import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '.env')
const envResult = dotenv.config({ path: envPath })

if (envResult.error) {
  console.error('[dotenv] erro ao ler .env:', envResult.error.message)
  console.error('[dotenv] path tentado:', envPath)
} else {
  console.log('[dotenv] carregado:', envPath)
}

const app = express()
const PORT = process.env.PORT || 3001
const API_BASE = process.env.OAR_API_BASE || 'http://localhost:8000'

// lido após dotenv.config para garantir que o .env foi processado
const getGeminiKey = () => process.env.GEMINI_API_KEY

app.use(cors())   // aceita qualquer origem em dev
app.use(express.json())

app.get('/', (_req, res) => res.json({
  name: 'Onde Acontece Recife — Agente IA',
  status: 'online',
  model: 'gemini-1.5-flash',
  endpoints: { chat: 'POST /chat', health: 'GET /health' },
}))

// ── busca eventos do backend e serializa como contexto ────────────────────────
async function fetchEventosContext() {
  try {
    const res  = await fetch(`${API_BASE}/events?per_page=100`)
    const data = await res.json()
    const eventos = Array.isArray(data) ? data : (data?.results ?? [])

    return eventos.map(ev => {
      const preco = ev.gratuito || ev.preco === 0
        ? 'Gratuito'
        : ev.preco != null ? `R$ ${ev.preco}` : 'Consulte'
      return [
        `• ${ev.titulo}`,
        `  Categoria: ${ev.categoria || 'Cultura'}`,
        `  Bairro: ${ev.bairro || '—'}`,
        `  Local: ${ev.local || '—'}`,
        `  Quando: ${ev.inicio_iso || '—'}`,
        `  Preço: ${preco}`,
        `  Slug: /evento/${slugify(ev.titulo)}`,
      ].join('\n')
    }).join('\n\n')
  } catch {
    return '(não foi possível carregar os eventos no momento)'
  }
}

function slugify(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── POST /chat ────────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  const GEMINI_KEY = getGeminiKey()
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no agent/.env' })
  }

  const { messages } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Campo "messages" obrigatório.' })
  }

  const eventosContext = await fetchEventosContext()

  const systemPrompt = `Você é o assistente cultural do app "Onde Acontece Recife".
Seu papel é ajudar o usuário a descobrir eventos culturais na cidade de Recife, Pernambuco.

Abaixo está a lista completa de eventos disponíveis hoje na plataforma:

${eventosContext}

Regras:
- Responda sempre em português brasileiro, de forma amigável e direta.
- Quando sugerir eventos, cite no máximo 3, com nome, local, horário e preço.
- Inclua o link de cada evento sugerido no formato: [Ver evento](/evento/slug-do-evento)
- Se o usuário perguntar sobre algo que não está na lista de eventos, diga que não encontrou e sugira usar os filtros da agenda.
- Nunca invente eventos que não estão na lista acima.
- Não responda perguntas que não sejam relacionadas a eventos ou cultura em Recife.`

  // monta o histórico no formato Gemini (contents)
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      }
    )

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      console.error('[Gemini] status:', geminiRes.status, JSON.stringify(data, null, 2))
      return res.status(502).json({ error: data?.error?.message || 'Erro na API Gemini' })
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      console.error('[Gemini] resposta sem texto:', JSON.stringify(data, null, 2))
      return res.json({ reply: 'Não consegui gerar uma resposta. Tente novamente.' })
    }
    return res.json({ reply: text })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno no agente.' })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok', model: 'gemini-1.5-flash' }))

app.listen(PORT, () => {
  const key = getGeminiKey()
  console.log(`\n🎭 Agente IA rodando em http://localhost:${PORT}`)
  console.log(`   Gemini key: ${key ? '✅ ' + key.slice(0,8) + '...' : '❌ NÃO CONFIGURADA — defina GEMINI_API_KEY no agent/.env'}`)
  console.log(`   .env path:  ${envPath}`)
  console.log(`   Backend:    ${API_BASE}\n`)
})