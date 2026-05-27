import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Domains to blacklist — images sourced from these will be discarded before LLM filtering.
 * Covers anime/fanart, social feeds, icon/vector, stock photo, meme, and unrelated content sites.
 */
const BLOCKED_DOMAINS = [
  // Anime / fanart / illustration / manga platforms
  'pixiv.net', 'i.pximg.net', 'pximg.net',
  'deviantart.com', 'wikiart.org', 'artstation.com',
  'zerochan.net', 'danbooru.donmai.us', 'gelbooru.com',
  'konachan.com', 'yande.re', 'safebooru.org', 'rule34.xxx',
  'mangadex.org', 'myanimelist.net', 'anilist.co',
  'sankakucomplex.com', 'e-hentai.org', 'nhentai.net',
  'anime-pictures.net', 'wall.alphacoders.com', 'wallhaven.cc',
  'minitokyo.net', 'animegalleries.net', 'crunchyroll.com',
  'tbib.org', 'chan.sankakucomplex.com',
  // Icon / vector / clipart / stock
  'flaticon.com', 'iconfinder.com', 'icons8.com',
  'svgrepo.com', 'iconscout.com', 'vecteezy.com',
  'freepik.com', 'shutterstock.com', 'dreamstime.com',
  'vectorstock.com', 'clipartmax.com', 'openclipart.org',
  'istockphoto.com', 'gettyimages.com', '123rf.com',
  'depositphotos.com', 'canstockphoto.com', 'bigstockphoto.com',
  'pngtree.com', 'pngkey.com', 'pngwing.com', 'cleanpng.com',
  'kindpng.com', 'imgbin.com', 'stickpng.com', 'pngitem.com',
  'pikpng.com', 'pngfind.com', 'nicepng.com', 'dlpng.com',
  'hiclipart.com', 'clipground.com', 'clipartof.com',
  // Social media / non-shopping
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'tiktok.com', 'reddit.com', 'tumblr.com', 'threads.net',
  'mastodon.social', 'bsky.app', 'linkedin.com',
  'youtube.com', 'youtu.be', 'twitch.tv', 'discord.com',
  // Meme / humor / unrelated
  'imgflip.com', 'knowyourmeme.com', 'memedroid.com',
  'ifunny.co', '9gag.com', 'cheezburger.com',
  // Wiki / reference / non-fashion
  'wikimedia.org', 'wikipedia.org', 'w.wiki',
  'wikihow.com', 'quora.com', 'answers.com',
  // Gaming / entertainment
  'steampowered.com', 'store.steampowered.com', 'steamcdn-a.akamaihd.net',
  'epicgames.com', 'roblox.com', 'minecraft.net',
  // App stores / software
  'play.google.com', 'apps.apple.com', 'microsoft.com',
  'softonic.com', 'cnet.com',
  // Adult / NSFW platforms — ABSOLUTE BLOCK
  'onlyfans.com', 'pornhub.com', 'xvideos.com', 'xhamster.com',
  'redtube.com', 'youporn.com', 'brazzers.com', 'playboy.com',
  'hustler.com', 'penthouse.com', 'spankbang.com', 'xnxx.com',
  'erome.com', 'fapello.com', 'scrolller.com',
];

/**
 * Title keywords that almost always indicate garbage/non-fashion content.
 * Case-insensitive matching applied in preFilterItems.
 */
