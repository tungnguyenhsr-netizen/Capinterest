import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'capinterest-dev-secret-change-in-production';

// ─── JSON File Database ───────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readDB(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function writeDB(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Fetch Google Images via Serper.dev (real Google Image Search results)
async function fetchGoogleImages(query, page = 1) {
  if (!SERPER_API_KEY) {
    console.warn('[Serper] SERPER_API_KEY not set – skipping Google image search');
    return [];
  }

  try {
    const response = await axios.post('https://google.serper.dev/images', {
      q: query,
      num: 10
    }, {
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 8000
    });

    const items = response.data.images || [];
    console.log(`[Serper] Returned ${items.length} Google images for "${query}" page ${page}`);
    return items.map(item => ({
      id: item.imageUrl,
      title: item.title || 'Google Image',
      image: item.imageUrl,
      thumbnail: item.thumbnailUrl || item.imageUrl,
      source: 'google',
      url: item.link || item.imageUrl,
      creator: item.source || item.domain || 'Google'
    }));
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.warn('[Serper] Image search failed:', msg);
    return [];
  }
}


// Helper: Fetch Pinterest Images (falls back to search engine image query to get real Pinterest pins)
async function fetchPinterestImages(query, page = 1) {
  const searchQuery = `pinterest ${query}`;
  const firstOffset = (page - 1) * 20 + 1; // Bing pagination offset (starts at 1, 21, 41, etc.)
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&first=${firstOffset}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.bing.com/'
  };

  try {
    const response = await axios.get(url, { headers, timeout: 5000 });
    const html = response.data;
    const results = [];
    let idx = html.indexOf('class="iusc"');
    while (idx !== -1) {
      const mStart = html.indexOf('m="', idx);
      if (mStart !== -1 && mStart - idx < 300) {
        const valStart = mStart + 3;
        const valEnd = html.indexOf('"', valStart);
        if (valEnd !== -1) {
          const val = html.slice(valStart, valEnd);
          const decoded = val.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          try {
            const parsed = JSON.parse(decoded);
            const imageUrl = parsed.murl;
            const pageUrl = parsed.purl || '';
            // Only keep results that are from Pinterest
            const isPinterest = imageUrl.includes('pinimg.com') || pageUrl.includes('pinterest.com') || /\.pinterest\./.test(pageUrl);
            const isDuplicate = results.some(r => r.image === imageUrl);
            if (imageUrl && isPinterest && !isDuplicate) {
              // Clean up title
              let title = parsed.t || 'Pinterest Pin';
              if (title.includes('|')) title = title.split('|')[0].trim();
              if (title.includes(' - Pinterest')) title = title.replace(' - Pinterest', '').trim();
              if (title.includes(' | Pinterest')) title = title.split(' | Pinterest')[0].trim();
              
              // Skip trash/advertisement results (e.g. logos, promos, ads, profiles, icons)
              const trashKeywords = [
                'logo', 'ads', 'promo', 'marketing', 'advertisement', 'sign up', 'log in', 
                'register', 'install', 'app store', 'google play', 'download', 'vector', 'icon', 
                'avatar', 'profile', 'clipart', 'badge', 'banner', 'button', 'infographic', 'advert',
                'gift card', 'coupon', 'discount', 'sale', 'price', 'buy now', 'shop online', 'store',
                'pinterst', 'follow me on', 'pinterest logo', 'pinterest icon'
              ];
              const lowercaseTitle = title.toLowerCase();
              const lowercaseUrl = imageUrl.toLowerCase();
              
              const isTrash = trashKeywords.some(kw => {
                if (kw === 'pinterest') {
                  return lowercaseTitle === 'pinterest' || 
                         lowercaseTitle.includes('pinterest logo') || 
                         lowercaseTitle.includes('pinterest icon') ||
                         lowercaseTitle.includes('pinterest app') ||
                         lowercaseTitle.includes('pinterest profile') ||
                         lowercaseTitle.includes('pinterest account');
                }
                return lowercaseTitle.includes(kw) || lowercaseUrl.includes(kw);
              });
              
              if (!isTrash) {
                results.push({
                  title,
                  image: imageUrl,
                  thumbnail: parsed.turl || imageUrl,
                  source: 'pinterest',
                  url: pageUrl || imageUrl,
                  creator: pageUrl ? new URL(pageUrl).hostname.replace('www.', '') : 'pinterest'
                });
              } else {
                console.log(`[FILTERED] Scraper filtered out trash item: "${title}" (${imageUrl})`);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
      idx = html.indexOf('class="iusc"', idx + 12);
    }
    
    // Return the first 15 results fetched for this offset
    const limit = 15;
    return results.slice(0, limit);
  } catch (err) {
    console.warn('Pinterest fetching error via search engine fallback:', err.message);
    return [];
  }
}

// Search Endpoint - Google Custom Search + Pinterest merged
app.get('/api/scrape', async (req, res) => {
  const query = req.query.query || 'trendy caps';
  const page = parseInt(req.query.page) || 1;
  console.log(`Scraping request for query: "${query}", page: ${page}`);
  
  try {
    // Fetch Google and Pinterest in parallel
    const [googleResults, pinterestResults] = await Promise.all([
      fetchGoogleImages(query, page).catch(err => {
        console.warn('Google fetching failed:', err.message);
        return [];
      }),
      fetchPinterestImages(query, page).catch(err => {
        console.warn('Pinterest fetching failed:', err.message);
        return [];
      })
    ]);

    // Merge and deduplicate by image URL
    const seenUrls = new Set();
    const merged = [];
    
    // Interleave: alternate Google and Pinterest for variety
    const maxLen = Math.max(googleResults.length, pinterestResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < googleResults.length) {
        const item = googleResults[i];
        if (item.image && !seenUrls.has(item.image)) {
          seenUrls.add(item.image);
          merged.push(item);
        }
      }
      if (i < pinterestResults.length) {
        const item = pinterestResults[i];
        if (item.image && !seenUrls.has(item.image)) {
          seenUrls.add(item.image);
          merged.push(item);
        }
      }
    }

    const sources = [];
    if (googleResults.length > 0) sources.push('google');
    if (pinterestResults.length > 0) sources.push('pinterest');
    
    if (merged.length > 0) {
      console.log(`Merged ${googleResults.length} Google + ${pinterestResults.length} Pinterest = ${merged.length} unique results for page ${page}.`);
      return res.json({ success: true, source: sources.join('+'), data: merged });
    }

    return res.status(404).json({ success: false, error: 'Không tìm thấy kết quả nào từ Google Custom Search hoặc Pinterest.' });

  } catch (error) {
    console.error('All search options failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve Link Endpoint (Dán link nón tự động)
app.post('/api/resolve-link', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp liên kết' });
  }

  // Check if it's already a direct image link (ends with extension or is data URL)
  let isDirect = /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) || url.startsWith('data:image/');
  
  if (!isDirect) {
    try {
      // Try to check Content-Type with a quick HEAD request
      const headResponse = await axios.head(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
        }, 
        timeout: 2500 
      });
      const contentType = headResponse.headers['content-type'] || '';
      if (contentType.startsWith('image/')) {
        isDirect = true;
      }
    } catch (e) {
      // If HEAD fails, we'll try standard page scraping next
    }
  }

  if (isDirect) {
    let title = 'Nón liên kết';
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      if (filename && filename.includes('.')) {
        title = filename.substring(0, filename.lastIndexOf('.'));
        title = decodeURIComponent(title).replace(/[-_]/g, ' ');
        if (title.length > 30) title = title.substring(0, 30) + '...';
      }
    } catch (e) {}

    return res.json({
      success: true,
      data: {
        image: url,
        title: title || 'Nón liên kết',
        creator: 'Link trực tiếp'
      }
    });
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.google.com/'
    };

    // Fetch page with redirection followed
    const response = await axios.get(url, { headers, timeout: 8000, maxRedirects: 5 });
    const finalUrl = response.request.res.responseUrl || url;
    const html = response.data;

    // Pinterest-specific fallback check
    if (finalUrl.includes('pinterest.com/pin/') || finalUrl.includes('pin.it/')) {
      const pinIdMatch = finalUrl.match(/\/pin\/(\d+)/);
      if (pinIdMatch) {
        const pinId = pinIdMatch[1];
        try {
          // Attempt Pinterest Widget API
          const widgetUrl = `https://widgets.pinterest.com/v3/pidgets/pin/${pinId}/`;
          const widgetResponse = await axios.get(widgetUrl, { timeout: 4000 });
          if (widgetResponse.data && widgetResponse.data.status === 'success' && widgetResponse.data.data) {
            const pinData = widgetResponse.data.data;
            return res.json({
              success: true,
              data: {
                image: pinData.images['736x']?.url || pinData.images.board?.url || pinData.image_large_url,
                title: pinData.description || pinData.board?.name || 'Ảnh Pinterest',
                creator: pinData.pinner?.name || 'Pinterest User'
              }
            });
          }
        } catch (widgetErr) {
          console.warn('Pinterest Widget API failed, falling back to OG tags:', widgetErr.message);
        }
      }
    }

    // Standard Open Graph tags extraction
    const ogImageRegex = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i;
    const ogImageRegexAlt = /<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i;
    let image = (html.match(ogImageRegex) || html.match(ogImageRegexAlt))?.[1];

    if (!image) {
      // Try twitter:image
      const twImageRegex = /<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i;
      const twImageRegexAlt = /<meta[^>]*content="([^"]+)"[^>]*name="twitter:image"/i;
      image = (html.match(twImageRegex) || html.match(twImageRegexAlt))?.[1];
    }

    // Standard Open Graph title extraction
    const ogTitleRegex = /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i;
    const ogTitleRegexAlt = /<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i;
    let title = (html.match(ogTitleRegex) || html.match(ogTitleRegexAlt))?.[1];

    if (!title) {
      // Fallback to HTML <title> tag
      const titleTagRegex = /<title[^>]*>([^<]+)<\/title>/i;
      title = html.match(titleTagRegex)?.[1];
    }

    if (!image) {
      return res.status(400).json({ 
        success: false, 
        error: 'Không thể tìm thấy liên kết hình ảnh tự động từ trang này (có thể do trang web chặn bảo mật bot). Bạn vui lòng nhấp chuột phải vào ảnh trên trang web đó, chọn "Sao chép địa chỉ hình ảnh" (Copy Image Address) rồi dán trực tiếp link ảnh đó vào đây nhé!' 
      });
    }

    // Clean outputs
    title = title ? title.trim() : 'Nón thiết kế';
    if (title.length > 50) title = title.substring(0, 50) + '...';

    let creator = 'Nguồn web';
    try {
      const parsedUrl = new URL(finalUrl);
      creator = parsedUrl.hostname.replace('www.', '');
    } catch (e) {}

    return res.json({
      success: true,
      data: {
        image,
        title,
        creator
      }
    });

  } catch (error) {
    console.error('Resolve link error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: `Không thể kết nối đến địa chỉ này (${error.message}). Bạn vui lòng kiểm tra lại liên kết hoặc dán trực tiếp địa chỉ ảnh gốc (kết thúc bằng .jpg, .png...).` 
    });
  }
});

