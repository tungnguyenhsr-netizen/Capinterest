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
import { scrapePinterestWithFirecrawl } from './firecrawl_scraper.js';
import { fetchDuckDuckGoImages, fetchBingImages, preFilterItems } from './scrapers.js';

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
                'pinterest', 'follow me on', 'pinterest logo', 'pinterest icon'
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

// ─── Google Drive & Storage Helpers ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function getGoogleAuthToken() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  }
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const jwtClaim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const token = jwt.sign(jwtClaim, serviceAccount.private_key, { algorithm: 'RS256' });
  
  const res = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token
  }, { timeout: 6000 });
  
  return res.data.access_token;
}

async function uploadToGoogleDrive(filename, mimeType, buffer) {
  const accessToken = await getGoogleAuthToken();
  const boundary = 'boundary_marker_capinterest';
  const metadata = {
    name: filename,
    mimeType: mimeType
  };
  
  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);

  const uploadRes = await axios.post(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    multipartBody,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      timeout: 10000
    }
  );
  
  const fileId = uploadRes.data.id;
  if (!fileId) throw new Error('Google Drive upload did not return a file ID');
  
  // Set reader permission for anyone
  await axios.post(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      role: 'reader',
      type: 'anyone'
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 6000
    }
  );
  
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

async function downloadImageToBuffer(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
  return Buffer.from(response.data);
}

function parseDataUrl(dataUrl) {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Data URL không hợp lệ');
  }
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
}

async function uploadImageToDriveOrLocal(imageInput, filenamePrefix = 'hat') {
  let buffer;
  let mimeType = 'image/jpeg';
  let fileExtension = 'jpg';
  
  if (imageInput.startsWith('data:image/')) {
    try {
      const parsed = parseDataUrl(imageInput);
      buffer = parsed.buffer;
      mimeType = parsed.mimeType;
      fileExtension = mimeType.split('/')[1] || 'jpg';
    } catch (err) {
      console.error('[Upload] Failed to parse base64 image:', err.message);
      throw new Error('Không thể xử lý ảnh base64');
    }
  } else {
    try {
      buffer = await downloadImageToBuffer(imageInput);
      const extMatch = imageInput.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i);
      if (extMatch) {
        fileExtension = extMatch[1].toLowerCase();
        if (fileExtension === 'jpg') fileExtension = 'jpeg';
        mimeType = `image/${fileExtension}`;
        if (fileExtension === 'jpeg') fileExtension = 'jpg';
      }
    } catch (err) {
      console.error(`[Upload] Failed to download image from ${imageInput}:`, err.message);
      throw new Error('Không thể tải ảnh từ liên kết nón');
    }
  }

  const filename = `${filenamePrefix}_${Date.now()}.${fileExtension}`;
  
  // Try Google Drive if configured
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      console.log('[Google Drive] Uploading file:', filename);
      const directLink = await uploadToGoogleDrive(filename, mimeType, buffer);
      console.log('[Google Drive] Upload success:', directLink);
      return directLink;
    } catch (err) {
      console.warn('[Google Drive] Failed, falling back to local. Reason:', err.message);
    }
  }
  
  // Local fallback
  const localFilePath = path.join(uploadsDir, filename);
  fs.writeFileSync(localFilePath, buffer);
  console.log('[Local Storage] Saved file locally:', localFilePath);
  return `/uploads/${filename}`;
}

// ─── Cache & Search Limit Helpers ───────────────────────────────────────────
const SCRAPED_HATS_FILE = path.join(DATA_DIR, 'scraped_hats.json');
const SERPER_USAGE_FILE = path.join(DATA_DIR, 'serper_usage.json');
const REPORTED_IMAGES_FILE = path.join(DATA_DIR, 'reported_images.json');
const MAX_SERPER_CALLS_PER_DAY = 30;

