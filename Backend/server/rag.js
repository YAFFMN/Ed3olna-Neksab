// Backend/server/rag.js
import fs from 'fs';
import path from 'path';

let knowledgeChunks = [];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'you', 'can', 'how', 'what', 'why', 'who',
  'with', 'this', 'that', 'from', 'have', 'has', 'had', 'should', 'could',
  'would', 'does', 'did', 'is', 'was', 'were', 'been', 'being', 'about'
]);

export function initKnowledgeBase(folderPath = './knowledge') {
  knowledgeChunks = [];
  if (!fs.existsSync(folderPath)) {
    console.warn('RAG folder not found:', folderPath);
    return;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(folderPath, file), 'utf8');
    const sections = raw.split(/\n(?=##\s)/g).map(s => s.trim()).filter(Boolean);
    for (const section of sections) {
      const firstLine = section.split('\n')[0].replace(/^##\s*/, '').trim();
      knowledgeChunks.push({
        source: firstLine || file,
        text: section
      });
    }
  }
  console.log(`RAG Knowledge Base loaded: ${knowledgeChunks.length} verified NASA/CSA sections.`);
}

// minScore = 0 keeps the original behaviour (always return topK sections);
// the Nova companion passes 1 so unrelated questions do not get unrelated sections.
export function searchKnowledge(query, topK = 3, minScore = 0) {
  if (!query || typeof query !== 'string' || knowledgeChunks.length === 0) return '';

  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const searchWords = words.length > 0
    ? words
    : query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = knowledgeChunks.map(chunk => {
    const lower = chunk.text.toLowerCase();
    const sourceLower = chunk.source.toLowerCase();
    let score = 0;
    for (const w of searchWords) {
      if (lower.includes(w)) {
        score += 1;
        if (sourceLower.includes(w)) {
          score += 2;
        }
      }
    }
    return { ...chunk, score };
  });

  // Return topK chunks based on relevance
  const top = scored
    .filter(c => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return top.map(c => c.text).join('\n\n');
}