// AI Analyze Endpoint (Proxy for Gemini API)
app.post('/api/analyze', async (req, res) => {
  const { image, apiKey: clientApiKey } = req.body;
  let apiKey = clientApiKey;

  // Try to load apiKey from user account if they are logged in
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        const users = readDB('users');
        const user = users.find(u => u.id === decoded.userId);
        if (user && user.apiKey) {
          apiKey = user.apiKey;
          console.log(`[AI Analyze] Using saved API key for user: ${user.username}`);
        }
      }
    } catch (err) {
      console.warn('[AI Analyze] Optional auth token verification failed:', err.message);
    }
  }

  // Fallback to process.env if still not set
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY;
  }

  if (!image) {
    return res.status(400).json({ success: false, error: 'No image provided' });
  }

  // If no API key is available, return detailed mockup response
  if (!apiKey) {
    console.log('No Gemini API key provided. Returning high-fidelity mock AI analysis.');
    return simulateAiAnalysis(res);
  }

  try {
    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (image.startsWith('http://') || image.startsWith('https://')) {
      // Backend download fallback for URLs (avoiding frontend CORS block)
      console.log('Downloading image in backend for Gemini API:', image);
      const imgRes = await axios.get(image, { responseType: 'arraybuffer', timeout: 5000 });
      base64Data = Buffer.from(imgRes.data, 'binary').toString('base64');
      mimeType = imgRes.headers['content-type'] || 'image/jpeg';
    } else {
      // Direct base64 data
      base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a professional fashion design AI specializing in headwear (caps, beanies, hats, helmets).
                Analyze the provided image of a headwear item and return a JSON object with the following fields:
                - style: The style classification (e.g., Snapback, Beanie, Bucket Hat, Techwear Visor, Fedora, Balaclava).
                - material: Primary material(s) visible (e.g., Corduroy, Ripstop Nylon, Wool Knit, Brushed Cotton, Leather).
                - colorPalette: Array of 3-5 hex codes representing the primary color palette of the headwear.
                - trendScore: A score from 0-100 indicating how trendy/fashionable it is currently.
                - aestheticDescription: A rich, professional 2-3 sentence analysis of its design language, detailing why it stands out.
                - outfitMatches: Array of 3 outfit combination ideas that pair perfectly with this headwear (e.g., "Paired with a black oversized techwear hoodie and cargo pants").
                
                IMPORTANT: Return ONLY the raw JSON object. Do not wrap it in markdown code blocks or any other formatting. Ensure the JSON is valid.`
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const contentText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contentText) {
      throw new Error('Empty response from Gemini API');
    }

    // Attempt to parse JSON (sometimes Gemini wraps in ```json ... ``` despite instructions)
    let jsonString = contentText.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    }

    const analysisResult = JSON.parse(jsonString);
    return res.json({ success: true, source: 'gemini', data: analysisResult });

  } catch (error) {
    console.error('Gemini API call failed:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Gemini API call failed. Falling back to Demo Mode.',
      fallbackData: getMockAnalysis()
    });
  }
});

function getMockAnalysis() {
  const styles = ['Techwear Bucket Hat', 'Vintage Corduroy Dad Hat', 'Minimalist Visor', 'Futuristic Streetwear Cap', 'Chunky Knit Beanie'];
  const materials = ['Ripstop Nylon & TPU', 'Corduroy & Cotton', 'Translucent Polycarbonate & Carbon Fiber', 'Reflective Mesh & Chrome Accents', 'Chunky Merino Wool'];
  const palettes = [
    ['#00f0ff', '#1a1a1a', '#7f00ff'],
    ['#d4af37', '#4a3c31', '#f5f5dc'],
    ['#ffffff', '#222222', '#888888'],
    ['#ff007f', '#121212', '#00ffcc'],
    ['#5f8575', '#e9e4db', '#8c7853']
  ];
  
  const idx = Math.floor(Math.random() * styles.length);

  return {
    style: styles[idx],
    material: materials[idx],
    colorPalette: palettes[idx],
    trendScore: Math.floor(Math.random() * 25) + 75, // 75-99
    aestheticDescription: `This design highlights a stunning fusion of modern textures with subculture aesthetics. Its structured panels create a defined silhouette, while premium material details add durability and depth, making it a prominent statement piece in any modern wardrobe.`,
    outfitMatches: [
      "An oversized monochrome windbreaker and utility cargo pants.",
      "A minimalist knit sweater, tailored trousers, and leather boots.",
      "A graphic streetwear tee, distressed wide-leg jeans, and high-top sneakers."
    ]
  };
}

function simulateAiAnalysis(res) {
  setTimeout(() => {
    return res.json({
      success: true,
      source: 'mock_ai',
      data: getMockAnalysis()
    });
  }, 2000); // Simulate scan delay
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin' });
  if (username.length < 3)
    return res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
  if (password.length < 6)
    return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' });

  const users = readDB('users');
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(409).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    username,
    passwordHash,
    aiMode: 'demo',
    apiKey: '',
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeDB('users', users);

  const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '30d' });
  console.log(`[Auth] New user registered: ${username}`);
  res.json({ success: true, token, username });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin' });

  const users = readDB('users');
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' });

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  console.log(`[Auth] User logged in: ${user.username}`);
  res.json({ success: true, token, username: user.username });
});

// ─── Collection Routes ────────────────────────────────────────────────────────

// GET /api/collection — lấy collection của user hiện tại
app.get('/api/collection', authMiddleware, (req, res) => {
  const all = readDB('collections');
  const userItems = all.filter(c => c.userId === req.user.userId)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .map(c => c.item);
  res.json({ success: true, data: userItems });
});

// POST /api/collection/add — thêm 1 item
app.post('/api/collection/add', authMiddleware, (req, res) => {
  const { item } = req.body || {};
  if (!item || !(item.id || item.image))
    return res.status(400).json({ success: false, error: 'Thiếu thông tin item' });

  const itemId = item.id || item.image;
  const all = readDB('collections');
  const exists = all.find(c => c.userId === req.user.userId && c.itemId === itemId);
  if (!exists) {
    all.push({ userId: req.user.userId, itemId, item, savedAt: new Date().toISOString() });
    writeDB('collections', all);
  }
  res.json({ success: true });
});

// DELETE /api/collection/remove — xoá 1 item
app.delete('/api/collection/remove', authMiddleware, (req, res) => {
  const { itemId } = req.body || {};
  if (!itemId) return res.status(400).json({ success: false, error: 'Thiếu itemId' });

  let all = readDB('collections');
  all = all.filter(c => !(c.userId === req.user.userId && c.itemId === itemId));
  writeDB('collections', all);
  res.json({ success: true });
});

// POST /api/collection/migrate — migrate hàng loạt từ localStorage
app.post('/api/collection/migrate', authMiddleware, (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ success: false, error: 'Không có item nào để migrate' });

  let all = readDB('collections');
  let addedCount = 0;

  for (const item of items) {
    const itemId = item.id || item.image;
    if (!itemId) continue;
    const exists = all.find(c => c.userId === req.user.userId && c.itemId === itemId);
    if (!exists) {
      all.push({ userId: req.user.userId, itemId, item, savedAt: new Date().toISOString() });
      addedCount++;
    }
  }

  writeDB('collections', all);
  console.log(`[Migrate] User ${req.user.username} migrated ${addedCount} items`);
  res.json({ success: true, added: addedCount });
});

// ─── User Settings Routes ───────────────────────────────────────────────────

// GET /api/user/settings — lấy cấu hình AI của user
app.get('/api/user/settings', authMiddleware, (req, res) => {
  const users = readDB('users');
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
  }
  res.json({
    success: true,
    aiMode: user.aiMode || 'demo',
    apiKey: user.apiKey || ''
  });
});

// POST /api/user/settings — cập nhật cấu hình AI của user
app.post('/api/user/settings', authMiddleware, (req, res) => {
  const { aiMode, apiKey } = req.body || {};
  const users = readDB('users');
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
  }
  
  users[userIndex].aiMode = aiMode || 'demo';
  users[userIndex].apiKey = apiKey || '';
  
  writeDB('users', users);
  console.log(`[Settings] User ${users[userIndex].username} updated AI settings.`);
  res.json({ success: true });
});

// ─── AI Design Chat Route ───────────────────────────────────────────────────

// POST /api/design-chat — Trò chuyện thiết kế nón với AI Design Agent
app.post('/api/design-chat', authMiddleware, async (req, res) => {
  const { prompt, collection } = req.body || {};
  const users = readDB('users');
  const user = users.find(u => u.id === req.user.userId);
  
  let apiKey = user?.apiKey || process.env.GEMINI_API_KEY || '';
  const aiMode = user?.aiMode || 'demo';
  
  if (!prompt) {
    return res.status(400).json({ success: false, error: 'Vui lòng cung cấp ý tưởng thiết kế' });
  }

  // Format collection data as context
  let collectionContext = 'Trống (chưa có nón yêu thích trong bộ sưu tập)';
  if (Array.isArray(collection) && collection.length > 0) {
    collectionContext = collection.map((item, idx) => 
      `${idx + 1}. Tiêu đề: "${item.title || 'Nón'}" (Nhà sáng tạo: ${item.creator || 'Streetwear'}, Phân loại: ${item.category || 'Chung'})`
    ).join('\n');
  }

  // If in demo mode or no API key, return mock response
  if (aiMode === 'demo' || !apiKey) {
    console.log('[Design Agent] No API key or Demo Mode active. Simulating concept.');
    return simulateDesignResponse(res, prompt);
  }

  try {
    console.log(`[Design Agent] Calling Gemini API for user: ${req.user.username}`);
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a professional fashion design AI specializing in headwear. You are acting as "Hat Design Agent", an interactive designer.
                The user has a collection of liked hats:
                ${collectionContext}
                
                The user's design idea or prompt is: "${prompt}".
                
                Help the user brainstorm and design a new hat concept based on their collection (as inspiration for their tastes) and their design idea.
                Provide your response in Vietnamese in a beautifully structured markdown format:
                
                ### 🎩 Concept: [Concept Name]
                
                **Mô tả thiết kế:**
                [Detailed visual, structural, and aesthetic description in Vietnamese]
                
                **Chất liệu đề xuất:**
                - [Material 1]
                - [Material 2]
                
                **Bảng màu chủ đạo:**
                - Hex 1: #[HexCode]
                - Hex 2: #[HexCode]
                - Hex 3: #[HexCode]
                
                **Gợi ý phối đồ:**
                [Stylist suggestions on how to wear this hat]
                
                **Prompt sinh ảnh AI (Midjourney/DALL-E):**
                \`\`\`
                [Detailed English prompt for image generation]
                \`\`\`
                
                Keep the tone professional, creative, and enthusiastic. Ensure you respond in Vietnamese (except the English AI Image prompt).`
              }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const contentText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contentText) {
      throw new Error('Empty response from Gemini API');
    }

    res.json({ success: true, reply: contentText });

  } catch (error) {
    console.error('[Design Agent] Gemini API call failed:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Gemini API call failed. Falling back to Demo Mode.',
      reply: getMockDesignReply(prompt)
    });
  }
});

