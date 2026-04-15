// api/ai-predict.ts
import { VercelRequest, VercelResponse } from '@vercel/node'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' })
  }

  try {
    const { prompt } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' })
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты рыболов-ихтиолог. Отвечай на русском с эмодзи.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    })

    res.status(200).json({ prediction: completion.choices[0]?.message?.content || 'Нет ответа' })
  } catch (error: any) {
    console.error('Groq error:', error)
    res.status(500).json({ error: error.message || 'Server error' })
  }
}