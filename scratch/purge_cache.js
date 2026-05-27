import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { preFilterItems } from '../scrapers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '../data/scraped_hats.json');

// ─── NSFW / Adult content blocklists (mirrored from scrapers.js) ────────────
const NSFW_BLOCKED_DOMAINS = [
  'onlyfans.com', 'pornhub.com', 'xvideos.com', 'xhamster.com',
  'redtube.com', 'youporn.com', 'brazzers.com', 'playboy.com',
  'hustler.com', 'penthouse.com', 'spankbang.com', 'xnxx.com',
  'erome.com', 'fapello.com', 'scrolller.com',
  // Previously present adult-adjacent
  'e-hentai.org', 'nhentai.net', 'rule34.xxx',
  'sankakucomplex.com', 'chan.sankakucomplex.com',
  'gelbooru.com', 'konachan.com', 'yande.re', 'tbib.org',
];

const NSFW_BLOCKED_KEYWORDS = [
  'nsfw', '18+', 'adult', 'sexy', 'nude', 'naked',
  'porn', 'pornography', 'erotic', 'erotica',
  'underwear', 'lingerie', 'bikini top', 'topless',
  'cleavage', 'nipple', 'xxx', 'playboy', 'boudoir',
  'fetish', 'sensual', 'lewd', 'hentai', 'explicit',
  'suggestive', 'uncensored', 'onlyfans', 'camgirl', 'escort',
];

/**
 * Returns true if the item should be REMOVED (blocked by NSFW rules).
 */
function isNsfwItem(item) {
  const imageUrl = (item.image || item.url || '').toLowerCase();
  const sourceUrl = (item.url || '').toLowerCase();
  const title = (item.title || '').toLowerCase();

  const blockedDomain = NSFW_BLOCKED_DOMAINS.some(
    d => imageUrl.includes(d) || sourceUrl.includes(d)
  );
  if (blockedDomain) return true;

  const blockedKeyword = NSFW_BLOCKED_KEYWORDS.some(kw => title.includes(kw));
  if (blockedKeyword) return true;

  return false;
}

// ─── Main purge logic ────────────────────────────────────────────────────────

if (!fs.existsSync(CACHE_FILE)) {
  console.log('Cache file does not exist. Nothing to purge.');
  process.exit(0);
}

try {
  const rawData = fs.readFileSync(CACHE_FILE, 'utf8');
  const data = JSON.parse(rawData);
  console.log(`Original cache size: ${data.length}`);

  // Step 1: Dedicated NSFW purge (runs first, before general pre-filter)
  const afterNsfw = data.filter(item => {
    if (isNsfwItem(item)) {
      console.log(`[NSFW Purge] Removing NSFW item: "${item.title}" | ${item.image || item.url}`);
      return false;
    }
    return true;
  });
  const nsfwRemoved = data.length - afterNsfw.length;
  console.log(`[NSFW Purge] Removed ${nsfwRemoved} NSFW/adult items.`);

  // Step 2: Apply full general preFilterItems logic (domains, keywords, URL patterns)
  const filtered = preFilterItems(afterNsfw);
  const generalRemoved = afterNsfw.length - filtered.length;
  console.log(`[General Filter] Removed ${generalRemoved} additional garbage items.`);

  console.log(`Cleaned cache size: ${filtered.length} (removed ${data.length - filtered.length} total)`);

  fs.writeFileSync(CACHE_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  console.log('Successfully saved cleaned cache back to data/scraped_hats.json.');
} catch (error) {
  console.error('Error purging cache:', error);
  process.exit(1);
}
