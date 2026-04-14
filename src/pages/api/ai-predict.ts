import type { VercelRequest, VercelResponse } from '@vercel/node'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const config = {
  api: {
    bodyParser: true,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompt } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты профессиональный рыболов-ихтиолог. Отвечай на русском, используй эмодзи.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    })

    const prediction = completion.choices[0]?.message?.content || 'Не удалось получить прогноз'

    res.status(200).json({ prediction })
  } catch (error: any) {
    console.error('Groq API error:', error)
    res.status(500).json({ error: error.message || 'Ошибка AI' })
  }
}