function getMockDesignReply(prompt) {
  return `### 🎩 Concept: CyberNeon Cap-X

**Mô tả thiết kế:**
Mẫu thiết kế nón lưỡi trai lấy cảm hứng từ ý tưởng của bạn: "${prompt}" kết hợp với các bộ sưu tập trước đây của bạn. Phía trước được trang trí bằng một bảng điều khiển thêu 3D phát quang với họa tiết hình học, trong khi lưỡi trai có viền nhựa dẻo dạ quang. Đây là thiết kế nón mang hơi thở viễn tưởng cực cool.

**Chất liệu đề xuất:**
- Vải dệt công nghệ chống nước Ripstop Nylon siêu nhẹ.
- Tấm nhựa dẻo dạ quang phát sáng nhẹ.
- Khóa bấm kim loại mạ chrome phía sau.

**Bảng màu chủ đạo:**
- Hex 1: #00f0ff (Neon Cyan)
- Hex 2: #1a1a1e (Matte Black)
- Hex 3: #ff007f (Neon Pink)

**Gợi ý phối đồ:**
Phối nón này cùng với áo khoác bomber techwear màu đen oversized, quần túi hộp cargo và giày sneakers hầm hố có đế cao su trong suốt để tạo nên outfit chuẩn phong cách Streetwear tương lai.

**Prompt sinh ảnh AI (Midjourney/DALL-E):**
\`\`\`
A futuristic cyberpunk cap with transparent glowing neon cyan accents, structured matte black techwear ripstop fabric, purple highlights, high-tech streetwear design, detailed texture, studio lighting, hyperrealistic, 8k --ar 1:1
\`\`\`

*(Lưu ý: Bạn nhận được câu trả lời này từ chế độ Demo vì chưa thiết lập hoặc lưu API Key Gemini)*`;
}

