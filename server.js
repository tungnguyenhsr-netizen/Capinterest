import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Scrape DuckDuckGo Images
async function scrapeDuckDuckGoImages(query) {
  // Refine query to focus on hats/caps/headwear
  const refinedQuery = `${query} cap hat headwear`;
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(refinedQuery)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  const response = await axios.get(url, { headers });
  const html = response.data;
  
  // Extract VQD token using regex
  const vqdRegex = /vqd=['"]?([^'"]+)['"]?/;
  const match = html.match(vqdRegex);
  if (!match) {
    throw new Error('VQD token not found in DuckDuckGo HTML');
  }
  const vqd = match[1];

  const imageUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(refinedQuery)}&vqd=${vqd}&f=,,,&p=1`;
  const imageResponse = await axios.get(imageUrl, { headers });
  
  if (!imageResponse.data || !imageResponse.data.results) {
    throw new Error('No image results from DuckDuckGo');
  }

  return imageResponse.data.results.map(img => ({
    title: img.title || 'Trendy Headwear',
    image: img.image,
    thumbnail: img.thumbnail,
    source: img.source || 'web',
    url: img.url || img.image,
    width: img.width,
    height: img.height,
    creator: new URL(img.url || 'https://web').hostname.replace('www.', '')
  }));
}

// Fallback: Fetch Unsplash Images (Public endpoint, no auth required)
async function fetchUnsplashImages(query) {
  const refinedQuery = `${query} cap hat`;
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(refinedQuery)}&per_page=30`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const response = await axios.get(url, { headers });
  if (!response.data || !response.data.results) {
    throw new Error('Failed to fetch images from Unsplash NAPI');
  }

  return response.data.results.map(photo => ({
    title: photo.alt_description || photo.description || 'Trendy Headwear',
    image: photo.urls.regular,
    thumbnail: photo.urls.small,
    source: 'Unsplash',
    url: photo.links.html,
    width: photo.width,
    height: photo.height,
    creator: photo.user.name || photo.user.username
  }));
}

// Search Endpoint
app.get('/api/scrape', async (req, res) => {
  const query = req.query.query || 'trendy caps';
  console.log(`Scraping request for query: "${query}"`);
  
  try {
    // Try DuckDuckGo first
    try {
      const results = await scrapeDuckDuckGoImages(query);
      if (results && results.length > 0) {
        console.log(`Successfully scraped ${results.length} images from DuckDuckGo.`);
        return res.json({ success: true, source: 'duckduckgo', data: results });
      }
    } catch (ddgError) {
      console.warn('DuckDuckGo scraping failed, falling back to Unsplash:', ddgError.message);
    }

    // Fallback to Unsplash NAPI
    const results = await fetchUnsplashImages(query);
    console.log(`Successfully fetched ${results.length} images from Unsplash.`);
    return res.json({ success: true, source: 'unsplash', data: results });
  } catch (error) {
    console.error('All search options failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// AI Analyze Endpoint (Proxy for Gemini API)
app.post('/api/analyze', async (req, res) => {
  const { image, apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

  if (!image) {
    return res.status(400).json({ success: false, error: 'No image provided' });
  }

  // If no API key is available, return detailed mockup response
  if (!apiKey) {
    console.log('No Gemini API key provided. Returning high-fidelity mock AI analysis.');
    return simulateAiAnalysis(res);
  }

  try {
    // Clean base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

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

// Start Server
app.listen(PORT, () => {
  console.log(`CapInterest server running at http://localhost:${PORT}`);
});
