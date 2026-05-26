import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Domains to blacklist — images sourced from these will be discarded before LLM filtering.
 * Covers anime/fanart platforms, social feeds, icon/vector sites, and unrelated content hubs.
 */
const BLOCKED_DOMAINS = [
  // Anime / fanart / illustration platforms
  'pixiv.net', 'i.pximg.net', 'pximg.net',
  'deviantart.com', 'wikiart.org', 'artstation.com',
  'zerochan.net', 'danbooru.donmai.us', 'gelbooru.com',
  'konachan.com', 'yande.re', 'safebooru.org',
  'mangadex.org', 'myanimelist.net', 'anilist.co',
  // Icon / vector / clipart
  'flaticon.com', 'iconfinder.com', 'icons8.com',
  'svgrepo.com', 'iconscout.com', 'vecteezy.com',
  'freepik.com', 'shutterstock.com', 'dreamstime.com',
  'vectorstock.com', 'clipartmax.com', 'openclipart.org',
  // Social / non-shopping
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'tiktok.com', 'reddit.com', 'tumblr.com',
  // Other non-relevant
  'wikimedia.org', 'wikipedia.org', 'w.wiki',
];

/**
 * Title keywords that almost always indicate garbage/non-fashion content.
 */
const BLOCKED_TITLE_KEYWORDS = [
  'anime', 'manga', 'cosplay', 'fanart', 'fan art', 'illustration',
  'character', 'chibi', 'waifu', 'pfp', 'avatar', 'wallpaper',
  'clipart', 'vector', 'svg', 'icon set', 'logo pack',
  'download free', 'free png', 'transparent png',
];

/**
 * Quick pre-filter: remove items from blacklisted domains or with garbage title keywords.
 * This runs BEFORE the LLM to cut costs and improve accuracy.
 */
export function preFilterItems(items) {
  return items.filter(item => {
    const imageUrl = (item.image || item.url || '').toLowerCase();
    const sourceUrl = (item.url || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    // Block by domain
    const isBlockedDomain = BLOCKED_DOMAINS.some(domain =>
      imageUrl.includes(domain) || sourceUrl.includes(domain)
    );
    if (isBlockedDomain) return false;

    // Block by title keyword
    const isBlockedTitle = BLOCKED_TITLE_KEYWORDS.some(kw => title.includes(kw));
    if (isBlockedTitle) return false;

    return true;
  });
}

/**
 * Fetch image search JSON internally from DuckDuckGo using search token VQD, returning array of hats.
 * @param {string} query Search query
 * @param {number} page Page number (1-based)
 * @returns {Promise<Array>} Array of parsed image objects
 */
export async function fetchDuckDuckGoImages(query, page = 1) {
  const mainUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  
  try {
    console.log(`[DuckDuckGo Scraper] Fetching main page for VQD: ${mainUrl}`);
    const response = await axios.get(mainUrl, { headers: HEADERS, timeout: 5000 });
    const html = response.data;
    
    // Find VQD token
    const vqdRegex = /vqd=['"]?([^'"]+)['"]?/;
    const match = html.match(vqdRegex);
    if (!match) {
      console.warn('[DuckDuckGo Scraper] Failed to extract VQD token from HTML');
      return [];
    }
    
    const vqd = match[1];
    console.log('[DuckDuckGo Scraper] Extracted VQD token:', vqd);
    
    const s = (page - 1) * 100;
    const imageUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=${page === 1 ? 1 : -1}&s=${s}`;
    
    const imageHeaders = {
      ...HEADERS,
      'Referer': 'https://duckduckgo.com/',
      'Accept': 'application/json, text/javascript, */*; q=0.01'
    };
    
    console.log(`[DuckDuckGo Scraper] Fetching JSON images from: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, { headers: imageHeaders, timeout: 6000 });
    
    if (imageResponse.data && imageResponse.data.results) {
      console.log(`[DuckDuckGo Scraper] Successfully fetched ${imageResponse.data.results.length} images for query "${query}" (page ${page})`);
      return imageResponse.data.results.map((img, index) => {
        let creator = 'DuckDuckGo';
        if (img.url) {
          try {
            creator = new URL(img.url).hostname.replace('www.', '');
          } catch (e) {}
        }
        return {
          id: img.image || `ddg_${page}_${index}_${Date.now()}`,
          title: img.title || 'DuckDuckGo Image',
          image: img.image,
          thumbnail: img.thumbnail || img.image,
          source: 'duckduckgo',
          url: img.url || img.image,
          creator: img.source || creator
        };
      });
    } else {
      console.warn('[DuckDuckGo Scraper] No results found in DuckDuckGo image JSON response');
      return [];
    }
  } catch (err) {
    console.error('[DuckDuckGo Scraper] Error fetching images:', err.message);
    return [];
  }
}

/**
 * Parse HTML search results from Bing, extracting title, source, purl, and direct image links (murl).
 * @param {string} query Search query
 * @param {number} page Page number (1-based)
 * @returns {Promise<Array>} Array of parsed image objects
 */
export async function fetchBingImages(query, page = 1) {
  const firstOffset = (page - 1) * 30 + 1;
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${firstOffset}`;
  
  const bingHeaders = {
    ...HEADERS,
    'Referer': 'https://www.bing.com/'
  };
  
  try {
    console.log(`[Bing Scraper] Fetching Bing images page ${page} from: ${url}`);
    const response = await axios.get(url, { headers: bingHeaders, timeout: 5000 });
    const html = response.data;
    
    const results = [];
    const regex = /class="iusc"[^>]+?m="([^"]+)"/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      try {
        const parsed = JSON.parse(decoded);
        if (parsed.murl) {
          let creator = 'Bing';
          if (parsed.purl) {
            try {
              creator = new URL(parsed.purl).hostname.replace('www.', '');
            } catch (e) {}
          }
          results.push({
            id: parsed.murl,
            title: parsed.t || 'Bing Image',
            image: parsed.murl,
            thumbnail: parsed.turl || parsed.murl,
            source: 'bing',
            url: parsed.purl || parsed.murl,
            creator: creator
          });
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    }
    
    console.log(`[Bing Scraper] Extracted ${results.length} images from Bing for query "${query}" (page ${page})`);
    return results;
  } catch (err) {
    console.error('[Bing Scraper] Error fetching Bing images:', err.message);
    return [];
  }
}
