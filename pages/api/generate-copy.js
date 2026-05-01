// pages/api/generate-copy.js
// Secure server-side API route — Gemini key never exposed to client

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { blend, platform, count, goal, brand, apiKey, tier } = req.body;

  // Determine which API key to use
  let geminiKey;
  if (tier === 'paid') {
    // Validate access code before using server key
    const { accessCode } = req.body;
    if (accessCode !== process.env.PAID_ACCESS_CODE) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
    geminiKey = process.env.GEMINI_API_KEY;
  } else {
    // Free tier — use customer's own key
    geminiKey = apiKey;
  }

  if (!geminiKey) return res.status(400).json({ error: 'No API key provided.' });

  const brandVoice = brand.voice || 'warm, authentic, human';
  const brandColors = brand.colors || 'your brand colors';
  const brandName = brand.name || 'this brand';
  const industry = brand.industry || 'lifestyle product';

  const prompt = `You are a creative director and copywriter for ${brandName}, a ${industry} brand. Brand voice: ${brandVoice}. Brand colors: ${brandColors}.

Generate ${count} unique, scroll-stopping ads for:
- Product/Service: ${blend.name}
- Core Message: "${blend.affirmation}"
- Details: ${blend.notes}
- Type: ${blend.type}
- Platform: ${platform.label} (${platform.ratio})
- Mood: ${blend.mood}
${goal ? `- Campaign Direction: ${goal}` : ''}

RULES:
- Each ad must feel completely different — different angle, emotion, audience segment
- Hooks must be bold, natural, human — no generic AI phrasing
- Write in the brand's voice — ${brandVoice}
- The core message should feel woven in, not forced
- Video prompts must be specific enough to actually shoot
- Vary the creative angle: identity, desire, problem/solution, lifestyle, social proof, urgency

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "hook": "scroll-stopping opening line",
    "primaryText": "2-4 sentences of engaging caption copy",
    "headline": "short punchy headline",
    "cta": "call to action (3-6 words)",
    "imagePrompt": "detailed image generation prompt — cinematic, product-focused, NO text in image, describe lighting, composition, mood, style, colors matching ${brandColors}",
    "video": {
      "camera": "camera type e.g. iPhone 15 Pro, Sony A7, handheld",
      "angle": "e.g. overhead flat lay, eye-level medium shot, slow zoom in",
      "lighting": "e.g. soft natural window light, warm golden hour, dramatic moody studio",
      "mood": "e.g. slow and intentional, energetic and bold, soft and dreamy",
      "dialogue": "optional voiceover or spoken line, or empty string",
      "action": "what happens in the video"
    },
    "strategy": {
      "audience": "who this specific ad targets",
      "angle": "emotional or conceptual angle",
      "purpose": "awareness / engagement / conversion / retargeting",
      "bestTime": "when to post this",
      "whyItWorks": "one sentence on why this ad works"
    }
  }
]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 8192 }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const ads = JSON.parse(clean);
    return res.status(200).json({ ads });
  } catch (e) {
    return res.status(500).json({ error: `Generation failed: ${e.message}` });
  }
}
