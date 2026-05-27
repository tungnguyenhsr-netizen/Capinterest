import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { preFilterItems } from '../scrapers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '../data/scraped_hats.json');

if (!fs.existsSync(CACHE_FILE)) {
  console.log('Cache file does not exist.');
  process.exit(0);
}

try {
  const rawData = fs.readFileSync(CACHE_FILE, 'utf8');
  const data = JSON.parse(rawData);
  console.log(`Original cache size: ${data.length}`);
  
  // Apply preFilterItems logic
  const filtered = preFilterItems(data);
  console.log(`Cleaned cache size: ${filtered.length}`);
  
  fs.writeFileSync(CACHE_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  console.log('Successfully saved cleaned cache back to data/scraped_hats.json.');
} catch (error) {
  console.error('Error purging cache:', error);
}