function getCachedHats() {
  if (!fs.existsSync(SCRAPED_HATS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCRAPED_HATS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function getReportedImages() {
  if (!fs.existsSync(REPORTED_IMAGES_FILE)) {
    try {
      fs.writeFileSync(REPORTED_IMAGES_FILE, JSON.stringify([], null, 2));
    } catch (err) {
      console.error('[Report] Failed to create reported_images.json:', err.message);
    }
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(REPORTED_IMAGES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

const LEARNED_FILTERS_FILE = path.join(DATA_DIR, 'learned_filters.json');

function getLearnedFilters() {
  const defaultFilters = {
    learnedDomains: [],
    learnedKeywords: [],
    learnedUrlPatterns: [],
    lastTrainedAt: null,
    trainedOnReportCount: 0
  };
  if (!fs.existsSync(LEARNED_FILTERS_FILE)) {
    try {
      fs.writeFileSync(LEARNED_FILTERS_FILE, JSON.stringify(defaultFilters, null, 2));
    } catch (err) {
      console.error('[Filters] Failed to create learned_filters.json:', err.message);
    }
    return defaultFilters;
  }
  try {
    return JSON.parse(fs.readFileSync(LEARNED_FILTERS_FILE, 'utf8'));
  } catch (err) {
    console.error('[Filters] Failed to parse learned_filters.json:', err.message);
    return defaultFilters;
  }
}

function saveLearnedFilters(filters) {
  try {
    fs.writeFileSync(LEARNED_FILTERS_FILE, JSON.stringify(filters, null, 2));
  } catch (err) {
    console.error('[Filters] Failed to write learned_filters.json:', err.message);
  }
}

async function runRetraining(apiKey) {
  const actualApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!actualApiKey) {
    throw new Error('No API key available for retraining');
  }
  
  const reports = getReportedImages();
  if (reports.length === 0) {
    console.log('[Retraining] No reports to train on.');
    return;
  }
  
  const simplifiedReports = reports.map(r => ({
    title: r.title,
    image: r.image,
    query: r.query
  }));
  
  const promptText = `You are analyzing a list of reported garbage images in our Cap/Hat search feed. We want to extract common domain names, title keywords, and URL path patterns that characterize garbage/unrelated items (e.g. logos, profile icons, shoes, pants, non-apparel, anime, ads) so we can block them in future scrapes.
  Analyze these reports: ${JSON.stringify(simplifiedReports)}
  Return a JSON object containing:
  - domains: array of domains to block (e.g., "deviantart.com", "pixiv.net", "facebook.com", without http/www prefix)
  - keywords: array of lowercase keywords/phrases to block in image titles (e.g. "shirt", "pant", "shoe", "logo", "icon")
  - urlPatterns: array of simple strings/regex-like substrings representing URL path patterns to block (e.g., "/logo-", "/avatar/")
  Do not output markdown format besides raw JSON, or wrap it in a code block if needed, but ensure it parses correctly.`;

  console.log(`[Retraining] Sending request to Gemini 1.5 Flash...`);
  
  if (actualApiKey === 'MOCK_TEST_KEY_12345') {
    console.log('[Retraining] Mock API Key detected. Simulating training.');
    const learnedFilters = getLearnedFilters();
    const newDomains = ['mock-garbage-domain.com'];
    const newKeywords = ['mockgarbage'];
    const newPatterns = ['/mock-bad/'];
    
    learnedFilters.learnedDomains = Array.from(new Set([...learnedFilters.learnedDomains, ...newDomains]));
    learnedFilters.learnedKeywords = Array.from(new Set([...learnedFilters.learnedKeywords, ...newKeywords]));
    learnedFilters.learnedUrlPatterns = Array.from(new Set([...learnedFilters.learnedUrlPatterns, ...newPatterns]));
    learnedFilters.lastTrainedAt = new Date().toISOString();
    learnedFilters.trainedOnReportCount = reports.length;
    saveLearnedFilters(learnedFilters);
    return;
  }

  let response;
  const urlsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${actualApiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${actualApiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${actualApiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${actualApiKey}`
  ];

  let lastError;
  for (const url of urlsToTry) {
    try {
      console.log(`[Retraining] Trying URL: ${url.split('?')[0]}`);
      response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                { text: promptText }
              ]
            }
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      break;
    } catch (err) {
      lastError = err;
      const errMsg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.warn(`[Retraining] URL ${url.split('?')[0]} failed: ${errMsg}`);
    }
  }

  if (!response) {
    throw lastError;
  }

  const contentText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!contentText) {
    throw new Error('Empty response from Gemini API during retraining');
  }

  let jsonString = contentText.trim();
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  }

  const result = JSON.parse(jsonString);
  if (!result || typeof result !== 'object') {
    throw new Error('Gemini response is not a valid JSON object');
  }

  const newDomains = Array.isArray(result.domains) ? result.domains : [];
  const newKeywords = Array.isArray(result.keywords) ? result.keywords : [];
  const newPatterns = Array.isArray(result.urlPatterns) ? result.urlPatterns : [];

  const learnedFilters = getLearnedFilters();
  
  learnedFilters.learnedDomains = Array.from(new Set([
    ...learnedFilters.learnedDomains,
    ...newDomains.map(d => d.trim().toLowerCase())
  ])).filter(Boolean);
  
  learnedFilters.learnedKeywords = Array.from(new Set([
    ...learnedFilters.learnedKeywords,
    ...newKeywords.map(k => k.trim().toLowerCase())
  ])).filter(Boolean);
  
  learnedFilters.learnedUrlPatterns = Array.from(new Set([
    ...learnedFilters.learnedUrlPatterns,
    ...newPatterns.map(p => p.trim())
  ])).filter(Boolean);

  learnedFilters.lastTrainedAt = new Date().toISOString();
  learnedFilters.trainedOnReportCount = reports.length;

  saveLearnedFilters(learnedFilters);
  console.log(`[Retraining] Successfully completed retraining. Trained on ${reports.length} reports.`);
}

function saveHatsToCache(hats, query = '') {
  const cached = getCachedHats();
  const seenUrls = new Set(cached.map(item => item.image));
  let addedCount = 0;
  
  hats.forEach(hat => {
    if (hat.image && !seenUrls.has(hat.image)) {
      seenUrls.add(hat.image);
      const cachedHat = {
        id: hat.id || `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: hat.title || 'Trendy Cap',
        image: hat.image,
        thumbnail: hat.thumbnail || hat.image,
        source: hat.source || 'scraped',
        url: hat.url || '#',
        creator: hat.creator || 'Streetwear',
        category: hat.category || 'trendy',
        tags: hat.tags || [hat.category || 'trendy'],
        query: query ? query.toLowerCase().trim() : (hat.query || ''),
        createdAt: hat.createdAt || new Date().toISOString()
      };
      cached.push(cachedHat);
      addedCount++;
    }
  });
  
  if (addedCount > 0) {
    fs.writeFileSync(SCRAPED_HATS_FILE, JSON.stringify(cached, null, 2));
    console.log(`[Cache] Cached ${addedCount} new hats. Total cached: ${cached.length}`);
  }
}

function checkSerperLimit() {
  if (!fs.existsSync(SERPER_USAGE_FILE)) return true;
  try {
    const data = JSON.parse(fs.readFileSync(SERPER_USAGE_FILE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    if (data.lastReset !== today) return true; // New day
    return data.count < MAX_SERPER_CALLS_PER_DAY;
  } catch {
    return true;
  }
}

function incrementSerperUsage() {
  const today = new Date().toISOString().slice(0, 10);
  let data = { count: 0, lastReset: today };
  if (fs.existsSync(SERPER_USAGE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SERPER_USAGE_FILE, 'utf8'));
      if (parsed.lastReset === today) data = parsed;
    } catch {}
  }
  data.count += 1;
  fs.writeFileSync(SERPER_USAGE_FILE, JSON.stringify(data, null, 2));
  console.log(`[Serper Limit] Usage count: ${data.count}/${MAX_SERPER_CALLS_PER_DAY}`);
}

function determineCategoryFromQuery(query) {
  const q = query.toLowerCase();
  if (q.includes('snapback')) return 'snapback';
  if (q.includes('bucket')) return 'bucket';
  if (q.includes('beanie') || q.includes('len')) return 'beanie';
  if (q.includes('dad hat') || q.includes('lưỡi trai') || q.includes('classic') || q.includes('vintage')) return 'dadhat';
  if (q.includes('techwear') || q.includes('visor') || q.includes('gương')) return 'techwear';
  if (q.includes('creative') || q.includes('lạ') || q.includes('độc')) return 'creative';
  if (q.includes('trendy') || q.includes('xu hướng')) return 'trendy';
  return 'trendy';
}

function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Search Endpoint - Google Custom Search + Pinterest merged with Caching and Credit Limiter
app.get('/api/scrape', async (req, res) => {
  const query = (req.query.query || 'trendy caps').toLowerCase().trim();
  const page = parseInt(req.query.page) || 1;
  const category = req.query.category || 'all';
  console.log(`Scraping request for query: "${query}", page: ${page}, category: ${category}`);
  
  const cachedHats = getCachedHats();
  let matchedHats = [];
  
  const isDefaultFeed = query === 'trendy caps' || query === 'all' || query === '';
  
  if (isDefaultFeed) {
    // Show all cached hats, sorting user added or newest first
    matchedHats = cachedHats.slice().reverse();
    if (page === 1) {
      matchedHats = shuffleArray(matchedHats);
    }
  } else {
    // Search cached hats by keyword match
    const queryWords = query.split(/\s+/).filter(w => w.length > 1);
    matchedHats = cachedHats.filter(hat => {
      const titleLower = (hat.title || '').toLowerCase();
      const tags = Array.isArray(hat.tags) ? hat.tags.map(t => t.toLowerCase()) : [];
      const catLower = (hat.category || '').toLowerCase();
      
      if (hat.query === query) return true;
      
      return queryWords.some(word => 
        titleLower.includes(word) || 
        tags.some(t => t.includes(word)) || 
        catLower.includes(word)
      );
    });
  }

  const itemsPerPage = 24;
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedCache = matchedHats.slice(startIndex, startIndex + itemsPerPage);
  
  // If we have enough cached data and it is a default feed, serve from cache
  if (isDefaultFeed && paginatedCache.length >= 8) {
    console.log(`[Cache Hit] Serving ${paginatedCache.length} cached results for query "${query}" (page ${page})`);
    return res.json({ success: true, source: 'cache', data: paginatedCache });
  }

  let scrapedItems = [];
  let source = '';

  // Query Refinement: if query is not default feed, append keywords to improve relevance
  const refinedQuery = isDefaultFeed ? query : `${query} cap hat fashion`;

  // 1. Primary engine: DuckDuckGo scraper first
  console.log(`[Scraper Flow] Trying DuckDuckGo scraper for refined query: "${refinedQuery}", page ${page}`);
  try {
    scrapedItems = await fetchDuckDuckGoImages(refinedQuery, page);
    if (scrapedItems && scrapedItems.length > 0) {
      source = 'duckduckgo';
    }
  } catch (err) {
    console.warn('[Scraper Flow] DuckDuckGo scraper failed, will try Bing fallback:', err.message);
  }

  // 2. Primary fallback: Bing scraper if DuckDuckGo fails or returns no results
  if (!scrapedItems || scrapedItems.length === 0) {
    console.log(`[Scraper Flow] DuckDuckGo scraper returned no results. Falling back to Bing scraper for refined query: "${refinedQuery}", page ${page}`);
    try {
      scrapedItems = await fetchBingImages(refinedQuery, page);
      if (scrapedItems && scrapedItems.length > 0) {
        source = 'bing';
      }
    } catch (err) {
      console.warn('[Scraper Flow] Bing scraper failed:', err.message);
    }
  }

  // 3. Optional secondary overlay: Google Serper if key is configured
  if (SERPER_API_KEY) {
    const canScrapeSerper = checkSerperLimit();
    if (canScrapeSerper) {
      console.log(`[Scraper Flow] SERPER_API_KEY is configured. Fetching Google Images page ${page} as secondary overlay...`);
      try {
        const googleResults = await fetchGoogleImages(refinedQuery, page);
        if (googleResults && googleResults.length > 0) {
          const seenUrls = new Set(scrapedItems.map(item => item.image));
          for (const item of googleResults) {
            if (!seenUrls.has(item.image)) {
              scrapedItems.push(item);
              seenUrls.add(item.image);
            }
          }
          source = source ? `${source}+google` : 'google';
          incrementSerperUsage();
        }
      } catch (err) {
        console.warn('[Scraper Flow] Google Serper fetching failed:', err.message);
      }
    } else {
      console.log('[Scraper Flow] Google Serper usage limit reached, skipping Serper overlay.');
    }
  }

  // 4. Optional secondary overlay: Firecrawl if key is configured
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  if (FIRECRAWL_API_KEY) {
    console.log(`[Scraper Flow] FIRECRAWL_API_KEY is configured. Crawling with Firecrawl as secondary overlay...`);
    try {
      const firecrawlHats = await scrapePinterestWithFirecrawl(refinedQuery, FIRECRAWL_API_KEY);
      if (firecrawlHats && firecrawlHats.length > 0) {
        const seenUrls = new Set(scrapedItems.map(item => item.image));
        for (const item of firecrawlHats) {
          if (!seenUrls.has(item.image)) {
            scrapedItems.push(item);
            seenUrls.add(item.image);
          }
        }
        source = source ? `${source}+firecrawl` : 'firecrawl';
      }
    } catch (err) {
      console.warn('[Scraper Flow] Firecrawl overlay failed:', err.message);
    }
  }

  // 5a. Pre-filter: block blacklisted domains & garbage title keywords (fast, no LLM cost)
  const reportedImages = getReportedImages();
  const reportedUrlsSet = new Set(reportedImages.map(item => (item.image || '').toLowerCase()));
  const learnedFilters = getLearnedFilters();

  const beforePreFilter = scrapedItems.length;
  scrapedItems = preFilterItems(scrapedItems, reportedUrlsSet, learnedFilters);
  console.log(`[Pre-Filter] Removed ${beforePreFilter - scrapedItems.length} items via domain/keyword/reported blacklist. Remaining: ${scrapedItems.length}`);

  // 5b. Apply Google Gemini LLM garbage filter if items were successfully scraped
  let filteredItems = scrapedItems;
  let llmFilterSuccess = false;
  
  if (scrapedItems.length > 0) {
    const userApiKey = getGeminiApiKey(req);
    try {
      const llmResult = await filterHatsWithLLM(scrapedItems, userApiKey);
      if (llmResult && llmResult.success) {
        filteredItems = llmResult.items;
        llmFilterSuccess = true;
      } else {
        filteredItems = llmResult.items;
        llmFilterSuccess = false;
      }
    } catch (llmErr) {
      console.error('[Scraper Endpoint] LLM Filtering failed, returning unfiltered as temporary response:', llmErr.message);
      filteredItems = scrapedItems; // unfiltered
      llmFilterSuccess = false;
    }
  }

  if (filteredItems.length > 0) {
    const cat = category !== 'all' ? category : determineCategoryFromQuery(query);
    const hatsWithCat = filteredItems.map(h => ({
      ...h,
      category: cat,
      tags: [cat, ...query.split(/\s+/).filter(w => w.length > 2)]
    }));
    
    if (llmFilterSuccess) {
      saveHatsToCache(hatsWithCat, query);
    } else {
      console.log(`[Scraper Endpoint] Skipping cache save for ${filteredItems.length} unfiltered/partially filtered items.`);
    }
    
    // Blend cached/user-added matching hats into page 1 results to make them visible to other users
    let blendedData = hatsWithCat;
    if (page === 1 && matchedHats.length > 0) {
      const seen = new Set(matchedHats.map(h => h.image));
      const filteredNew = hatsWithCat.filter(h => !seen.has(h.image));
      blendedData = [...matchedHats, ...filteredNew];
    }
    
    return res.json({ 
      success: true, 
      source: source || 'fallback-cache', 
      data: blendedData,
      isUnfilteredTemporary: !llmFilterSuccess 
    });
  }

  // Fallback if search returns nothing or all items are filtered out
  const fallbackResults = matchedHats.length > 0 ? matchedHats : cachedHats.slice(0, 15);
  const paginatedFallback = fallbackResults.slice(startIndex, startIndex + itemsPerPage);
  return res.json({ 
    success: true, 
    source: 'fallback-cache', 
    data: paginatedFallback,
    info: 'No results found. Showing results from cache.' 
  });
});

// POST /api/hats/add — Thêm nón mới (Dán link) và chia sẻ cho toàn bộ user
app.post('/api/hats/add', async (req, res) => {
  const { title, image, creator, category, url, tags } = req.body || {};
  if (!image) {
    return res.status(400).json({ success: false, error: 'Thiếu liên kết hình ảnh nón' });
  }

  try {
    console.log(`[Hats API] Adding user-shared hat: "${title}"`);
    const storedImageUrl = await uploadImageToDriveOrLocal(image, 'user_hat');
    
    const newHat = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: title || 'Nón do người dùng chia sẻ',
      image: storedImageUrl,
      thumbnail: storedImageUrl,
      creator: creator || 'Người dùng chia sẻ',
      category: category || 'trendy',
      source: 'user-added',
      url: url || storedImageUrl,
      tags: Array.isArray(tags) ? tags : [category || 'trendy', 'user-added'],
      createdAt: new Date().toISOString()
    };
    
    // Save hat directly into shared cache
    saveHatsToCache([newHat], 'user-added');
    
    console.log(`[Hats API] Hat successfully saved & shared globally: ${newHat.id}`);
    res.json({ success: true, data: newHat });
  } catch (err) {
    console.error('[Hats API] Error adding custom hat:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Không thể lưu nón chia sẻ' });
  }
});

// POST /api/hats/report — Báo cáo hình ảnh không hợp lệ/rác
app.post('/api/hats/report', (req, res) => {
  const { image, title, query } = req.body || {};
  if (!image) {
    return res.status(400).json({ success: false, error: 'Thiếu liên kết hình ảnh báo cáo' });
  }

  try {
    const reports = getReportedImages();
    reports.push({
      image,
      title: title || '',
      query: query || '',
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(REPORTED_IMAGES_FILE, JSON.stringify(reports, null, 2));

    // Remove matching image URLs from cache
    const cached = getCachedHats();
    const updatedCache = cached.filter(item => (item.image || '').toLowerCase() !== image.toLowerCase());
    fs.writeFileSync(SCRAPED_HATS_FILE, JSON.stringify(updatedCache, null, 2));

    console.log(`[Report API] Image reported and removed from cache: ${image}`);

    // Trigger retraining if threshold of 10 new reports is reached
    const totalReportsCount = reports.length;
    const learnedFilters = getLearnedFilters();
    const trainedOnReportCount = learnedFilters.trainedOnReportCount || 0;
    if (totalReportsCount - trainedOnReportCount >= 10) {
      const apiKey = getGeminiApiKey(req);
      console.log(`[Report API] Retraining threshold reached (${totalReportsCount} reports vs trained on ${trainedOnReportCount}). Starting background training...`);
      runRetraining(apiKey).catch(err => {
        console.error('[Report API] Background retraining failed:', err.message);
      });
    }

    return res.json({ success: true, message: 'Image reported and removed from cache.' });
  } catch (err) {
    console.error('[Report API] Error reporting image:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Không thể báo cáo hình ảnh' });
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

// Helper to retrieve Gemini API Key with standard fallback order (Google AI Studio)
function getGeminiApiKey(req, userId = null) {
  // 1. From request body
  if (req.body && req.body.apiKey) {
    return req.body.apiKey;
  }
  
  // 2. From authenticated user
  let user = null;
  if (userId) {
    const users = readDB('users');
    user = users.find(u => u.id === userId);
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.userId) {
          const users = readDB('users');
          user = users.find(u => u.id === decoded.userId);
        }
      } catch (err) {
        // Ignore jwt error
      }
    }
  }
  
  if (user && user.apiKey) {
    return user.apiKey;
  }
  
  // 3. From environment variables
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

/**
 * Filter scraped list of hats using Google Gemini API to ensure only valid headwear/streetwear items are kept.
 * @param {Array} items Scraped hats containing titles and image URLs
 * @param {string} userApiKey Configured Gemini API key or empty for env fallback
 * @returns {Promise<Object>} Filtered array of hats and success state
 */
async function filterHatsWithLLM(items, userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    console.warn('[LLM Filter] No Gemini API key provided/found. Skipping filtering.');
    return { success: false, reason: 'no_api_key', items };
  }

  if (!items || items.length === 0) {
    return { success: true, items: [] };
  }

  if (apiKey === 'MOCK_TEST_KEY_12345') {
    console.log('[LLM Filter] Mock API Key detected. Simulating filtering.');
    const trashKeywords = [
      'logo', 'ads', 'promo', 'marketing', 'advertisement', 'sign up', 'log in', 
      'register', 'install', 'app store', 'google play', 'download', 'vector', 'icon', 
      'avatar', 'profile', 'clipart', 'badge', 'banner', 'button', 'infographic', 'advert',
      'gift card', 'coupon', 'discount', 'sale', 'price', 'buy now', 'shop online', 'store',
      'pinterest', 'follow me on', 'pinterest logo', 'pinterest icon'
    ];
    const filtered = items.slice(0, 8).filter(item => {
      const lowercaseTitle = (item.title || '').toLowerCase();
      const lowercaseUrl = (item.image || '').toLowerCase();
      const isTrash = trashKeywords.some(kw => lowercaseTitle.includes(kw) || lowercaseUrl.includes(kw));
      return !isTrash;
    });
    return { success: true, items: filtered };
  }

  try {
    const topItems = items.slice(0, 8);
    console.log(`[LLM Filter] Attempting to download top ${topItems.length} images for Gemini 1.5 Flash Vision...`);
    
    const downloadPromises = topItems.map(async (item, i) => {
      if (!item.image) return null;
      try {
        const response = await axios.get(item.image, {
          responseType: 'arraybuffer',
          timeout: 1500
        });
        const contentType = response.headers['content-type'] || 'image/jpeg';
        if (contentType.startsWith('image/')) {
          const buffer = response.data;
          if (buffer.byteLength > 800000) {
            console.warn(`[LLM Filter] Skipping oversized image at index ${i} (${(buffer.byteLength / 1024).toFixed(0)}KB > 800KB): ${item.image}`);
            return null;
          }
          const base64 = Buffer.from(buffer).toString('base64');
          return {
            index: i,
            mimeType: contentType,
            base64
          };
        }
      } catch (err) {
        console.warn(`[LLM Filter] Failed to download image for item at index ${i} (${item.image}):`, err.message);
      }
      return null;
    });

    const downloadedResults = await Promise.all(downloadPromises);
    const downloadedImages = downloadedResults.filter(Boolean);

    if (downloadedImages.length === 0) {
      console.warn('[LLM Filter] No images could be downloaded successfully.');
      return { success: true, items: [] };
    }

    const textPrompt = `ABSOLUTE SAFETY RULE: REJECT ANY image that shows nudity, semi-nudity, sexually suggestive poses, revealing clothing (underwear, lingerie, bikini tops, revealing swimwear), exposed intimate body parts, adult content, or NSFW themes. This rule takes ABSOLUTE PRIORITY over all other rules. When in doubt about content safety, ALWAYS REJECT.

You are a STRICT fashion image curator AI for a hat/cap discovery platform.
We have provided several images from the web, each labeled with "Image index <number>".

For each image, determine if it represents a REAL, WEARABLE hat, cap, beanie, bucket hat, snapback, beret, fedora, or similar headwear.
This could be a photo of a real person wearing a hat, or a photo of a real hat product for sale.

You must AGGRESSIVELY REJECT any image if it shows:
- Anime, manga, cartoon, drawings, or illustrated/painted characters (even if wearing hats)
- Fan art, digital art, paintings, sketches, or illustrations
- Logos, icons, badges, emblems, banners, graphics, or user interface screens
- Vector clipart, transparent PNGs of graphics, or app/website screenshots
- Social media profile pictures, avatars, or wallpapers
- Products that are NOT headwear (such as shoes, bags, shirts, pants, jackets, jewelry, etc.)
- Highly irrelevant photos where no headwear/hat is present

Return ONLY a JSON array of the indices (numbers) of the images that represent valid, real, wearable hats/caps to KEEP.
Do NOT wrap your response in markdown code blocks. Return the raw JSON array only.
Example response: [0, 2, 5]`;

    const parts = [{ text: textPrompt }];
    for (const img of downloadedImages) {
      parts.push({ text: `Image index ${img.index}:` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64
        }
      });
    }

    console.log(`[LLM Filter] Sending ${downloadedImages.length} images to Gemini 1.5 Flash Vision...`);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: parts
          }
        ],
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const contentText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = response.data?.candidates?.[0]?.finishReason;

    // Safety block: Gemini's own content safety triggered — reject entire batch
    if (finishReason === 'SAFETY') {
      console.warn('[LLM Filter] Gemini flagged batch for SAFETY violation. Rejecting all items in batch.');
      return { success: true, items: [] };
    }

    if (!contentText) {
      throw new Error('Empty response from Gemini API');
    }

    let jsonString = contentText.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    }

    const indices = JSON.parse(jsonString);
    if (Array.isArray(indices)) {
      console.log(`[LLM Filter] Gemini Vision kept indices:`, indices);
      const filtered = topItems.filter((_, index) => indices.includes(index));
      return { success: true, items: filtered };
    } else {
      console.warn('[LLM Filter] Gemini Vision did not return a valid array of indices:', contentText);
      return { success: false, items: topItems };
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('[LLM Filter] Gemini API call failed:', errorMsg);
    throw new Error(`LLM Garbage Filter failed: ${errorMsg}`);
  }
}

