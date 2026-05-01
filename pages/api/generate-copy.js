// pages/api/generate-copy.js
// Secure server-side API route — Gemini key never exposed to client

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brandDescription, imageBase64, imageMimeType, websiteUrl, platform, count, goal, brand, apiKey, tier } = req.body;

  // Determine which API key to use
  let geminiKey;
  if (tier === 'paid') {
    const { accessCode } = req.body;
    if (accessCode !== process.env.PAID_ACCESS_CODE) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
    geminiKey = process.env.GEMINI_API_KEY;
  } else {
    geminiKey = apiKey;
  }

  if (!geminiKey) return res.status(400).json({ error: 'No API key provided.' });

  const brandVoice = brand.voice || 'warm, authentic, human';
  const brandColors = brand.colors || 'your brand colors';
  const brandName = brand.name || 'this brand';
  const industry = brand.industry || 'lifestyle product';
  const tagline = brand.tagline || '';
  const audience = brand.audience || '';

  // ── Optionally scrape website for context ────────────────────────────────
  let websiteContext = '';
  if (websiteUrl && websiteUrl.trim()) {
    try {
      const siteRes = await fetch(websiteUrl.trim(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AdGenerator/1.0)' },
        signal: AbortSignal.timeout(6000)
      });
      const html = await siteRes.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000);
      if (text.length > 100) {
        websiteContext = `\nWebsite content scraped from ${websiteUrl}:\n${text}\n`;
      }
    } catch(e) {
      // Website context is optional — silently skip on error
    }
  }

  const prompt = `You are a creative director and copywriter for ${brandName}, a ${industry} brand.
Brand voice: ${brandVoice}.
Brand colors: ${brandColors}.${tagline ? `\nTagline: "${tagline}".` : ''}${audience ? `\nTarget audience: ${audience}.` : ''}

About what they sell:
${brandDescription}${websiteContext}${imageBase64 ? '\nA brand/product image has been provided — incorporate visual cues from it into the ad concepts and image prompts.\n' : ''}
Generate ${count} unique, scroll-stopping ads for ${brandName}.
Platform: ${platform.label} (${platform.ratio}).${goal ? `\nCampaign Direction: ${goal}` : ''}

RULES:
- Each ad must feel completely different — different angle, emotion, audience segment
- Hooks must be bold, natural, human — no generic AI phrasing
- Write in the brand's voice — ${brandVoice}
- Video prompts must be specific enough to actually shoot
- Vary the creative angle: identity, desire, problem/solution, lifestyle, social proof, urgency
- Image prompts must match brand colors: ${brandColors}

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
    // Build content parts — prepend image if provided (multimodal)
    const parts = [];
    if (imageBase64 && imageMimeType) {
      parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
    }
    parts.push({ text: prompt });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
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
