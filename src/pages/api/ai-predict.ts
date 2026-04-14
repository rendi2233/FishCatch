// src/pages/api/ai-predict.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import Groq from 'groq-sdk'

// Инициализация Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// Конфигурация для Vercel
export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Проверяем метод
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' })
    return
  }

  try {
    // Проверяем тело запроса
    const { prompt } = req.body

    if (!prompt || typeof prompt !== 'string') {
      console.error('Invalid prompt:', prompt)
      res.status(400).json({ error: 'Invalid or missing prompt' })
      return
    }

    console.log('🤖 Generating prediction with Groq...')

    // Запрос к Groq
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'Ты профессиональный рыболов-ихтиолог. Отвечай на русском языке, используй эмодзи.' 
        },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    })

    const prediction = completion.choices[0]?.message?.content || 'Не удалось получить прогноз'

    console.log('✅ Prediction generated successfully')
    res.status(200).json({ prediction })
  } catch (error: any) {
    console.error('❌ Groq API error:', error)
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    })
  }
}