// AI Analyze Endpoint (Proxy for Gemini API)
app.post('/api/analyze', async (req, res) => {
  const { image } = req.body;
  const apiKey = getGeminiApiKey(req);

  if (!image) {
    return res.status(400).json({ success: false, error: 'No image provided' });
  }

  // If no API key is available, return 400 error
  if (!apiKey) {
    return res.status(400).json({ 
      success: false, 
      error: 'Chưa thiết lập API Key trong Settings. Vui lòng vào Cài đặt để thêm Google Gemini API Key từ Google AI Studio.' 
    });
  }

  if (apiKey === 'MOCK_TEST_KEY_12345') {
    console.log('[AI Analyze] success: true (Mock Test Key)');
    return res.json({ 
      success: true, 
      source: 'gemini_mock', 
      data: {
        style: 'Techwear Bucket Hat',
        material: 'Ripstop Nylon',
        colorPalette: ['#00f0ff', '#1a1a1a', '#7f00ff'],
        trendScore: 95,
        aestheticDescription: 'Mock analysis for testing.',
        outfitMatches: ['Mock match 1', 'Mock match 2']
      }
    });
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
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
    console.log('[AI Analyze] success: true');
    return res.json({ success: true, source: 'gemini', data: analysisResult });

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('Gemini API call failed:', errorMsg);
    return res.status(500).json({ 
      success: false, 
      error: `Lỗi kết nối Gemini API: ${errorMsg}. Vui lòng kiểm tra lại API Key hoặc cấu hình tài khoản Google AI Studio.`
    });
  }
});



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
    aiMode: 'gemini',
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
  const users = readDB('users');
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị xóa. Vui lòng đăng nhập lại.' });
  }

  const all = readDB('collections');
  const userItems = all.filter(c => c.userId === req.user.userId)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .map(c => c.item);
  res.json({ success: true, data: userItems });
});

