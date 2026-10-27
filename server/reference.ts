import { getDb } from './db.js';

// ---------------------------------------------------------------------------
// Topic synonym expansion map.
//
// Keys are the user-facing search terms a host might type.
// Values are related words/phrases used to expand the FTS5 query so results
// cover the full semantic space of a topic, not just exact keyword matches.
//
// Search intentionally ignores the category column — Jeopardy categories are
// too cryptic/pun-based to be reliable signals ("POTENT POTABLES" etc.).
// ---------------------------------------------------------------------------
export const TOPIC_SYNONYMS: Record<string, string[]> = {

  // ── Science: Space & Astronomy ───────────────────────────────────────────
  space: [
    'nasa', 'astronaut', 'rocket', 'orbit', 'satellite', 'shuttle', 'telescope',
    'hubble', 'apollo', 'cosmos', 'universe', 'galaxy', 'milky way',
    'nebula', 'black hole', 'supernova', 'eclipse', 'comet', 'asteroid',
    'meteor', 'solar system', 'planet', 'moon', 'mars', 'jupiter', 'saturn',
    'venus', 'mercury', 'uranus', 'neptune', 'pluto', 'gravity', 'launch',
  ],
  astronomy: [
    'star', 'constellation', 'telescope', 'observatory', 'light year',
    'galaxy', 'nebula', 'quasar', 'pulsar', 'black hole', 'supernova',
    'red giant', 'white dwarf', 'magnitude', 'zodiac', 'equinox', 'solstice',
  ],

  // ── Science: Biology & Life ──────────────────────────────────────────────
  biology: [
    'cell', 'DNA', 'gene', 'chromosome', 'evolution', 'species', 'organism',
    'photosynthesis', 'mammal', 'vertebrate', 'invertebrate', 'enzyme',
    'protein', 'bacteria', 'virus', 'fungi', 'ecosystem', 'habitat',
    'natural selection', 'darwin', 'mutation', 'reproduction', 'mitosis',
  ],
  anatomy: [
    'heart', 'lung', 'brain', 'liver', 'kidney', 'bone', 'muscle', 'nerve',
    'artery', 'vein', 'skeleton', 'spine', 'blood', 'organ', 'tissue',
    'stomach', 'intestine', 'hormone', 'gland', 'immune system',
  ],
  medicine: [
    'doctor', 'physician', 'surgeon', 'hospital', 'disease', 'diagnosis',
    'symptom', 'treatment', 'cure', 'vaccine', 'antibiotic', 'surgery',
    'therapy', 'pharmacy', 'drug', 'illness', 'infection', 'epidemic',
    'pandemic', 'cancer', 'diabetes', 'virus', 'bacteria', 'pathology',
  ],

  // ── Science: Chemistry ───────────────────────────────────────────────────
  chemistry: [
    'element', 'atom', 'molecule', 'compound', 'periodic table', 'proton',
    'neutron', 'electron', 'acid', 'base', 'reaction', 'bond', 'hydrogen',
    'oxygen', 'carbon', 'nitrogen', 'iron', 'gold', 'silver', 'copper',
    'valence', 'isotope', 'polymer', 'catalyst', 'oxidation', 'formula',
  ],

  // ── Science: Physics ─────────────────────────────────────────────────────
  physics: [
    'force', 'gravity', 'energy', 'velocity', 'acceleration', 'momentum',
    'mass', 'newton', 'einstein', 'relativity', 'quantum', 'particle',
    'wave', 'light', 'electricity', 'magnetism', 'nuclear', 'radiation',
    'thermodynamics', 'entropy', 'friction', 'optics', 'laser',
  ],

  // ── Science: Earth & Nature ──────────────────────────────────────────────
  geology: [
    'rock', 'mineral', 'fossil', 'earthquake', 'volcano', 'tectonic',
    'plate', 'erosion', 'sediment', 'crystal', 'cave', 'canyon', 'glacier',
    'lava', 'magma', 'ore', 'coal', 'diamond', 'gem', 'stratum',
  ],
  weather: [
    'hurricane', 'tornado', 'storm', 'thunder', 'lightning', 'flood',
    'drought', 'blizzard', 'snow', 'rain', 'fog', 'climate', 'temperature',
    'atmosphere', 'forecast', 'barometer', 'monsoon', 'typhoon', 'cyclone',
  ],
  animals: [
    'mammal', 'bird', 'reptile', 'fish', 'insect', 'amphibian', 'predator',
    'prey', 'carnivore', 'herbivore', 'omnivore', 'endangered', 'extinct',
    'migration', 'hibernate', 'wolf', 'bear', 'lion', 'tiger', 'elephant',
    'whale', 'dolphin', 'shark', 'eagle', 'snake', 'spider', 'bee',
  ],
  plants: [
    'tree', 'flower', 'leaf', 'root', 'stem', 'seed', 'pollen', 'fruit',
    'vegetable', 'herb', 'shrub', 'forest', 'jungle', 'rainforest',
    'photosynthesis', 'chlorophyll', 'botany', 'garden', 'rose', 'oak',
  ],
  ocean: [
    'sea', 'tide', 'wave', 'coral reef', 'deep sea', 'trench', 'current',
    'marine', 'atlantic', 'pacific', 'indian ocean', 'arctic', 'submarine',
    'shipwreck', 'lighthouse', 'port', 'harbor', 'coast', 'beach',
    'island', 'fish', 'whale', 'shark', 'plankton', 'seaweed',
  ],

  // ── Math ─────────────────────────────────────────────────────────────────
  math: [
    'algebra', 'geometry', 'calculus', 'equation', 'formula', 'fraction',
    'decimal', 'percentage', 'prime number', 'integer', 'variable', 'angle',
    'triangle', 'circle', 'pi', 'radius', 'diameter', 'theorem', 'proof',
    'statistics', 'probability', 'average', 'median', 'graph',
  ],

  // ── Technology ───────────────────────────────────────────────────────────
  technology: [
    'computer', 'internet', 'software', 'hardware', 'program', 'code',
    'algorithm', 'artificial intelligence', 'robot', 'smartphone', 'app',
    'network', 'data', 'chip', 'processor', 'server', 'website', 'email',
    'social media', 'encryption', 'binary', 'database', 'silicon',
  ],
  inventions: [
    'inventor', 'patent', 'discovery', 'innovation', 'machine', 'engine',
    'wheel', 'printing press', 'telephone', 'electricity', 'lightbulb',
    'radio', 'television', 'steam', 'automobile', 'airplane', 'vaccine',
    'gunpowder', 'compass', 'microscope', 'telescope',
  ],

  // ── American History ─────────────────────────────────────────────────────
  'american history': [
    'revolution', 'founding fathers', 'constitution', 'declaration',
    'independence', 'congress', 'senate', 'civil war', 'confederate',
    'union', 'slavery', 'emancipation', 'reconstruction', 'westward',
    'manifest destiny', 'gold rush', 'pioneer', 'colonial', 'pilgrims',
    'thanksgiving', 'amendment', 'bill of rights',
  ],
  presidents: [
    'white house', 'oval office', 'commander in chief', 'inauguration',
    'term', 'veto', 'executive', 'washington', 'lincoln', 'roosevelt',
    'jefferson', 'adams', 'madison', 'jackson', 'kennedy', 'reagan',
    'clinton', 'obama', 'eisenhower', 'nixon', 'wilson', 'cabinet',
    'vice president',
  ],
  'civil war': [
    'union', 'confederate', 'slavery', 'lincoln', 'gettysburg', 'bull run',
    'antietam', 'appomattox', 'sherman', 'grant', 'lee', 'reconstruction',
    'emancipation proclamation', 'secession', 'regiment', 'battle',
  ],
  'world war': [
    'world war', 'ww2', 'wwii', 'ww1', 'wwi', 'hitler', 'nazi', 'holocaust',
    'pearl harbor', 'normandy', 'd-day', 'hiroshima', 'atomic bomb',
    'allied', 'axis', 'churchill', 'roosevelt', 'eisenhower', 'patton',
    'trench', 'armistice', 'veteran', 'surrender', 'occupation',
  ],
  'cold war': [
    'soviet', 'ussr', 'communism', 'capitalism', 'nuclear', 'arms race',
    'space race', 'berlin wall', 'cuba', 'missile', 'CIA', 'spy', 'nato',
    'iron curtain', 'korea', 'vietnam', 'détente', 'reagan', 'gorbachev',
  ],

  // ── World History ────────────────────────────────────────────────────────
  'world history': [
    'ancient', 'empire', 'dynasty', 'civilization', 'conquest', 'war',
    'treaty', 'revolution', 'renaissance', 'medieval', 'feudal', 'plague',
    'crusade', 'colony', 'independence', 'monarchy', 'republic',
  ],
  'ancient history': [
    'egypt', 'rome', 'greece', 'babylon', 'mesopotamia', 'pharaoh',
    'pyramid', 'sphinx', 'gladiator', 'caesar', 'alexander', 'sparta',
    'athens', 'aristotle', 'plato', 'socrates', 'viking', 'maya', 'aztec',
    'inca', 'persian', 'ottoman', 'mongol', 'colosseum', 'senate',
  ],
  royalty: [
    'king', 'queen', 'prince', 'princess', 'emperor', 'empress', 'throne',
    'crown', 'castle', 'palace', 'coronation', 'dynasty', 'heir', 'noble',
    'duke', 'earl', 'lord', 'monarchy', 'reign', 'succession',
  ],
  explorers: [
    'exploration', 'voyage', 'expedition', 'navigate', 'discover',
    'columbus', 'magellan', 'vasco da gama', 'drake', 'cortez', 'lewis',
    'clark', 'amundsen', 'new world', 'conquest', 'circumnavigate',
    'map', 'compass', 'ship', 'colony', 'trade route',
  ],

  // ── Politics & Law ───────────────────────────────────────────────────────
  politics: [
    'democrat', 'republican', 'election', 'vote', 'campaign', 'congress',
    'senate', 'house', 'legislation', 'bill', 'law', 'policy', 'government',
    'politician', 'party', 'primary', 'debate', 'ballot', 'majority',
  ],
  law: [
    'court', 'judge', 'jury', 'trial', 'verdict', 'attorney', 'lawyer',
    'supreme court', 'amendment', 'constitution', 'rights', 'crime',
    'prosecution', 'defense', 'sentence', 'appeal', 'justice', 'plaintiff',
    'defendant', 'statute', 'lawsuit',
  ],

  // ── Geography ────────────────────────────────────────────────────────────
  geography: [
    'country', 'capital', 'continent', 'border', 'nation', 'territory',
    'latitude', 'longitude', 'equator', 'hemisphere', 'peninsula',
    'island', 'mountain', 'river', 'desert', 'population', 'flag',
  ],
  mountains: [
    'peak', 'summit', 'range', 'altitude', 'elevation', 'climb', 'everest',
    'alps', 'andes', 'rockies', 'himalaya', 'volcano', 'glacier', 'ridge',
    'plateau', 'valley', 'hiking', 'expedition',
  ],
  rivers: [
    'tributary', 'delta', 'source', 'current', 'bank', 'flood', 'dam',
    'nile', 'amazon', 'mississippi', 'nile', 'yangtze', 'seine',
    'thames', 'rhine', 'ganges', 'danube', 'colorado', 'waterfall', 'canal',
  ],

  // ── Literature ───────────────────────────────────────────────────────────
  literature: [
    'novel', 'author', 'fiction', 'character', 'plot', 'chapter', 'hero',
    'villain', 'narrator', 'theme', 'metaphor', 'symbolism', 'genre',
    'classic', 'bestseller', 'publisher', 'manuscript', 'poem', 'stanza',
  ],
  shakespeare: [
    'hamlet', 'macbeth', 'othello', 'romeo', 'juliet', 'lear', 'tempest',
    'midsummer', 'sonnets', 'elizabethan', 'globe theatre', 'tragedy',
    'comedy', 'bard', 'stratford', 'iambic pentameter', 'soliloquy',
  ],
  poetry: [
    'poem', 'poet', 'verse', 'stanza', 'rhyme', 'meter', 'sonnet',
    'haiku', 'ode', 'ballad', 'imagery', 'metaphor', 'simile', 'frost',
    'whitman', 'dickinson', 'keats', 'blake', 'eliot', 'poe',
  ],

  // ── Mythology & Religion ─────────────────────────────────────────────────
  mythology: [
    'god', 'goddess', 'zeus', 'jupiter', 'apollo', 'athena', 'hercules',
    'odyssey', 'iliad', 'trojan', 'olympus', 'titan', 'myth', 'legend',
    'thor', 'odin', 'loki', 'norse', 'poseidon', 'hades', 'ares',
    'aphrodite', 'artemis', 'hermes', 'hera', 'demeter', 'dionysus',
  ],
  bible: [
    'scripture', 'testament', 'prophet', 'apostle', 'disciple', 'gospel',
    'psalm', 'proverb', 'genesis', 'exodus', 'revelation', 'moses',
    'noah', 'abraham', 'david', 'solomon', 'jesus', 'mary', 'angel',
    'eden', 'jerusalem', 'christian', 'church', 'faith', 'prayer',
  ],
  religion: [
    'faith', 'worship', 'prayer', 'church', 'temple', 'mosque', 'synagogue',
    'christianity', 'islam', 'judaism', 'buddhism', 'hinduism', 'holy',
    'sacred', 'scripture', 'ritual', 'pilgrim', 'clergy', 'priest',
    'monk', 'pope', 'bishop', 'saint', 'relic',
  ],

  // ── Philosophy ───────────────────────────────────────────────────────────
  philosophy: [
    'ethics', 'logic', 'reasoning', 'truth', 'justice', 'virtue', 'socrates',
    'plato', 'aristotle', 'kant', 'nietzsche', 'descartes', 'hume',
    'epistemology', 'metaphysics', 'existentialism', 'utilitarianism',
    'democracy', 'republic', 'morality',
  ],

  // ── Music ────────────────────────────────────────────────────────────────
  'classical music': [
    'symphony', 'concerto', 'opera', 'orchestra', 'composer', 'beethoven',
    'mozart', 'bach', 'chopin', 'handel', 'vivaldi', 'brahms', 'schubert',
    'conductor', 'piano', 'violin', 'sonata', 'quartet', 'overture',
  ],
  music: [
    'song', 'singer', 'band', 'album', 'hit', 'chart', 'record', 'concert',
    'guitar', 'drums', 'bass', 'melody', 'rhythm', 'lyrics', 'vocal',
    'pop', 'rock', 'jazz', 'blues', 'country', 'hip hop', 'rap',
    'grammy', 'billboard', 'music video', 'tour', 'studio',
  ],

  // ── Film & Television ────────────────────────────────────────────────────
  movies: [
    'film', 'director', 'actor', 'actress', 'oscar', 'academy award',
    'hollywood', 'screenplay', 'box office', 'blockbuster', 'sequel',
    'trilogy', 'cinema', 'premiere', 'studio', 'producer', 'cast',
    'animated', 'documentary', 'comedy', 'thriller', 'horror', 'drama',
  ],
  television: [
    'TV', 'show', 'series', 'episode', 'season', 'sitcom', 'network',
    'cable', 'Emmy', 'ratings', 'broadcast', 'streaming', 'pilot',
    'finale', 'character', 'host', 'news anchor', 'reality show',
    'soap opera', 'talk show', 'game show', 'spin-off',
  ],

  // ── Sports ───────────────────────────────────────────────────────────────
  sports: [
    'athlete', 'team', 'championship', 'league', 'record', 'coach',
    'stadium', 'score', 'win', 'trophy', 'medal', 'tournament', 'season',
    'draft', 'trade', 'hall of fame', 'mvp', 'referee', 'uniform',
  ],
  baseball: [
    'pitcher', 'batter', 'inning', 'home run', 'strikeout', 'world series',
    'dugout', 'outfield', 'shortstop', 'catcher', 'umpire', 'pennant',
    'stolen base', 'walk', 'batting average', 'ERA', 'ballpark', 'spring training',
  ],
  football: [
    'quarterback', 'touchdown', 'super bowl', 'NFL', 'yards', 'end zone',
    'linebacker', 'receiver', 'offensive line', 'punt', 'field goal',
    'interception', 'fumble', 'first down', 'playoffs', 'division',
  ],
  basketball: [
    'NBA', 'points', 'rebounds', 'assists', 'slam dunk', 'three-pointer',
    'court', 'rim', 'free throw', 'fast break', 'playoffs', 'finals',
    'MVP', 'point guard', 'center', 'forward', 'shot clock',
  ],
  olympics: [
    'gold medal', 'silver medal', 'bronze medal', 'athlete', 'games',
    'competition', 'world record', 'torch', 'opening ceremony', 'host city',
    'swimming', 'gymnastics', 'track', 'marathon', 'decathlon', 'winter olympics',
    'ski', 'skating', 'bobsled',
  ],
  golf: [
    'par', 'birdie', 'eagle', 'bogey', 'hole', 'fairway', 'green', 'putt',
    'driver', 'iron', 'caddie', 'masters', 'PGA', 'open championship',
    'course', 'handicap', 'club', 'tee', 'bunker',
  ],
  tennis: [
    'serve', 'volley', 'ace', 'deuce', 'set', 'match', 'grand slam',
    'wimbledon', 'US open', 'french open', 'australian open', 'backhand',
    'forehand', 'court', 'net', 'baseline', 'seed', 'rally',
  ],

  // ── Art & Architecture ───────────────────────────────────────────────────
  art: [
    'painting', 'sculpture', 'artist', 'museum', 'gallery', 'canvas',
    'masterpiece', 'portrait', 'landscape', 'abstract', 'renaissance',
    'impressionist', 'modern art', 'exhibition', 'da vinci', 'michelangelo',
    'picasso', 'van gogh', 'monet', 'rembrandt', 'warhol',
  ],
  architecture: [
    'building', 'structure', 'bridge', 'tower', 'monument', 'dome',
    'arch', 'column', 'cathedral', 'skyscraper', 'design', 'blueprint',
    'engineer', 'landmark', 'eiffel tower', 'colosseum', 'parthenon',
    'pyramid', 'great wall', 'taj mahal',
  ],

  // ── Food & Drink ─────────────────────────────────────────────────────────
  food: [
    'recipe', 'ingredient', 'chef', 'cuisine', 'dish', 'cooking', 'baking',
    'restaurant', 'flavor', 'spice', 'herb', 'sauce', 'dessert', 'appetizer',
    'vegetable', 'fruit', 'grain', 'protein', 'calorie', 'nutrition',
  ],
  drinks: [
    'wine', 'beer', 'cocktail', 'spirit', 'whiskey', 'vodka', 'rum',
    'gin', 'champagne', 'brewing', 'distill', 'vineyard', 'winery',
    'ale', 'lager', 'bourbon', 'brandy', 'liqueur', 'mocktail',
  ],

  // ── Language & Words ─────────────────────────────────────────────────────
  language: [
    'word', 'etymology', 'vocabulary', 'grammar', 'definition', 'slang',
    'idiom', 'phrase', 'prefix', 'suffix', 'root', 'latin', 'greek',
    'abbreviation', 'acronym', 'dialect', 'accent', 'translation',
    'synonym', 'antonym', 'homonym',
  ],
  words: [
    'definition', 'spelling', 'pronunciation', 'origin', 'meaning',
    'letters', 'syllable', 'anagram', 'palindrome', 'abbreviation',
    'portmanteau', 'onomatopoeia', 'rhyme', 'compound word',
  ],

  // ── Business & Money ─────────────────────────────────────────────────────
  business: [
    'company', 'corporation', 'CEO', 'stock', 'market', 'profit', 'revenue',
    'investment', 'entrepreneur', 'startup', 'brand', 'merger', 'acquisition',
    'trade', 'economy', 'industry', 'product', 'advertising', 'marketing',
  ],
  money: [
    'currency', 'dollar', 'coin', 'bill', 'bank', 'interest', 'inflation',
    'wealth', 'rich', 'debt', 'budget', 'tax', 'exchange rate',
    'gold standard', 'federal reserve', 'wall street', 'nasdaq',
  ],

  // ── Transportation ───────────────────────────────────────────────────────
  transportation: [
    'car', 'automobile', 'train', 'ship', 'airplane', 'boat', 'bicycle',
    'highway', 'railroad', 'airport', 'aviation', 'engine', 'fuel',
    'speed', 'navigation', 'voyage', 'journey', 'cruise',
  ],

  // ── Famous People ────────────────────────────────────────────────────────
  'famous people': [
    'celebrity', 'biography', 'notable', 'renowned', 'iconic', 'legend',
    'pioneer', 'innovator', 'leader', 'activist', 'humanitarian',
    'scientist', 'artist', 'writer', 'politician', 'athlete',
  ],

  // ── Holidays & Traditions ────────────────────────────────────────────────
  holidays: [
    'christmas', 'thanksgiving', 'halloween', 'easter', 'hanukkah',
    'new year', 'independence day', 'valentines', 'celebration',
    'tradition', 'festival', 'parade', 'gift', 'decoration', 'costume',
  ],

  // ── Psychology & Mind ────────────────────────────────────────────────────
  psychology: [
    'behavior', 'mind', 'brain', 'mental health', 'therapy', 'freud',
    'jung', 'consciousness', 'memory', 'emotion', 'personality',
    'phobia', 'anxiety', 'depression', 'cognitive', 'subconscious',
  ],
};