const BLOCKED_TITLE_KEYWORDS = [
  // Anime / manga / cartoon
  'anime', 'manga', 'cosplay', 'fanart', 'fan art', 'hentai',
  'chibi', 'waifu', 'otaku', 'kawaii', 'naruto', 'one piece',
  'dragon ball', 'pokemon', 'sailor moon', 'attack on titan',
  'jojo', 'demon slayer', 'genshin', 'vtuber', 'gacha',
  'webtoon', 'manhwa', 'manhua', 'light novel',
  // Illustration / digital art
  'illustration', 'digital art', 'concept art', 'fantasy art',
  'character design', 'character sheet', 'oc drawing',
  'commission open', 'art print', 'speedpaint',
  // Clipart / vector / icon
  'clipart', 'clip art', 'vector', 'svg icon', 'icon set', 'logo pack',
  'icon pack', 'emoji', 'sticker pack', 'flat icon',
  // Download / freebie spam
  'download free', 'free download', 'free png', 'transparent png',
  'png image', 'png clipart', 'stock photo', 'royalty free',
  'free vector', 'free image',
  // Social / profile / avatar
  'pfp', 'avatar', 'profile picture', 'profile pic', 'discord pfp',
  // Wallpaper / screensaver
  'wallpaper', 'desktop wallpaper', 'phone wallpaper', '4k wallpaper',
  'background image', 'screensaver',
  // Meme / humor
  'meme', 'funny', 'lol', 'lmao', 'cursed image', 'shitpost',
  // Gaming
  'gameplay', 'game screenshot', 'fortnite', 'roblox', 'minecraft',
  // Explicit non-fashion
  'tattoo design', 'tattoo idea', 'coloring page', 'drawing tutorial',
  'how to draw', 'step by step',
  // NSFW / Adult content — ABSOLUTE BLOCK
  'nsfw', '18+', 'adult', 'sexy', 'nude', 'naked',
  'porn', 'pornography', 'erotic', 'erotica',
  'underwear', 'lingerie', 'bikini top', 'topless',
  'cleavage', 'nipple', 'xxx', 'playboy', 'boudoir',
  'fetish', 'sensual', 'lewd', 'explicit', 'suggestive',
  'uncensored', 'onlyfans', 'camgirl', 'escort',
];

/**
 * URL path patterns that indicate garbage images (regardless of domain).
 */
const BLOCKED_URL_PATTERNS = [
  /\/avatar[s]?\//i,
  /\/emoji[s]?\//i,
  /\/sticker[s]?\//i,
  /\/icon[s]?\//i,
  /\/badge[s]?\//i,
  /\/banner[s]?\//i,
  /\/logo[s]?\//i,
  /\/meme[s]?\//i,
  /\/gif[s]?\//i,
  /\.gif$/i,
  /\.svg$/i,
  /\/thumbnail[s]?\//i,
  /\/placeholder[s]?\//i,
  /\/profile[_-]?(pic|img|photo|image)/i,
  /\/default[_-]?(avatar|user|img)/i,
  /pixel[_.]?(art|sprite)/i,
];

/**
 * Quick pre-filter: remove items from blacklisted domains, garbage title keywords,
 * and suspicious URL patterns. This runs BEFORE the LLM to cut costs and improve accuracy.
 */
export function preFilterItems(items, reportedUrls = new Set()) {
  const before = items.length;
  const filtered = items.filter(item => {
    const imageUrl = (item.image || item.url || '').toLowerCase();
    const sourceUrl = (item.url || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    // Block reported URLs
    if (reportedUrls.has(imageUrl) || reportedUrls.has(sourceUrl)) {
      return false;
    }

    // 1. Block by domain
    const isBlockedDomain = BLOCKED_DOMAINS.some(domain =>
      imageUrl.includes(domain) || sourceUrl.includes(domain)
    );
    if (isBlockedDomain) return false;

    // 2. Block by title keyword
    const isBlockedTitle = BLOCKED_TITLE_KEYWORDS.some(kw => title.includes(kw));
    if (isBlockedTitle) return false;

    // 3. Block by URL path pattern
    const isBlockedUrl = BLOCKED_URL_PATTERNS.some(pattern =>
      pattern.test(imageUrl) || pattern.test(sourceUrl)
    );
    if (isBlockedUrl) return false;

    // 4. Block images that are too small (likely icons/thumbnails) based on URL hints
    const tinyImagePattern = /[_\-x](16|24|32|48|50|64|72|75|80|96|100|120|128)[\._\-x]/i;
    if (tinyImagePattern.test(imageUrl)) return false;

    return true;
  });

  if (before !== filtered.length) {
    console.log(`[Pre-Filter] Blocked ${before - filtered.length}/${before} garbage items (domains/keywords/URL patterns)`);
  }
  return filtered;
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