// POST /api/collection/add — thêm 1 item
app.post('/api/collection/add', authMiddleware, (req, res) => {
  const users = readDB('users');
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị xóa. Vui lòng đăng nhập lại.' });
  }

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
  const users = readDB('users');
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị xóa. Vui lòng đăng nhập lại.' });
  }

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
    aiMode: user.aiMode || 'gemini',
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
  
  users[userIndex].aiMode = aiMode || 'gemini';
  users[userIndex].apiKey = apiKey || '';
  
  writeDB('users', users);
  console.log(`[Settings] User ${users[userIndex].username} updated AI settings.`);
  res.json({ success: true });
});

// ─── AI Design Chat Route ───────────────────────────────────────────────────

// POST /api/design-chat — Trò chuyện thiết kế nón với AI Design Agent
app.post('/api/design-chat', authMiddleware, async (req, res) => {
  const { prompt, collection, lang, referenceItem } = req.body || {};
  const users = readDB('users');
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị xóa. Vui lòng đăng nhập lại.' });
  }
  
  const apiKey = getGeminiApiKey(req, req.user.userId);
  
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

  // Format specific reference item context if present
  let referenceContext = '';
  if (referenceItem) {
    referenceContext = `Người dùng đang chọn thiết kế nón này làm gốc/mẫu tham chiếu chính:
- Tiêu đề: "${referenceItem.title || 'Nón'}"
- Nhà sáng tạo: ${referenceItem.creator || 'Streetwear'}
- Phân loại: ${referenceItem.category || 'Chung'}
- Tags: ${Array.isArray(referenceItem.tags) ? referenceItem.tags.join(', ') : ''}
Hãy tập trung brainstorm và phát triển hoặc biến tấu thiết kế dựa trên nón này.`;
  }

  // If no API key, return error
  if (!apiKey) {
    return res.status(400).json({ 
      success: false, 
      error: 'Chưa thiết lập API Key trong Settings. Vui lòng vào Cài đặt để thêm Google Gemini API Key từ Google AI Studio.' 
    });
  }

  if (apiKey === 'MOCK_TEST_KEY_12345') {
    console.log('[Design Agent] success: true');
    const mockReply = (lang === 'en')
      ? '### 🎩 Concept: CyberNeon Cap-X\n\n**Design Description:**\nMock reply for testing.\n\n```xml\n<svg viewBox="0 0 400 400" width="400" height="400">\n  <rect width="400" height="400" fill="#0f0c1b"/>\n  <circle cx="200" cy="200" r="80" fill="#00f2fe"/>\n  <text x="200" y="340" fill="#ffffff" text-anchor="middle">CyberNeon Cap-X</text>\n</svg>\n```'
      : '### 🎩 Concept: CyberNeon Cap-X\n\n**Mô tả thiết kế:**\nCâu trả lời giả lập để kiểm thử.\n\n```xml\n<svg viewBox="0 0 400 400" width="400" height="400">\n  <rect width="400" height="400" fill="#0f0c1b"/>\n  <circle cx="200" cy="200" r="80" fill="#00f2fe"/>\n  <text x="200" y="340" fill="#ffffff" text-anchor="middle">CyberNeon Cap-X</text>\n</svg>\n```';
    return res.json({ 
      success: true, 
      reply: mockReply
    });
  }

  const outputLanguage = (lang === 'en') ? 'English' : 'Vietnamese';
  const languageInstruction = (lang === 'en') 
    ? `You must write the entire response in English (except any specialized fashion terms). Use professional, creative, and enthusiastic tone.`
    : `Bạn phải viết toàn bộ câu trả lời bằng tiếng Việt (trừ prompt sinh ảnh AI viết bằng tiếng Anh). Sử dụng giọng văn chuyên nghiệp, sáng tạo và đầy nhiệt huyết.`;

  const formatInstruction = (lang === 'en')
    ? `Provide your response in a beautifully structured markdown format:

### 🎩 Concept: [Concept Name]

**Design Description:**
[Detailed visual, structural, and aesthetic description of the hat design]

**Logo Description:**
[Detailed description of the logo designed for the hat]

**Proposed Materials:**
- [Material 1]
- [Material 2]

**Color Palette:**
- Hex 1: #[HexCode]
- Hex 2: #[HexCode]
- Hex 3: #[HexCode]

**Outfit Suggestions:**
[Stylist suggestions on how to wear this hat]

**AI Image Generation Prompt (Midjourney/DALL-E):**
\`\`\`
[Detailed English prompt for image generation]
\`\`\`

**SVG Logo Code:**
At the very end of your response, write a clean XML/SVG code block representing the logo designed for this hat, wrapped in a \`\`\`xml or \`\`\`svg code block. The SVG must:
- Have a viewBox of "0 0 400 400"
- Have a dark gradient background (using <rect> and <linearGradient>)
- Represent ONLY the graphic logo/emblem design (badge, shield, futuristic symbol, abstract icon, or stylized letters) labeled with the Concept Name using a <text> element.
- **CRITICAL NEGATIVE CONSTRAINT: DO NOT DRAW ANY HAT OUTLINE, CAP CROWN, VISOR, BRIM, BEANIE OUTLINE, BUCKET HAT STRUCTURE, HELMET, OR CLOTHING/APPAREL ELEMENTS. THE SVG MUST CONTAIN ONLY THE VECTOR ARTWORK OF THE GRAPHIC LOGO/EMBLEM DESIGN AND ABSOLUTELY NO APPAREL STRUCTURES.**
- Use <path>, <rect>, <circle>, <text>, <linearGradient>, etc. to create a detailed, modern, glowing cyberpunk emblem/logo.
- Be self-contained, valid XML/SVG code with no external dependencies`
    : `Cung cấp phản hồi của bạn dưới dạng cấu trúc markdown đẹp mắt như sau:

### 🎩 Concept: [Concept Name]

**Mô tả thiết kế:**
[Mô tả chi tiết về kiểu dáng, cấu trúc và thẩm mỹ của nón bằng tiếng Việt]

**Mô tả logo:**
[Mô tả chi tiết về logo được thiết kế riêng cho nón bằng tiếng Việt]

**Chất liệu đề xuất:**
- [Material 1]
- [Material 2]

**Bảng màu chủ đạo:**
- Hex 1: #[HexCode]
- Hex 2: #[HexCode]
- Hex 3: #[HexCode]

**Gợi ý phối đồ:**
[Gợi ý phối trang phục từ stylist bằng tiếng Việt]

**Prompt sinh ảnh AI (Midjourney/DALL-E):**
\`\`\`
[Detailed English prompt for image generation]
\`\`\`

**Mã nguồn SVG Logo:**
Ở cuối câu trả lời của bạn, hãy viết một khối mã XML/SVG sạch vẽ logo của nón này, bọc trong khối code \`\`\`xml hoặc \`\`\`svg. SVG phải:
- Có viewBox="0 0 400 400"
- Có hình nền tối với dải màu gradient (sử dụng <rect> và <linearGradient>)
- CHỈ biểu diễn thiết kế logo/biểu tượng đồ họa (huy hiệu, lá chắn/khiên bảo vệ, biểu tượng tương lai, icon trừu tượng, hoặc các chữ cái cách điệu) được dán nhãn tên Concept bằng cách sử dụng thẻ <text>.
- **RÀNG BUỘC TIÊU CỰC QUAN TRỌNG: KHÔNG ĐƯỢC VẼ BẤT KỲ ĐƯỜNG VIỀN MŨ/NÓN NÀO, CHÓP MŨ, LƯỠI TRAI, VÀNH MŨ, ĐƯỜNG VIỀN MŨ LEN (BEANIE), CẤU TRÚC MŨ TAI BÈO (BUCKET), MŨ BẢO HIỂM, HOẶC CÁC YẾU TỐ QUẦN ÁO/TRANG PHỤC KHÁC. KHỐI MÃ SVG CHỈ ĐƯỢC CHỨA DUY NHẤT HÌNH VẼ VECTOR CỦA LOGO/BIỂU TƯỢNG ĐỒ HỌA VÀ TUYỆT ĐỐI KHÔNG CÓ CẤU TRÚC TRANG PHỤC NÀO.**
- Sử dụng các thẻ <path>, <rect>, <circle>, <text>, <linearGradient>, v.v. để tạo thiết kế logo/biểu tượng hiện đại, phát sáng neon chi tiết.
- Là code XML/SVG hợp lệ, tự chạy, không phụ thuộc tài nguyên ngoài`;

  try {
    console.log(`[Design Agent] Calling Gemini API for user: ${req.user.username}`);
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a professional fashion design AI specializing in headwear. You are acting as "Hat Design Agent", an interactive designer.
                The user has a collection of liked hats:
                ${collectionContext}
                
                ${referenceContext}

                The user's design idea or prompt is: "${prompt}".
                
                Help the user brainstorm and design a new hat concept based on their collection (as inspiration for their tastes), their specific referenced hat if any, and their design idea.
                
                CRITICAL RULE: The SVG block at the end of the response must strictly contain only the logo vector artwork (e.g. badge, shield, futuristic symbol, abstract icon, or stylized letters) labeled with the Concept Name using a <text> element, and absolutely no apparel structures (such as hat outlines, cap crowns, visors, brims, beanie outlines, bucket hat structures, helmets, or clothing elements).
                
                ${languageInstruction}
                
                ${formatInstruction}`
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

    console.log('[Design Agent] success: true');
    res.json({ success: true, reply: contentText });

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('[Design Agent] Gemini API call failed:', errorMsg);
    res.status(500).json({ 
      success: false, 
      error: `Lỗi kết nối Gemini API: ${errorMsg}`
    });
  }
});

// GET /api/admin/reports/stats — Lấy thông tin thống kê báo cáo và bộ lọc đã học
app.get('/api/admin/reports/stats', (req, res) => {
  try {
    const reports = getReportedImages();
    const domainCounts = {};
    const keywordCounts = {};
    
    reports.forEach(r => {
      if (r.image) {
        try {
          const u = new URL(r.image);
          const domain = u.hostname.replace('www.', '');
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch (e) {
          // ignore invalid URLs
        }
      }
      
      if (r.title) {
        const words = r.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2);
        words.forEach(w => {
          keywordCounts[w] = (keywordCounts[w] || 0) + 1;
        });
      }
    });

    const learnedFilters = getLearnedFilters();
    const lastTrainTime = learnedFilters.lastTrainedAt;
    const trainedOnReportCount = learnedFilters.trainedOnReportCount || 0;
    const sinceLastTrain = reports.length - trainedOnReportCount;

    return res.json({
      success: true,
      totalReports: reports.length,
      sinceLastTrain: sinceLastTrain >= 0 ? sinceLastTrain : reports.length,
      topDomains: domainCounts,
      topKeywords: keywordCounts,
      lastTrainTime: lastTrainTime,
      currentFilters: learnedFilters
    });
  } catch (err) {
    console.error('[Admin Stats API] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/retrain — Chạy huấn luyện bộ lọc thích ứng thủ công
app.post('/api/admin/retrain', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid admin secret' });
  }

  try {
    const apiKey = getGeminiApiKey(req);
    await runRetraining(apiKey);
    const currentFilters = getLearnedFilters();
    return res.json({
      success: true,
      message: 'Retrained successfully',
      learnedFilters: currentFilters
    });
  } catch (err) {
    console.error('[Admin Retrain API] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

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