// ---------------------------------------------------------------------------
// Expand a raw query term into FTS5-safe OR'd tokens.
// Falls back to the raw term if no synonym entry exists.
// ---------------------------------------------------------------------------
export function expandQuery(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const synonyms = TOPIC_SYNONYMS[lower] ?? [];
  return Array.from(new Set([lower, ...synonyms]));
}

// ---------------------------------------------------------------------------
// Build the FTS5 MATCH expression.
// Uses a column filter so only `answer` and `question` are searched —
// category is intentionally excluded (Jeopardy categories are too pun-heavy).
// Multi-word phrases are double-quoted per FTS5 syntax.
// ---------------------------------------------------------------------------
function buildMatchExpr(tokens: string[]): string {
  const terms = tokens
    .map((t) => (t.includes(' ') ? `"${t}"` : t))
    .join(' OR ');
  return `{answer question} : ${terms}`;
}

// ---------------------------------------------------------------------------
// Public search function used by the API routes.
// ---------------------------------------------------------------------------
export interface ReferenceResult {
  id: number;
  category: string;
  answer: string;
  question: string;
  clue_value: number;
  air_date: string;
  round: number;
}

export function searchReference(
  query: string,
  limit = 50,
  offset = 0
): { results: ReferenceResult[]; total: number } {
  const db = getDb();

  if (!query || query.trim().length === 0) {
    return { results: [], total: 0 };
  }

  const tokens = expandQuery(query);
  const matchExpr = buildMatchExpr(tokens);

  try {
    const results: ReferenceResult[] = db
      .prepare(
        `SELECT r.id, r.category, r.answer, r.question, r.clue_value, r.air_date, r.round
         FROM jeopardy_fts fts
         JOIN jeopardy_reference r ON r.id = fts.rowid
         WHERE jeopardy_fts MATCH ?
         ORDER BY rank
         LIMIT ? OFFSET ?`
      )
      .all(matchExpr, limit, offset);

    const countRow: any = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM jeopardy_fts
         WHERE jeopardy_fts MATCH ?`
      )
      .get(matchExpr);

    return { results, total: countRow?.total ?? 0 };
  } catch (err) {
    console.error('>>> [Reference] FTS search error:', err);
    return { results: [], total: 0 };
  }
}
