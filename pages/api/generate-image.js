// pages/api/generate-image.js
// Secure server-side image generation via Gemini

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imagePrompt, ratio, brand, apiKey, tier, accessCode } = req.body;

  let geminiKey;
  if (tier === 'paid') {
    if (accessCode !== process.env.PAID_ACCESS_CODE) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
    geminiKey = process.env.GEMINI_API_KEY;
  } else {
    geminiKey = apiKey;
  }

  if (!geminiKey) return res.status(400).json({ error: 'No API key provided.' });

  const fullPrompt = `${imagePrompt}

CRITICAL RULES:
- Absolutely NO text, words, letters, numbers, or typography in the image
- Professional brand photography aesthetic
- Clean, uncluttered composition
- Product or subject is the clear hero — sharp and centered
- Colors: ${brand.colors || 'natural, warm tones'}
- Ultra high quality, cinematic lighting
- Aspect ratio: ${ratio}`;

  // Map platform ratios to supported aspect ratios
  const aspectRatio = ratio === '9:16' ? '9:16' :
                      ratio === '4:5'  ? '4:5'  :
                      ratio === '16:9' ? '16:9' :
                      ratio === '2:3'  ? '2:3'  : '1:1';

  try {
    // Primary: gemini-3.1-flash-image-preview (latest recommended)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio }
          }
        })
      }
    );

    const data = await response.json();

    if (!data.error) {
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
      if (imgPart) {
        return res.status(200).json({ image: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType });
      }
    }

    // Fallback: gemini-2.5-flash-image
    return await fallbackImageGen(geminiKey, fullPrompt, aspectRatio, res);
  } catch (e) {
    return await fallbackImageGen(geminiKey, fullPrompt, aspectRatio, res);
  }
}

async function fallbackImageGen(geminiKey, prompt, aspectRatio, res) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio }
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imgPart) {
      return res.status(200).json({ image: imgPart.inlineData.data, mimeType: imgPart.inlineData.mimeType });
    }

    return res.status(200).json({ image: null });
  } catch (e) {
    return res.status(500).json({ error: `Image generation failed: ${e.message}` });
  }
}


  const { imagePrompt, ratio, brand, apiKey, tier, accessCode } = req.body;

  let geminiKey;
  if (tier === 'paid') {
    if (accessCode !== process.env.PAID_ACCESS_CODE) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
    geminiKey = process.env.GEMINI_API_KEY;
  } else {
    geminiKey = apiKey;
  }

  if (!geminiKey) return res.status(400).json({ error: 'No API key provided.' });

  const fullPrompt = `${imagePrompt}

CRITICAL RULES:
- Absolutely NO text, words, letters, numbers, or typography in the image
- Professional brand photography aesthetic
- Clean, uncluttered composition
- Product or subject is the clear hero — sharp and centered
- Colors: ${brand.colors || 'natural, warm tones'}
- Ultra high quality, cinematic lighting
- Aspect ratio: ${ratio}`;

  try {
    // Use Gemini Imagen 3 for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: fullPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: ratio === '9:16' ? '9:16' :
                         ratio === '4:5' ? '4:5' :
                         ratio === '16:9' ? '16:9' :
                         ratio === '2:3' ? '3:4' : '1:1',
            safetyFilterLevel: 'block_few',
            personGeneration: 'allow_adult'
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      // Fallback to Gemini 2.0 Flash experimental image gen if Imagen fails
      return await fallbackImageGen(geminiKey, fullPrompt, ratio, res);
    }

    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return await fallbackImageGen(geminiKey, fullPrompt, ratio, res);

    return res.status(200).json({ image: b64, mimeType: 'image/png' });
  } catch (e) {
    return await fallbackImageGen(geminiKey, fullPrompt, ratio, res);
  }
}

async function fallbackImageGen(geminiKey, prompt, ratio, res) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const parts = data.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (imgPart) {
      return res.status(200).json({
        image: imgPart.inlineData.data,
        mimeType: imgPart.inlineData.mimeType
      });
    }

    return res.status(200).json({ image: null });
  } catch (e) {
    return res.status(500).json({ error: `Image generation failed: ${e.message}` });
  }
}