function simulateDesignResponse(res, prompt) {
  setTimeout(() => {
    res.json({
      success: true,
      reply: getMockDesignReply(prompt)
    });
  }, 1500);
}

// ─── Admin Database Backup & Restore Routes ─────────────────────────────────

// GET /api/admin/backup — tải bản sao lưu của toàn bộ dữ liệu
app.get('/api/admin/backup', authMiddleware, (req, res) => {
  const users = readDB('users');
  const collections = readDB('collections');
  res.json({
    success: true,
    data: {
      users,
      collections
    }
  });
});

// POST /api/admin/restore — khôi phục dữ liệu từ bản sao lưu
app.post('/api/admin/restore', authMiddleware, (req, res) => {
  const { users, collections } = req.body || {};
  if (!Array.isArray(users) || !Array.isArray(collections)) {
    return res.status(400).json({ success: false, error: 'File sao lưu không hợp lệ' });
  }

  writeDB('users', users);
  writeDB('collections', collections);
  console.log(`[Backup/Restore] Database restored by user: ${req.user.username}`);
  res.json({ success: true, message: 'Khôi phục dữ liệu hệ thống thành công!' });
});

// ─── Health check endpoint (dùng cho UptimeRobot để giữ server thức) ─────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler (tránh crash khi có lỗi không xử lý được) ──────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Catch unhandled promise rejections (tránh crash process) ─────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Không exit process — giữ server chạy tiếp
});

// Start Server
app.listen(PORT, () => {
  console.log(`CapInterest server running at http://localhost:${PORT}`);
});
