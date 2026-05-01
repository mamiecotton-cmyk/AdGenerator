import { useState, useEffect } from 'react'
import Head from 'next/head'

// ── Default empty brand ─────────────────────────────────────────────────────
const EMPTY_BRAND = {
  name: '', industry: '', tagline: '', voice: '', colors: '', audience: ''
}

// ── Platforms ───────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'ig-feed',   label: 'IG Feed',   ratio: '4:5'  },
  { id: 'ig-reels',  label: 'IG Reels',  ratio: '9:16' },
  { id: 'tiktok',    label: 'TikTok',    ratio: '9:16' },
  { id: 'facebook',  label: 'Facebook',  ratio: '1:1'  },
  { id: 'pinterest', label: 'Pinterest', ratio: '2:3'  },
  { id: 'youtube',   label: 'YouTube',   ratio: '16:9' },
]

export default function Home() {
  // ── State ────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('setup')   // 'setup' | 'generator'
  const [brand, setBrand] = useState(EMPTY_BRAND)
  const [products, setProducts] = useState([])
  const [tier, setTier] = useState('free')         // 'free' | 'paid'
  const [apiKey, setApiKey] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [selProduct, setSelProduct] = useState(null)
  const [selPlatform, setSelPlatform] = useState(null)
  const [adCount, setAdCount] = useState(3)
  const [goal, setGoal] = useState('')
  const [generating, setGenerating] = useState(false)
  const [ads, setAds] = useState([])
  const [error, setError] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name:'', affirmation:'', notes:'', type:'', mood:'' })
  const [setupErrors, setSetupErrors] = useState({})

  // ── Load saved brand from localStorage ──────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('adgen_brand')
      const savedProducts = localStorage.getItem('adgen_products')
      const savedTier = localStorage.getItem('adgen_tier')
      const savedKey = localStorage.getItem('adgen_key')
      if (saved) { setBrand(JSON.parse(saved)); setScreen('generator') }
      if (savedProducts) setProducts(JSON.parse(savedProducts))
      if (savedTier) setTier(savedTier)
      if (savedKey) setApiKey(savedKey)
    } catch(e) {}
  }, [])

  // ── Save brand ───────────────────────────────────────────────────────────
  function saveBrand() {
    const errs = {}
    if (!brand.name.trim()) errs.name = 'Required'
    if (!brand.industry.trim()) errs.industry = 'Required'
    if (!brand.voice.trim()) errs.voice = 'Required'
    if (!brand.colors.trim()) errs.colors = 'Required'
    if (tier === 'free' && !apiKey.trim()) errs.apiKey = 'Required for free tier'
    if (setSetupErrors) setSetupErrors(errs)
    if (Object.keys(errs).length) return

    localStorage.setItem('adgen_brand', JSON.stringify(brand))
    localStorage.setItem('adgen_products', JSON.stringify(products))
    localStorage.setItem('adgen_tier', tier)
    if (tier === 'free') localStorage.setItem('adgen_key', apiKey)
    setScreen('generator')
  }

  // ── Add product ──────────────────────────────────────────────────────────
  function addProduct() {
    if (!newProduct.name.trim() || !newProduct.affirmation.trim()) {
      alert('Please enter at least a name and core message.')
      return
    }
    const updated = [...products, { ...newProduct, id: 'p-' + Date.now() }]
    setProducts(updated)
    localStorage.setItem('adgen_products', JSON.stringify(updated))
    setNewProduct({ name:'', affirmation:'', notes:'', type:'', mood:'' })
    setShowAddProduct(false)
    setSelProduct(updated[updated.length - 1].id)
  }

  function removeProduct(id) {
    const updated = products.filter(p => p.id !== id)
    setProducts(updated)
    localStorage.setItem('adgen_products', JSON.stringify(updated))
    if (selProduct === id) setSelProduct(null)
  }

  // ── Generate ─────────────────────────────────────────────────────────────
  async function generate() {
    if (!selProduct) return setError('Please select a product or service.')
    if (!selPlatform) return setError('Please select a platform.')
    setError('')
    setGenerating(true)
    setAds([])

    const product = products.find(p => p.id === selProduct)
    const platform = PLATFORMS.find(p => p.id === selPlatform)

    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blend: product, platform, count: adCount, goal, brand, apiKey, tier, accessCode })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setGenerating(false); return }

      // Set ads with loading state for images
      const adsWithLoading = data.ads.map((ad, i) => ({ ...ad, id: i, imageData: null, imageLoading: true }))
      setAds(adsWithLoading)
      setGenerating(false)

      // Generate images in parallel
      adsWithLoading.forEach((ad, i) => {
        fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt: ad.imagePrompt, ratio: platform.ratio, brand, apiKey, tier, accessCode })
        })
        .then(r => r.json())
        .then(imgData => {
          setAds(prev => prev.map(a => a.id === i ? {
            ...a,
            imageData: imgData.image || null,
            imageMime: imgData.mimeType || 'image/png',
            imageLoading: false
          } : a))
        })
        .catch(() => {
          setAds(prev => prev.map(a => a.id === i ? { ...a, imageLoading: false } : a))
        })
      })
    } catch(e) {
      setError(`Something went wrong: ${e.message}`)
      setGenerating(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Ad Generator</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        :root {
          --cream:#F5F0E8; --cream-dark:#EDE5D4; --gold:#C49A2A; --gold-light:#D4AA40;
          --gold-pale:#F0E0A0; --brown:#2C1A0E; --brown-mid:#5C3D1E; --brown-light:#8B6240;
          --text:#1E1208; --border:rgba(196,154,42,0.3);
        }
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:var(--cream);font-family:'Jost',sans-serif;color:var(--text);}
        .serif{font-family:'Cormorant Garamond',serif;}

        /* Header */
        .hdr{background:var(--brown);padding:16px 24px;display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--gold);position:sticky;top:0;z-index:50;}
        .logo-wrap{display:flex;flex-direction:column;line-height:1;}
        .logo-you{font-family:'Cormorant Garamond',serif;font-size:11px;color:#F5F0E8;letter-spacing:0.15em;text-transform:uppercase;}
        .logo-gold{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--gold);}
        .logo-sub{font-size:8px;font-weight:500;color:var(--gold-pale);letter-spacing:0.2em;text-transform:uppercase;}
        .hdr-div{width:1px;height:32px;background:var(--gold);opacity:0.3;}
        .hdr-title{font-size:10px;font-weight:500;color:var(--gold-pale);letter-spacing:0.2em;text-transform:uppercase;}
        .hdr-edit{margin-left:auto;font-size:10px;font-weight:500;color:var(--gold-pale);letter-spacing:0.12em;text-transform:uppercase;background:none;border:1px solid rgba(196,154,42,0.3);padding:6px 14px;border-radius:100px;color:var(--gold-pale);cursor:pointer;transition:all 0.2s;}
        .hdr-edit:hover{border-color:var(--gold);color:var(--gold);}

        /* Wrap */
        .wrap{max-width:960px;margin:0 auto;padding:28px 20px;}

        /* Panel */
        .panel{background:white;border:1px solid var(--border);border-radius:4px;padding:28px;margin-bottom:24px;box-shadow:0 2px 12px rgba(44,26,14,0.05);}
        .panel-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--brown);margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border);}

        /* Fields */
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
        .field label{font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--brown-mid);}
        .field input,.field textarea,.field select{font-family:'Jost',sans-serif;font-size:13px;color:var(--text);background:var(--cream);border:1px solid var(--border);border-radius:3px;padding:9px 12px;outline:none;width:100%;transition:border-color 0.2s;}
        .field input:focus,.field textarea:focus,.field select:focus{border-color:var(--gold);}
        .field textarea{resize:vertical;min-height:60px;}
        .field-err{border-color:#e07050 !important;}
        .err-msg{font-size:10px;color:#e07050;margin-top:2px;}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}

        /* Tier toggle */
        .tier-row{display:flex;gap:10px;margin-bottom:20px;}
        .tier-btn{flex:1;padding:12px;border:1.5px solid var(--border);background:white;color:var(--brown-mid);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;border-radius:3px;cursor:pointer;transition:all 0.2s;text-align:center;}
        .tier-btn.sel{background:var(--brown);border-color:var(--brown);color:var(--gold);}
        .tier-label{font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--brown-mid);margin-bottom:8px;display:block;}

        /* Primary button */
        .btn-pri{width:100%;background:var(--brown);color:var(--gold);font-family:'Jost',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;padding:15px;border:none;border-radius:3px;cursor:pointer;transition:all 0.2s;margin-top:8px;}
        .btn-pri:hover{background:var(--brown-mid);}
        .btn-pri:disabled{opacity:0.5;cursor:not-allowed;}
        .btn-sec{background:white;color:var(--brown);border:1.5px solid var(--border);font-family:'Jost',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;padding:10px 20px;border-radius:3px;cursor:pointer;transition:all 0.2s;}
        .btn-sec:hover{border-color:var(--gold);}

        /* Product cards */
        .prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:4px;}
        .prod-card{border:1.5px solid var(--border);border-radius:4px;padding:10px 8px;cursor:pointer;transition:all 0.2s;background:white;text-align:center;position:relative;}
        .prod-card:hover{border-color:var(--gold);transform:translateY(-1px);}
        .prod-card.sel{border-color:var(--gold);background:var(--cream);box-shadow:0 0 0 2px rgba(196,154,42,0.2);}
        .pc-name{font-family:'Cormorant Garamond',serif;font-size:12px;font-weight:700;color:var(--brown);line-height:1.3;margin-bottom:3px;}
        .pc-msg{font-family:'Cormorant Garamond',serif;font-size:9px;font-style:italic;color:var(--brown-light);line-height:1.4;}
        .pc-del{position:absolute;top:4px;right:6px;font-size:12px;color:var(--brown-light);background:none;border:none;cursor:pointer;opacity:0.5;transition:opacity 0.2s;line-height:1;}
        .pc-del:hover{opacity:1;}
        .add-card{border-style:dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--gold);min-height:72px;}
        .add-card .plus{font-size:20px;line-height:1;}
        .add-card .al{font-size:9px;letter-spacing:0.1em;font-weight:500;}

        /* Platform */
        .platform-row{display:flex;flex-wrap:wrap;gap:7px;}
        .pb{font-family:'Jost',sans-serif;font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;padding:7px 14px;border:1.5px solid var(--border);border-radius:100px;cursor:pointer;background:white;color:var(--brown-mid);transition:all 0.2s;}
        .pb:hover{border-color:var(--gold);}
        .pb.sel{background:var(--brown);border-color:var(--brown);color:var(--gold);}

        /* Count */
        .count-row{display:flex;align-items:center;gap:10px;}
        .cb{width:32px;height:32px;border-radius:50%;border:1.5px solid var(--border);background:white;cursor:pointer;font-size:16px;color:var(--brown);display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
        .cb:hover{border-color:var(--gold);}
        .cd{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:var(--brown);min-width:32px;text-align:center;}

        /* Generator grid */
        .gen-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;}

        /* Error / banner */
        .error-box{background:#fff8f5;border:1px solid #ffcbb0;border-radius:4px;padding:14px 18px;color:#8B3A1A;font-size:12px;margin-bottom:20px;}
        .gen-banner{background:var(--brown);color:var(--gold-pale);text-align:center;padding:16px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:4px;margin-bottom:20px;}
        .spin{width:24px;height:24px;border:2px solid rgba(196,154,42,0.3);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* Ad card */
        .ad-card{background:white;border:1px solid var(--border);border-radius:4px;overflow:hidden;margin-bottom:24px;box-shadow:0 2px 12px rgba(44,26,14,0.06);animation:fu 0.4s ease both;}
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .ac-hdr{background:var(--brown);padding:12px 20px;display:flex;justify-content:space-between;align-items:center;}
        .ac-num{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:var(--gold);}
        .tags{display:flex;gap:6px;}
        .tag{font-size:8px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;padding:3px 8px;background:rgba(196,154,42,0.15);color:var(--gold-light);border-radius:100px;}
        .ac-body{display:grid;grid-template-columns:1fr 1fr;}
        .img-sec{border-right:1px solid var(--border);padding:20px;display:flex;flex-direction:column;gap:14px;}
        .img-lbl{font-size:8px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--brown-light);}
        .img-box{width:100%;aspect-ratio:1;background:var(--cream-dark);border-radius:3px;overflow:hidden;display:flex;align-items:center;justify-content:center;}
        .img-box img{width:100%;height:100%;object-fit:cover;}
        .img-loading{display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--brown-light);font-size:10px;letter-spacing:0.08em;}
        .img-fallback{padding:16px;text-align:center;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:100%;background:var(--cream-dark);}
        .fi-icon{font-size:28px;}
        .fi-name{font-family:'Cormorant Garamond',serif;font-size:13px;font-style:italic;color:var(--brown);font-weight:600;line-height:1.3;}
        .fi-aff{font-family:'Cormorant Garamond',serif;font-size:9px;font-style:italic;color:var(--brown-light);line-height:1.4;}
        .fi-div{width:32px;height:1px;background:var(--gold);}
        .fi-notes{font-size:9px;color:var(--gold);}

        /* Video prompt */
        .vp-box{background:var(--cream);border:1px solid var(--border);border-radius:3px;padding:14px;}
        .vp-lbl{font-size:8px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;display:block;}
        .vp-row{display:flex;gap:6px;margin-bottom:4px;}
        .vp-k{font-size:9px;font-weight:600;color:var(--brown-mid);min-width:68px;text-transform:uppercase;letter-spacing:0.06em;padding-top:1px;}
        .vp-v{font-size:11px;color:var(--text);line-height:1.5;}

        /* Copy section */
        .copy-sec{padding:20px;display:flex;flex-direction:column;gap:16px;}
        .cb-lbl{font-size:8px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);margin-bottom:5px;display:block;}
        .hook{font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;font-weight:600;color:var(--brown);line-height:1.4;}
        .pt{font-size:12px;color:var(--text);line-height:1.7;}
        .hl{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:var(--brown);}
        .cta-badge{display:inline-block;background:var(--gold);color:var(--brown);font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:7px 16px;border-radius:2px;}
        .strat{background:var(--cream);border-left:3px solid var(--gold);padding:12px 14px;border-radius:0 3px 3px 0;}
        .strat-lbl{font-size:8px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--brown-mid);margin-bottom:7px;display:block;}
        .sr{display:flex;gap:7px;margin-bottom:3px;}
        .sk{font-size:9px;font-weight:600;color:var(--brown-light);min-width:64px;}
        .sv{font-size:10px;color:var(--text);line-height:1.5;}

        /* Add product modal */
        .modal-overlay{display:none;position:fixed;inset:0;background:rgba(44,26,14,0.6);z-index:200;align-items:center;justify-content:center;}
        .modal-overlay.open{display:flex;}
        .modal{background:white;border-radius:6px;padding:28px;width:90%;max-width:440px;border:1px solid var(--border);}
        .modal h3{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--brown);margin-bottom:16px;}
        .modal-actions{display:flex;gap:10px;margin-top:4px;}

        /* Hint */
        .hint{font-size:10px;color:var(--brown-light);line-height:1.5;margin-top:4px;}

        @media(max-width:600px){
          .ac-body{grid-template-columns:1fr;}
          .img-sec{border-right:none;border-bottom:1px solid var(--border);}
          .prod-grid{grid-template-columns:repeat(2,1fr);}
          .gen-grid{grid-template-columns:1fr;}
          .grid2{grid-template-columns:1fr;}
        }
      `}</style>

      {/* Header */}
      <div className="hdr">
        <div className="logo-wrap">
          <span className="logo-you">Ad</span>
          <span className="logo-gold">Generator</span>
          <span className="logo-sub">Powered by Gemini</span>
        </div>
        <div className="hdr-div"></div>
        <div className="hdr-title">{brand.name || 'Universal Ad Studio'}</div>
        {screen === 'generator' && (
          <button className="hdr-edit" onClick={() => setScreen('setup')}>✦ Edit Brand</button>
        )}
      </div>

      <div className="wrap">

        {/* ── SETUP SCREEN ────────────────────────────────────────────── */}
        {screen === 'setup' && (
          <>
            <div className="panel">
              <div className="panel-title">Brand Setup</div>
              <p className="hint" style={{marginBottom:'20px'}}>Fill this in once. It shapes every ad we generate for you.</p>

              <div className="grid2">
                <div className="field">
                  <label>Business Name *</label>
                  <input className={setupErrors.name ? 'field-err' : ''} value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} placeholder="e.g. Glow Candle Co." />
                  {setupErrors.name && <span className="err-msg">{setupErrors.name}</span>}
                </div>
                <div className="field">
                  <label>Industry / Niche *</label>
                  <input className={setupErrors.industry ? 'field-err' : ''} value={brand.industry} onChange={e => setBrand({...brand, industry: e.target.value})} placeholder="e.g. Handmade candles & home fragrance" />
                  {setupErrors.industry && <span className="err-msg">{setupErrors.industry}</span>}
                </div>
              </div>

              <div className="field">
                <label>Tagline or Core Message</label>
                <input value={brand.tagline} onChange={e => setBrand({...brand, tagline: e.target.value})} placeholder="e.g. Light up your world." />
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Brand Voice *</label>
                  <input className={setupErrors.voice ? 'field-err' : ''} value={brand.voice} onChange={e => setBrand({...brand, voice: e.target.value})} placeholder="e.g. warm, bold, nurturing, luxurious" />
                  {setupErrors.voice && <span className="err-msg">{setupErrors.voice}</span>}
                </div>
                <div className="field">
                  <label>Brand Colors *</label>
                  <input className={setupErrors.colors ? 'field-err' : ''} value={brand.colors} onChange={e => setBrand({...brand, colors: e.target.value})} placeholder="e.g. cream, sage green, warm gold" />
                  {setupErrors.colors && <span className="err-msg">{setupErrors.colors}</span>}
                </div>
              </div>

              <div className="field">
                <label>Target Audience</label>
                <input value={brand.audience} onChange={e => setBrand({...brand, audience: e.target.value})} placeholder="e.g. Women 25–45 who value self-care and intentional living" />
              </div>
            </div>

            {/* Products */}
            <div className="panel">
              <div className="panel-title">Products & Services</div>
              <p className="hint" style={{marginBottom:'16px'}}>Add each product, service, or offer you want to create ads for.</p>

              <div className="prod-grid">
                {products.map(p => (
                  <div key={p.id} className="prod-card">
                    <button className="pc-del" onClick={() => removeProduct(p.id)}>×</button>
                    <div className="pc-name">{p.name}</div>
                    <div className="pc-msg">{p.affirmation}</div>
                  </div>
                ))}
                <div className="prod-card add-card" onClick={() => setShowAddProduct(true)}>
                  <div className="plus">+</div>
                  <div className="al">Add Product</div>
                </div>
              </div>
            </div>

            {/* Access */}
            <div className="panel">
              <div className="panel-title">API Access</div>

              <span className="tier-label">Select Your Plan</span>
              <div className="tier-row">
                <button className={`tier-btn${tier==='free'?' sel':''}`} onClick={() => setTier('free')}>
                  Free — Use My Own Key
                </button>
                <button className={`tier-btn${tier==='paid'?' sel':''}`} onClick={() => setTier('paid')}>
                  Pro — Use Server Key
                </button>
              </div>

              {tier === 'free' && (
                <div className="field">
                  <label>Your Gemini API Key *</label>
                  <input
                    type="password"
                    className={setupErrors.apiKey ? 'field-err' : ''}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="AIza..."
                  />
                  {setupErrors.apiKey && <span className="err-msg">{setupErrors.apiKey}</span>}
                  <span className="hint">Your key is saved locally and never sent to our servers except to make API calls.</span>
                </div>
              )}

              {tier === 'paid' && (
                <div className="field">
                  <label>Access Code</label>
                  <input
                    type="password"
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value)}
                    placeholder="Enter your access code"
                  />
                  <span className="hint">Enter the access code provided when you purchased Pro access.</span>
                </div>
              )}

              <button className="btn-pri" onClick={saveBrand}>
                ✦ Save & Launch Generator
              </button>
            </div>
          </>
        )}

        {/* ── GENERATOR SCREEN ────────────────────────────────────────── */}
        {screen === 'generator' && (
          <>
            <div className="panel">
              <div className="panel-title">Build Your Campaign</div>

              {/* Products */}
              <div style={{marginBottom:'20px'}}>
                <label style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--brown-mid)',display:'block',marginBottom:'10px'}}>
                  Select Product or Service
                </label>
                {products.length === 0 ? (
                  <div style={{color:'var(--brown-light)',fontSize:'12px',padding:'12px 0'}}>
                    No products added yet. <button style={{color:'var(--gold)',background:'none',border:'none',cursor:'pointer',fontSize:'12px',textDecoration:'underline'}} onClick={() => setScreen('setup')}>Go to setup →</button>
                  </div>
                ) : (
                  <div className="prod-grid">
                    {products.map(p => (
                      <div key={p.id} className={`prod-card${selProduct===p.id?' sel':''}`} onClick={() => setSelProduct(p.id)}>
                        <div className="pc-name">{p.name}</div>
                        <div className="pc-msg">{p.affirmation}</div>
                      </div>
                    ))}
                    <div className="prod-card add-card" onClick={() => { setScreen('setup'); setShowAddProduct(true); }}>
                      <div className="plus">+</div>
                      <div className="al">Add</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="gen-grid">
                <div>
                  <label style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--brown-mid)',display:'block',marginBottom:'10px'}}>Platform</label>
                  <div className="platform-row">
                    {PLATFORMS.map(p => (
                      <button key={p.id} className={`pb${selPlatform===p.id?' sel':''}`} onClick={() => setSelPlatform(p.id)}>{p.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--brown-mid)',display:'block',marginBottom:'10px'}}>Number of Ads</label>
                  <div className="count-row">
                    <button className="cb" onClick={() => setAdCount(c => Math.max(1,c-1))}>−</button>
                    <div className="cd">{adCount}</div>
                    <button className="cb" onClick={() => setAdCount(c => Math.min(8,c+1))}>+</button>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Campaign Goal or Direction (optional)</label>
                <textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. 'Focus on new moms who need a moment to themselves' or 'Push the holiday gift angle'" />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button className="btn-pri" disabled={generating} onClick={generate}>
                {generating ? '✦ Generating...' : '✦ Generate Ad Campaign'}
              </button>
            </div>

            {/* Results */}
            {generating && (
              <div className="gen-banner">
                <div className="spin"></div>
                Crafting your campaign — copy generating now, images will follow...
              </div>
            )}

            {ads.map((ad, i) => {
              const product = products.find(p => p.id === selProduct)
              const platform = PLATFORMS.find(p => p.id === selPlatform)
              return (
                <div key={i} className="ad-card" style={{animationDelay:`${i*0.08}s`}}>
                  <div className="ac-hdr">
                    <div className="ac-num">Ad {i+1} of {ads.length}</div>
                    <div className="tags">
                      {product && <span className="tag">{product.name}</span>}
                      {platform && <span className="tag">{platform.label}</span>}
                    </div>
                  </div>
                  <div className="ac-body">
                    <div className="img-sec">
                      <div className="img-lbl">Generated Image · {platform?.ratio}</div>
                      <div className="img-box">
                        {ad.imageLoading ? (
                          <div className="img-loading">
                            <div className="spin"></div>
                            <span>Generating image...</span>
                          </div>
                        ) : ad.imageData ? (
                          <img src={`data:${ad.imageMime};base64,${ad.imageData}`} alt={product?.name} />
                        ) : (
                          <div className="img-fallback">
                            <div className="fi-icon">✦</div>
                            <div className="fi-name">{product?.name}</div>
                            <div className="fi-aff">"{product?.affirmation}"</div>
                            <div className="fi-div"></div>
                            <div className="fi-notes">{product?.notes}</div>
                          </div>
                        )}
                      </div>

                      <div className="vp-box">
                        <span className="vp-lbl">🎬 Video / Reel Prompt</span>
                        <div className="vp-row"><span className="vp-k">Camera</span><span className="vp-v">{ad.video?.camera}</span></div>
                        <div className="vp-row"><span className="vp-k">Angle</span><span className="vp-v">{ad.video?.angle}</span></div>
                        <div className="vp-row"><span className="vp-k">Lighting</span><span className="vp-v">{ad.video?.lighting}</span></div>
                        <div className="vp-row"><span className="vp-k">Mood</span><span className="vp-v">{ad.video?.mood}</span></div>
                        {ad.video?.dialogue && <div className="vp-row"><span className="vp-k">Dialogue</span><span className="vp-v">"{ad.video.dialogue}"</span></div>}
                        <div className="vp-row"><span className="vp-k">Action</span><span className="vp-v">{ad.video?.action}</span></div>
                      </div>
                    </div>

                    <div className="copy-sec">
                      <div><span className="cb-lbl">Hook</span><div className="hook">{ad.hook}</div></div>
                      <div><span className="cb-lbl">Primary Text</span><div className="pt">{ad.primaryText}</div></div>
                      <div><span className="cb-lbl">Headline</span><div className="hl">{ad.headline}</div></div>
                      <div><span className="cb-lbl">Call to Action</span><span className="cta-badge">{ad.cta}</span></div>
                      <div className="strat">
                        <span className="strat-lbl">Campaign Strategy</span>
                        <div className="sr"><span className="sk">Audience</span><span className="sv">{ad.strategy?.audience}</span></div>
                        <div className="sr"><span className="sk">Angle</span><span className="sv">{ad.strategy?.angle}</span></div>
                        <div className="sr"><span className="sk">Purpose</span><span className="sv">{ad.strategy?.purpose}</span></div>
                        <div className="sr"><span className="sk">Best Time</span><span className="sv">{ad.strategy?.bestTime}</span></div>
                        <div className="sr"><span className="sk">Why Works</span><span className="sv">{ad.strategy?.whyItWorks}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Add Product Modal */}
      <div className={`modal-overlay${showAddProduct?' open':''}`}>
        <div className="modal">
          <h3>Add Product or Service</h3>
          <div className="field"><label>Name *</label><input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Lavender Dreams Candle" /></div>
          <div className="field"><label>Core Message or Tagline *</label><input value={newProduct.affirmation} onChange={e => setNewProduct({...newProduct, affirmation: e.target.value})} placeholder="e.g. You deserve peace." /></div>
          <div className="field"><label>Details / Features</label><input value={newProduct.notes} onChange={e => setNewProduct({...newProduct, notes: e.target.value})} placeholder="e.g. Soy wax, 50hr burn, lavender & vanilla" /></div>
          <div className="field"><label>Product Type</label><input value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})} placeholder="e.g. 8oz candle" /></div>
          <div className="field"><label>Visual Mood</label><input value={newProduct.mood} onChange={e => setNewProduct({...newProduct, mood: e.target.value})} placeholder="e.g. soft, serene, cozy, luxurious" /></div>
          <div className="modal-actions">
            <button className="btn-sec" onClick={() => setShowAddProduct(false)}>Cancel</button>
            <button className="btn-pri" style={{marginTop:0,flex:1}} onClick={addProduct}>Add Product</button>
          </div>
        </div>
      </div>
    </>
  )
}
