import axios from 'axios';

/**
 * Scrapes Pinterest Search via Firecrawl structured extraction
 * @param {string} query The search query
 * @param {string} apiKey Firecrawl API Key
 * @returns {Promise<Array>} List of extracted hat objects
 */
export async function scrapePinterestWithFirecrawl(query, apiKey) {
  if (!apiKey) {
    throw new Error('Firecrawl API Key is required');
  }

  const searchUrl = 'https://api.firecrawl.dev/v1/search';
  const searchQuery = `${query} hats caps (site:unsplash.com OR site:pexels.com OR site:flickr.com)`;
  console.log(`[Firecrawl Helper] Performing web search for query: "${searchQuery}"`);

  let urls = [];
  try {
    const searchResponse = await axios.post(
      searchUrl,
      {
        query: searchQuery,
        limit: 2
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 15000
      }
    );

    if (searchResponse.data && searchResponse.data.success && Array.isArray(searchResponse.data.data)) {
      urls = searchResponse.data.data.map(item => item.url).filter(Boolean);
    } else {
      console.warn(`[Firecrawl Search] No results or success is false: ${JSON.stringify(searchResponse.data)}`);
    }
  } catch (error) {
    const errorDetail = error.response?.data?.error || error.message;
    console.error(`[Firecrawl Search] Search request failed for "${searchQuery}":`, errorDetail);
  }

  if (urls.length === 0) {
    const fallbackQuery = `${query} (site:unsplash.com OR site:pexels.com OR site:flickr.com)`;
    console.log(`[Firecrawl Helper] Trying fallback search with query: "${fallbackQuery}"`);
    try {
      const fallbackResponse = await axios.post(
        searchUrl,
        {
          query: fallbackQuery,
          limit: 2
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 15000
        }
      );
      if (fallbackResponse.data && fallbackResponse.data.success && Array.isArray(fallbackResponse.data.data)) {
        urls = fallbackResponse.data.data.map(item => item.url).filter(Boolean);
      }
    } catch (error) {
      console.error(`[Firecrawl Search] Fallback search request failed:`, error.response?.data?.error || error.message);
    }
  }

  if (urls.length === 0) {
    console.warn(`[Firecrawl Helper] No URLs found from search API.`);
    return [];
  }

  console.log(`[Firecrawl Helper] Found URLs to scrape:`, urls);

  // For each URL, call Firecrawl's scrape API
  const scrapePromises = urls.map(async (url) => {
    console.log(`[Firecrawl Helper] Scraping URL: ${url}`);
    
    const payload = {
      url: url,
      formats: ['json'],
      jsonOptions: {
        schema: {
          type: 'object',
          properties: {
            hats: {
              type: 'array',
              description: 'List of hats, caps, or fashion-related items found on the page',
              items: {
                type: 'object',
                properties: {
                  title: { 
                    type: 'string', 
                    description: 'The title or name of the hat/cap/item' 
                  },
                  image: { 
                    type: 'string', 
                    description: 'The direct link/URL of the product or item image' 
                  },
                  url: { 
                    type: 'string', 
                    description: 'The product page URL' 
                  },
                  creator: { 
                    type: 'string', 
                    description: 'The store name, brand, or creator of the hat' 
                  }
                },
                required: ['title', 'image', 'url', 'creator']
              }
            }
          },
          required: ['hats']
        }
      }
    };

    try {
      const response = await axios.post('https://api.firecrawl.dev/v1/scrape', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      });

      if (response.data && response.data.success) {
        const extractedJson = response.data.data?.json;
        if (extractedJson && Array.isArray(extractedJson.hats)) {
          return extractedJson.hats;
        }
      }
      console.warn(`[Firecrawl Scrape] Failed or returned invalid structure for ${url}:`, JSON.stringify(response.data));
      return [];
    } catch (error) {
      console.error(`[Firecrawl Scrape] Scraping failed for ${url}:`, error.response?.data?.error || error.message);
      return [];
    }
  });

  const scrapeResults = await Promise.all(scrapePromises);
  
  // Merge all extracted hats, filter out any duplicates or items missing images
  const seenImages = new Set();
  const mergedHats = [];

  for (const hatsList of scrapeResults) {
    if (!hatsList) continue;
    for (const hat of hatsList) {
      if (!hat.image || !hat.title) continue;
      
      const titleLower = hat.title.toLowerCase();
      const creatorLower = (hat.creator || '').toLowerCase();
      // Ensure it is related to hats/caps/fashion to filter out unrelated page elements
      const isFashionOrHat = 
        titleLower.includes('hat') || 
        titleLower.includes('cap') || 
        titleLower.includes('snapback') || 
        titleLower.includes('bucket') || 
        titleLower.includes('beanie') || 
        titleLower.includes('visor') || 
        titleLower.includes('fashion') || 
        titleLower.includes('streetwear') ||
        titleLower.includes('clothing') ||
        titleLower.includes('apparel') ||
        titleLower.includes('headwear') ||
        creatorLower.includes('store') ||
        creatorLower.includes('brand') ||
        creatorLower.includes('fashion');

      if (!isFashionOrHat) {
        console.log(`[Firecrawl Helper] Filtering out non-fashion item: "${hat.title}"`);
        continue;
      }

      if (!seenImages.has(hat.image)) {
        seenImages.add(hat.image);
        mergedHats.push({
          title: hat.title.trim(),
          image: hat.image.trim(),
          url: hat.url ? hat.url.trim() : '',
          creator: hat.creator ? hat.creator.trim() : 'Fashion Store'
        });
      }
    }
  }

  console.log(`[Firecrawl Helper] Completed. Extracted and filtered down to ${mergedHats.length} hats.`);
  return mergedHats;
}

