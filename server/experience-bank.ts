// ─────────────────────────────────────────────────────────────────────────────
// MindRoute — Experience Bank (grounding layer)
// ─────────────────────────────────────────────────────────────────────────────
// Curated bank of REAL, durable anchors per destination: landmarks, neighborhoods,
// markets, viewpoints, nature spots, signature walks, and a few legendary food
// institutions. Used to GROUND itinerary generation so the model selects from
// verified places instead of inventing them.
//
// Rules followed while curating (keep them when extending):
//   • Only durable, well-documented anchors (UNESCO/iconic landmarks, famous
//     neighborhoods, established markets, major viewpoints). No volatile bets.
//   • Restaurants are kept rare and only when they're institutions; everyday
//     dining is left to the model (matched to FOOD_PREF + budget) to avoid stale data.
//   • `why` lines are original one-liners — never copied prose.
//   • `tags` use the same vocabulary as the quiz chips so STEP-1 chip matching works.
//   • Coordinates are well-known facts for these anchors; they are intentionally
//     NOT injected into the prompt (the runtime geocoder resolves pins by name) —
//     they live here as reference/metadata for future direct map use.
//
// Lookup is by normalized city name (part before the comma), with aliases.
// Missing destination → null → generation falls back to current behavior.
// ─────────────────────────────────────────────────────────────────────────────

export type ExpType =
  | "landmark" | "neighborhood" | "nature" | "viewpoint"
  | "market" | "food" | "experience" | "walk";

export interface BankExperience {
  name: string;                 // exact real name
  area: string;                 // neighborhood / zone
  type: ExpType;
  coords?: { lat: number; lng: number };
  priceBand: "free" | "low" | "mid" | "high";
  effort: "low" | "moderate" | "high";
  bestTime: string;             // "early morning" | "sunset" | "any" | ...
  tags: string[];               // chip vocabulary: authentic, nature, cultural, food, viewpoint, spiritual, festive, adventure, romantic, market, neighborhood, iconic, wellness, relax, nightlife
  why: string;                  // original one-line note
}

export interface DestinationBank {
  city: string;                 // canonical "City, Country"
  aliases: string[];            // normalized lookup keys (lowercase)
  experiences: BankExperience[];
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const BANKS: DestinationBank[] = [
  {
    city: "Tokyo, Japan",
    aliases: ["tokyo", "tōkyō", "tokyo japan", "tokyo, japan"],
    experiences: [
      { name: "Sensō-ji Temple", area: "Asakusa", type: "landmark", coords: { lat: 35.7148, lng: 139.7967 }, priceBand: "free", effort: "low", bestTime: "early morning", tags: ["cultural", "spiritual", "iconic"], why: "Tokyo's oldest temple; go at dawn before the Nakamise crowds." },
      { name: "Meiji Jingū", area: "Shibuya / Harajuku", type: "nature", coords: { lat: 35.6764, lng: 139.6993 }, priceBand: "free", effort: "low", bestTime: "morning", tags: ["spiritual", "nature", "regenerating"], why: "A forest shrine in the middle of the city — instant calm." },
      { name: "Shibuya Crossing", area: "Shibuya", type: "landmark", coords: { lat: 35.6595, lng: 139.7005 }, priceBand: "free", effort: "low", bestTime: "evening", tags: ["iconic", "festive", "chaotic"], why: "The pulse of the city, best felt at night from above." },
      { name: "Shinjuku Gyoen", area: "Shinjuku", type: "nature", coords: { lat: 35.6852, lng: 139.7100 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["nature", "relax", "regenerating"], why: "Three garden styles in one — the city's best slow afternoon." },
      { name: "Tsukiji Outer Market", area: "Tsukiji", type: "market", coords: { lat: 35.6654, lng: 139.7707 }, priceBand: "low", effort: "low", bestTime: "early morning", tags: ["food", "market", "authentic"], why: "Standing-room sushi and tamagoyaki where the city actually eats." },
      { name: "teamLab Planets", area: "Toyosu", type: "experience", coords: { lat: 35.6499, lng: 139.7906 }, priceBand: "mid", effort: "low", bestTime: "any", tags: ["new", "experience", "iconic"], why: "Barefoot, immersive digital art — unlike anything elsewhere." },
      { name: "Yanaka", area: "Yanaka", type: "neighborhood", coords: { lat: 35.7270, lng: 139.7660 }, priceBand: "free", effort: "moderate", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative"], why: "Old-Tokyo lanes, temples and a slow shopping street that survived the wars." },
      { name: "Golden Gai", area: "Shinjuku", type: "neighborhood", coords: { lat: 35.6940, lng: 139.7048 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["festive", "nightlife", "authentic"], why: "Six alleys of tiny bars, each its own world — intimate, not clubby." },
      { name: "Tokyo Metropolitan Government Building observation decks", area: "Shinjuku", type: "viewpoint", coords: { lat: 35.6896, lng: 139.6917 }, priceBand: "free", effort: "low", bestTime: "sunset", tags: ["viewpoint", "iconic"], why: "Free panorama to Mt. Fuji on a clear evening." },
      { name: "Shimokitazawa", area: "Shimokitazawa", type: "neighborhood", coords: { lat: 35.6613, lng: 139.6680 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative", "festive"], why: "Vintage shops, tiny theatres and third-wave cafés — the city's bohemian heart." },
    ],
  },
  {
    city: "Kyoto, Japan",
    aliases: ["kyoto", "kyōto", "kyoto japan", "kyoto, japan"],
    experiences: [
      { name: "Fushimi Inari Taisha", area: "Fushimi", type: "landmark", coords: { lat: 34.9671, lng: 135.7727 }, priceBand: "free", effort: "moderate", bestTime: "early morning", tags: ["spiritual", "iconic", "nature"], why: "Thousands of vermilion torii up the mountain — empty before 8am." },
      { name: "Arashiyama Bamboo Grove", area: "Arashiyama", type: "nature", coords: { lat: 35.0170, lng: 135.6716 }, priceBand: "free", effort: "low", bestTime: "early morning", tags: ["nature", "iconic", "regenerating"], why: "Light filtering through bamboo — go at first light to have it alone." },
      { name: "Kinkaku-ji (Golden Pavilion)", area: "Kita", type: "landmark", coords: { lat: 35.0394, lng: 135.7292 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["cultural", "iconic", "spiritual"], why: "Gold leaf mirrored in a still pond — Japan's most photographed temple." },
      { name: "Gion", area: "Gion", type: "neighborhood", coords: { lat: 35.0037, lng: 135.7752 }, priceBand: "free", effort: "low", bestTime: "evening", tags: ["authentic", "cultural", "romantic", "neighborhood"], why: "Wooden machiya and lantern light; geiko hurry to evening appointments." },
      { name: "Kiyomizu-dera", area: "Higashiyama", type: "landmark", coords: { lat: 34.9949, lng: 135.7850 }, priceBand: "low", effort: "moderate", bestTime: "afternoon", tags: ["cultural", "spiritual", "viewpoint"], why: "A wooden stage over the hillside, with the old town below." },
      { name: "Nishiki Market", area: "Nakagyō", type: "market", coords: { lat: 35.0050, lng: 135.7649 }, priceBand: "low", effort: "low", bestTime: "midday", tags: ["food", "market", "authentic"], why: "'Kyoto's kitchen' — pickles, tofu, and tsukemono for five centuries." },
      { name: "Philosopher's Path", area: "Higashiyama", type: "walk", coords: { lat: 35.0271, lng: 135.7949 }, priceBand: "free", effort: "low", bestTime: "afternoon", tags: ["nature", "walk", "regenerating", "romantic"], why: "A canal-side stroll between temples — meditative in any season." },
      { name: "Ginkaku-ji (Silver Pavilion)", area: "Higashiyama", type: "landmark", coords: { lat: 35.0270, lng: 135.7982 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["cultural", "spiritual", "nature"], why: "Raked sand and moss gardens — restraint over spectacle." },
      { name: "Pontochō", area: "Nakagyō", type: "neighborhood", coords: { lat: 35.0048, lng: 135.7707 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["authentic", "food", "romantic", "neighborhood"], why: "A single lantern-lit alley of riverside dining along the Kamogawa." },
    ],
  },
  {
    city: "Lisbon, Portugal",
    aliases: ["lisbon", "lisboa", "lisbon portugal", "lisbon, portugal"],
    experiences: [
      { name: "Alfama", area: "Alfama", type: "neighborhood", coords: { lat: 38.7118, lng: -9.1300 }, priceBand: "free", effort: "moderate", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative"], why: "The old Moorish quarter — get lost in stairways and fado spilling from doorways." },
      { name: "Miradouro da Senhora do Monte", area: "Graça", type: "viewpoint", coords: { lat: 38.7197, lng: -9.1308 }, priceBand: "free", effort: "moderate", bestTime: "sunset", tags: ["viewpoint", "romantic", "relax"], why: "The highest miradouro — the whole city and river at golden hour." },
      { name: "Tram 28", area: "city-wide", type: "experience", coords: { lat: 38.7110, lng: -9.1320 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["iconic", "experience"], why: "The yellow tram threading the old hills — ride it early, end to end." },
      { name: "Time Out Market", area: "Cais do Sodré", type: "market", coords: { lat: 38.7067, lng: -9.1459 }, priceBand: "mid", effort: "low", bestTime: "midday", tags: ["food", "market", "festive"], why: "Top Lisbon chefs under one roof — easy way to taste the city's range." },
      { name: "Belém Tower & Jerónimos Monastery", area: "Belém", type: "landmark", coords: { lat: 38.6916, lng: -9.2160 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["cultural", "iconic"], why: "Manueline stone by the river — the age of discoveries, carved." },
      { name: "LX Factory", area: "Alcântara", type: "neighborhood", coords: { lat: 38.7036, lng: -9.1786 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["festive", "neighborhood", "explorative"], why: "A converted industrial complex of bookstores, studios and rooftop bars." },
      { name: "Pastéis de Belém", area: "Belém", type: "food", coords: { lat: 38.6976, lng: -9.2032 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["food", "authentic", "iconic"], why: "The original 1837 custard tart, still warm with cinnamon." },
      { name: "Sintra day trip (Pena Palace & Quinta da Regaleira)", area: "Sintra", type: "experience", coords: { lat: 38.7876, lng: -9.3904 }, priceBand: "mid", effort: "moderate", bestTime: "morning", tags: ["nature", "cultural", "romantic", "experience"], why: "Fairytale palaces in misty hills, 40 minutes by train." },
    ],
  },
  {
    city: "Porto, Portugal",
    aliases: ["porto", "oporto", "porto portugal", "porto, portugal"],
    experiences: [
      { name: "Ribeira", area: "Ribeira", type: "neighborhood", coords: { lat: 41.1409, lng: -8.6111 }, priceBand: "free", effort: "low", bestTime: "evening", tags: ["authentic", "neighborhood", "romantic"], why: "Tiled houses stacked above the Douro — the postcard, lived in." },
      { name: "Livraria Lello", area: "Centro", type: "landmark", coords: { lat: 41.1469, lng: -8.6149 }, priceBand: "low", effort: "low", bestTime: "early morning", tags: ["cultural", "iconic"], why: "A neo-gothic bookshop and its crimson staircase — book the first slot." },
      { name: "Dom Luís I Bridge", area: "Ribeira / Gaia", type: "viewpoint", coords: { lat: 41.1397, lng: -8.6094 }, priceBand: "free", effort: "low", bestTime: "sunset", tags: ["viewpoint", "iconic", "romantic"], why: "Walk the upper deck at dusk for the river and both banks." },
      { name: "Vila Nova de Gaia port lodges", area: "Gaia", type: "experience", coords: { lat: 41.1370, lng: -8.6110 }, priceBand: "mid", effort: "low", bestTime: "afternoon", tags: ["food", "experience", "cultural"], why: "Cellar tastings where the city's namesake wine actually ages." },
      { name: "Mercado do Bolhão", area: "Centro", type: "market", coords: { lat: 41.1494, lng: -8.6072 }, priceBand: "low", effort: "low", bestTime: "midday", tags: ["food", "market", "authentic"], why: "The restored 19th-century market — produce, bacalhau, conversation." },
      { name: "Foz do Douro promenade", area: "Foz", type: "walk", coords: { lat: 41.1490, lng: -8.6800 }, priceBand: "free", effort: "low", bestTime: "sunset", tags: ["walk", "relax", "nature"], why: "Where the river meets the Atlantic — sea air and quiet." },
    ],
  },
  {
    city: "Barcelona, Spain",
    aliases: ["barcelona", "barcelona spain", "barcelona, spain"],
    experiences: [
      { name: "Sagrada Família", area: "Eixample", type: "landmark", coords: { lat: 41.4036, lng: 2.1744 }, priceBand: "mid", effort: "low", bestTime: "morning", tags: ["cultural", "iconic", "spiritual"], why: "Gaudí's basilica — book the first entry for the morning light through the glass." },
      { name: "Park Güell", area: "Gràcia", type: "landmark", coords: { lat: 41.4145, lng: 2.1527 }, priceBand: "low", effort: "moderate", bestTime: "early morning", tags: ["cultural", "viewpoint", "iconic"], why: "Mosaic terraces over the city — go at opening to beat the heat and crowds." },
      { name: "Gothic Quarter (Barri Gòtic)", area: "Ciutat Vella", type: "neighborhood", coords: { lat: 41.3833, lng: 2.1769 }, priceBand: "free", effort: "low", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative", "cultural"], why: "Roman walls and medieval lanes — wander without a map." },
      { name: "La Boqueria", area: "El Raval", type: "market", coords: { lat: 41.3818, lng: 2.1716 }, priceBand: "low", effort: "low", bestTime: "midday", tags: ["food", "market", "festive"], why: "The Rambla's great market — go deep past the entrance for the real stalls." },
      { name: "El Born", area: "El Born", type: "neighborhood", coords: { lat: 41.3850, lng: 2.1820 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["authentic", "food", "festive", "neighborhood"], why: "Tapas, design shops and the Picasso Museum in tight medieval streets." },
      { name: "Bunkers del Carmel", area: "El Carmel", type: "viewpoint", coords: { lat: 41.4193, lng: 2.1620 }, priceBand: "free", effort: "moderate", bestTime: "sunset", tags: ["viewpoint", "relax", "romantic"], why: "Civil-war hilltop bunkers — the city's best free 360° sunset." },
      { name: "Barceloneta beach & seafront", area: "Barceloneta", type: "nature", coords: { lat: 41.3784, lng: 2.1925 }, priceBand: "free", effort: "low", bestTime: "afternoon", tags: ["relax", "nature", "festive"], why: "City beach and a boardwalk of seafood — slow Mediterranean afternoons." },
    ],
  },
  {
    city: "Rome, Italy",
    aliases: ["rome", "roma", "rome italy", "rome, italy"],
    experiences: [
      { name: "Colosseum & Roman Forum", area: "Centro Storico", type: "landmark", coords: { lat: 41.8902, lng: 12.4922 }, priceBand: "mid", effort: "moderate", bestTime: "early morning", tags: ["cultural", "iconic"], why: "Two thousand years in one walk — first entry beats the heat and lines." },
      { name: "Pantheon", area: "Centro Storico", type: "landmark", coords: { lat: 41.8986, lng: 12.4769 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["cultural", "iconic", "spiritual"], why: "The perfect dome and its open oculus — engineering as awe." },
      { name: "Trastevere", area: "Trastevere", type: "neighborhood", coords: { lat: 41.8890, lng: 12.4694 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["authentic", "food", "festive", "neighborhood"], why: "Cobbled lanes and trattorie — Rome's most alive dinner quarter." },
      { name: "Trevi Fountain", area: "Centro Storico", type: "landmark", coords: { lat: 41.9009, lng: 12.4833 }, priceBand: "free", effort: "low", bestTime: "early morning", tags: ["iconic", "romantic"], why: "Baroque theatre in stone — go at 7am to have it almost to yourself." },
      { name: "Campo de' Fiori market", area: "Centro Storico", type: "market", coords: { lat: 41.8957, lng: 12.4722 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["food", "market", "authentic"], why: "A working morning market that turns into an evening piazza." },
      { name: "Gianicolo Terrace", area: "Gianicolo", type: "viewpoint", coords: { lat: 41.8919, lng: 12.4625 }, priceBand: "free", effort: "moderate", bestTime: "sunset", tags: ["viewpoint", "romantic", "relax"], why: "Above Trastevere — domes and rooftops catching the last light." },
      { name: "Testaccio Market & quarter", area: "Testaccio", type: "neighborhood", coords: { lat: 41.8770, lng: 12.4750 }, priceBand: "low", effort: "low", bestTime: "midday", tags: ["food", "authentic", "neighborhood", "market"], why: "Where Romans eat — the city's food soul, far from the tourist menus." },
    ],
  },
  {
    city: "Paris, France",
    aliases: ["paris", "paris france", "paris, france"],
    experiences: [
      { name: "Le Marais", area: "3rd / 4th arr.", type: "neighborhood", coords: { lat: 48.8590, lng: 2.3590 }, priceBand: "mid", effort: "low", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative", "food"], why: "Medieval lanes, falafel queues and quiet courtyards — Paris off the boulevards." },
      { name: "Musée d'Orsay", area: "7th arr.", type: "landmark", coords: { lat: 48.8600, lng: 2.3266 }, priceBand: "mid", effort: "low", bestTime: "morning", tags: ["cultural", "iconic"], why: "Impressionism in a Beaux-Arts station — more human-scaled than the Louvre." },
      { name: "Montmartre & Sacré-Cœur", area: "18th arr.", type: "neighborhood", coords: { lat: 48.8867, lng: 2.3431 }, priceBand: "free", effort: "moderate", bestTime: "early morning", tags: ["romantic", "viewpoint", "neighborhood", "cultural"], why: "The hilltop village and its white basilica — climb before the crowds." },
      { name: "Seine & Île de la Cité walk", area: "Centre", type: "walk", coords: { lat: 48.8550, lng: 2.3470 }, priceBand: "free", effort: "low", bestTime: "sunset", tags: ["walk", "romantic", "relax"], why: "Bookstalls, bridges and Notre-Dame — the city's oldest stroll." },
      { name: "Marché d'Aligre", area: "12th arr.", type: "market", coords: { lat: 48.8488, lng: 2.3783 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["food", "market", "authentic"], why: "A loud, real Parisian market — produce, cheese and a covered hall." },
      { name: "Canal Saint-Martin", area: "10th arr.", type: "neighborhood", coords: { lat: 48.8709, lng: 2.3662 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["relax", "festive", "neighborhood"], why: "Iron footbridges and canal-side cafés — young Paris at ease." },
      { name: "Père Lachaise", area: "20th arr.", type: "experience", coords: { lat: 48.8614, lng: 2.3933 }, priceBand: "free", effort: "moderate", bestTime: "afternoon", tags: ["explorative", "cultural", "spiritual"], why: "A green city of the dead — Chopin, Wilde, and quiet cobbled avenues." },
    ],
  },
  {
    city: "Amsterdam, Netherlands",
    aliases: ["amsterdam", "amsterdam netherlands", "amsterdam, netherlands"],
    experiences: [
      { name: "Jordaan", area: "Jordaan", type: "neighborhood", coords: { lat: 52.3740, lng: 4.8810 }, priceBand: "mid", effort: "low", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative"], why: "Narrow canals, brown cafés and courtyards — the city's most charming quarter." },
      { name: "Van Gogh Museum", area: "Museumkwartier", type: "landmark", coords: { lat: 52.3584, lng: 4.8811 }, priceBand: "mid", effort: "low", bestTime: "morning", tags: ["cultural", "iconic"], why: "The largest Van Gogh collection — timed tickets, first slot." },
      { name: "Canal Ring (Grachtengordel)", area: "Centrum", type: "walk", coords: { lat: 52.3680, lng: 4.8870 }, priceBand: "free", effort: "low", bestTime: "evening", tags: ["walk", "romantic", "iconic"], why: "The UNESCO canals — best on foot at dusk when the bridges light up." },
      { name: "Albert Cuyp Market", area: "De Pijp", type: "market", coords: { lat: 52.3556, lng: 4.8917 }, priceBand: "low", effort: "low", bestTime: "midday", tags: ["food", "market", "festive"], why: "Stroopwafels pressed to order and a neighborhood that eats well." },
      { name: "Vondelpark", area: "Oud-Zuid", type: "nature", coords: { lat: 52.3580, lng: 4.8686 }, priceBand: "free", effort: "low", bestTime: "afternoon", tags: ["nature", "relax", "regenerating"], why: "The city's green living room — rent a bike and drift." },
      { name: "De Pijp", area: "De Pijp", type: "neighborhood", coords: { lat: 52.3540, lng: 4.8930 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["food", "festive", "neighborhood", "authentic"], why: "Amsterdam's most multicultural dinner-and-drinks quarter." },
    ],
  },
  {
    city: "Istanbul, Turkey",
    aliases: ["istanbul", "constantinople", "istanbul turkey", "istanbul, turkey", "istanbul, türkiye"],
    experiences: [
      { name: "Hagia Sophia", area: "Sultanahmet", type: "landmark", coords: { lat: 41.0086, lng: 28.9802 }, priceBand: "low", effort: "low", bestTime: "early morning", tags: ["cultural", "spiritual", "iconic"], why: "Byzantine cathedral turned mosque — fifteen centuries under one dome." },
      { name: "Blue Mosque (Sultan Ahmed)", area: "Sultanahmet", type: "landmark", coords: { lat: 41.0054, lng: 28.9768 }, priceBand: "free", effort: "low", bestTime: "morning", tags: ["spiritual", "cultural", "iconic"], why: "Cascading domes and Iznik tiles — visit between prayer times." },
      { name: "Grand Bazaar", area: "Fatih", type: "market", coords: { lat: 41.0108, lng: 28.9680 }, priceBand: "mid", effort: "moderate", bestTime: "midday", tags: ["market", "festive", "chaotic", "authentic"], why: "Four thousand shops under vaulted ceilings — bargaining is the point." },
      { name: "Spice Bazaar & Eminönü", area: "Eminönü", type: "market", coords: { lat: 41.0166, lng: 28.9706 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["food", "market", "authentic"], why: "Saffron, lokum and the ferry docks — the city's aromatic engine room." },
      { name: "Bosphorus ferry", area: "Bosphorus", type: "experience", coords: { lat: 41.0220, lng: 29.0030 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["experience", "viewpoint", "relax", "romantic"], why: "Cross between continents for the price of a city ticket." },
      { name: "Balat & Fener", area: "Fatih", type: "neighborhood", coords: { lat: 41.0290, lng: 28.9490 }, priceBand: "free", effort: "moderate", bestTime: "afternoon", tags: ["authentic", "neighborhood", "explorative"], why: "Steep lanes of painted houses — the city's most photogenic backstreets." },
      { name: "Süleymaniye Mosque terrace", area: "Fatih", type: "viewpoint", coords: { lat: 41.0162, lng: 28.9639 }, priceBand: "free", effort: "moderate", bestTime: "sunset", tags: ["viewpoint", "spiritual", "romantic"], why: "Sinan's masterpiece and a free terrace over the Golden Horn." },
    ],
  },
  {
    city: "Athens, Greece",
    aliases: ["athens", "athina", "athens greece", "athens, greece"],
    experiences: [
      { name: "Acropolis & Parthenon", area: "Acropolis", type: "landmark", coords: { lat: 37.9715, lng: 23.7257 }, priceBand: "mid", effort: "moderate", bestTime: "early morning", tags: ["cultural", "iconic"], why: "The birthplace of the West — first entry, before the marble bakes." },
      { name: "Plaka", area: "Plaka", type: "neighborhood", coords: { lat: 37.9725, lng: 23.7300 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["authentic", "neighborhood", "food", "romantic"], why: "Neoclassical lanes under the rock — tavernas and bougainvillea." },
      { name: "Anafiotika", area: "Plaka", type: "neighborhood", coords: { lat: 37.9728, lng: 23.7270 }, priceBand: "free", effort: "moderate", bestTime: "afternoon", tags: ["authentic", "explorative", "neighborhood"], why: "A pocket of Cycladic white houses hidden on the Acropolis slope." },
      { name: "Central Market (Varvakios Agora)", area: "Omonia", type: "market", coords: { lat: 37.9824, lng: 23.7270 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["food", "market", "authentic", "chaotic"], why: "Fish, meat and spice halls — loud, real, and where cooks shop." },
      { name: "Lycabettus Hill", area: "Kolonaki", type: "viewpoint", coords: { lat: 37.9710, lng: 23.7430 }, priceBand: "low", effort: "moderate", bestTime: "sunset", tags: ["viewpoint", "romantic", "relax"], why: "The city's highest point — Acropolis and sea at golden hour." },
      { name: "Monastiraki & Psyrri", area: "Monastiraki", type: "neighborhood", coords: { lat: 37.9760, lng: 23.7256 }, priceBand: "low", effort: "low", bestTime: "evening", tags: ["festive", "food", "neighborhood", "authentic"], why: "Flea-market mornings and the city's liveliest meze-and-rooftop nights." },
    ],
  },
  {
    city: "Marrakech, Morocco",
    aliases: ["marrakech", "marrakesh", "marrakech morocco", "marrakech, morocco"],
    experiences: [
      { name: "Jemaa el-Fnaa", area: "Medina", type: "landmark", coords: { lat: 31.6258, lng: -7.9891 }, priceBand: "low", effort: "low", bestTime: "evening", tags: ["festive", "chaotic", "iconic", "food"], why: "The great square ignites at dusk — smoke, gnawa drums, food stalls." },
      { name: "Souks of the Medina", area: "Medina", type: "market", coords: { lat: 31.6295, lng: -7.9870 }, priceBand: "low", effort: "moderate", bestTime: "morning", tags: ["market", "authentic", "explorative", "chaotic"], why: "A labyrinth of dyers, metalworkers and lanterns — getting lost is the experience." },
      { name: "Bahia Palace", area: "Medina", type: "landmark", coords: { lat: 31.6218, lng: -7.9830 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["cultural", "iconic"], why: "Carved cedar, zellij and cool courtyards — 19th-century craftsmanship." },
      { name: "Jardin Majorelle & YSL", area: "Gueliz", type: "nature", coords: { lat: 31.6417, lng: -8.0033 }, priceBand: "mid", effort: "low", bestTime: "early morning", tags: ["nature", "relax", "romantic", "iconic"], why: "Cobalt-blue villa and cactus garden — book the first slot for calm." },
      { name: "Le Jardin Secret", area: "Medina", type: "nature", coords: { lat: 31.6310, lng: -7.9880 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["relax", "regenerating", "nature"], why: "A restored riad garden — shade and fountains in the medina's heart." },
      { name: "A traditional hammam", area: "Medina", type: "experience", coords: { lat: 31.6260, lng: -7.9850 }, priceBand: "mid", effort: "low", bestTime: "afternoon", tags: ["wellness", "authentic", "experience"], why: "Steam, black soap and a scrub — the local weekly ritual." },
      { name: "Atlas Mountains day trip (Imlil)", area: "High Atlas", type: "nature", coords: { lat: 31.1370, lng: -7.9190 }, priceBand: "mid", effort: "high", bestTime: "morning", tags: ["nature", "adventure", "experience"], why: "Berber villages and walnut valleys under snow peaks, 90 minutes out." },
    ],
  },
  {
    city: "Bangkok, Thailand",
    aliases: ["bangkok", "krung thep", "bangkok thailand", "bangkok, thailand"],
    experiences: [
      { name: "Wat Pho", area: "Rattanakosin", type: "landmark", coords: { lat: 13.7465, lng: 100.4927 }, priceBand: "low", effort: "low", bestTime: "early morning", tags: ["spiritual", "cultural", "iconic"], why: "The reclining Buddha and the birthplace of Thai massage." },
      { name: "Grand Palace & Wat Phra Kaew", area: "Rattanakosin", type: "landmark", coords: { lat: 13.7500, lng: 100.4915 }, priceBand: "mid", effort: "moderate", bestTime: "morning", tags: ["cultural", "iconic"], why: "Gilded spires and the Emerald Buddha — go at opening, dress covered." },
      { name: "Chinatown (Yaowarat)", area: "Samphanthawong", type: "neighborhood", coords: { lat: 13.7400, lng: 100.5100 }, priceBand: "low", effort: "moderate", bestTime: "evening", tags: ["food", "festive", "chaotic", "neighborhood"], why: "Neon and woks after dark — the city's greatest street-food run." },
      { name: "Chatuchak Weekend Market", area: "Chatuchak", type: "market", coords: { lat: 13.7997, lng: 100.5503 }, priceBand: "low", effort: "moderate", bestTime: "morning", tags: ["market", "festive", "chaotic"], why: "15,000 stalls — go early, before the heat and the crowds peak." },
      { name: "Chao Phraya express boat", area: "the river", type: "experience", coords: { lat: 13.7430, lng: 100.4880 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["experience", "viewpoint", "relax"], why: "Commuter boat past temples and warehouses — the city from the water." },
      { name: "Lumphini Park", area: "Pathum Wan", type: "nature", coords: { lat: 13.7307, lng: 100.5418 }, priceBand: "free", effort: "low", bestTime: "early morning", tags: ["nature", "relax", "regenerating"], why: "Tai-chi, monitor lizards and shade — the city exhales here at dawn." },
    ],
  },
  {
    city: "Bali, Indonesia",
    aliases: ["bali", "ubud", "bali indonesia", "bali, indonesia", "ubud, bali", "ubud, indonesia"],
    experiences: [
      { name: "Tegallalang Rice Terraces", area: "Ubud", type: "nature", coords: { lat: -8.4310, lng: 115.2780 }, priceBand: "low", effort: "moderate", bestTime: "early morning", tags: ["nature", "iconic", "regenerating"], why: "Sculpted green terraces — go at sunrise before the buses." },
      { name: "Sacred Monkey Forest", area: "Ubud", type: "nature", coords: { lat: -8.5188, lng: 115.2596 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["nature", "spiritual", "experience"], why: "Mossy temples and macaques in a jungle ravine in town." },
      { name: "Tirta Empul water temple", area: "Tampaksiring", type: "landmark", coords: { lat: -8.4156, lng: 115.3155 }, priceBand: "low", effort: "low", bestTime: "morning", tags: ["spiritual", "cultural", "wellness"], why: "A purification spring where Balinese come to bathe and pray." },
      { name: "Campuhan Ridge Walk", area: "Ubud", type: "walk", coords: { lat: -8.5050, lng: 115.2560 }, priceBand: "free", effort: "moderate", bestTime: "early morning", tags: ["walk", "nature", "regenerating"], why: "A grassy ridge above two rivers — the cool dawn stroll locals love." },
      { name: "Tanah Lot temple", area: "Tabanan", type: "viewpoint", coords: { lat: -8.6212, lng: 115.0868 }, priceBand: "low", effort: "low", bestTime: "sunset", tags: ["viewpoint", "spiritual", "romantic", "iconic"], why: "A sea temple on a tidal rock — Bali's most photographed sunset." },
      { name: "A Balinese yoga & spa morning", area: "Ubud", type: "experience", coords: { lat: -8.5069, lng: 115.2625 }, priceBand: "mid", effort: "low", bestTime: "morning", tags: ["wellness", "regenerating", "relax"], why: "Open-air yoga and a flower-bath spa — Ubud's signature reset." },
      { name: "Sidemen valley", area: "Sidemen", type: "nature", coords: { lat: -8.4670, lng: 115.4470 }, priceBand: "low", effort: "moderate", bestTime: "afternoon", tags: ["nature", "authentic", "regenerating", "explorative"], why: "Ubud's rice-terrace beauty without the crowds, under Mount Agung." },
    ],
  },
  {
    city: "Mexico City, Mexico",
    aliases: ["mexico city", "ciudad de mexico", "cdmx", "mexico city mexico", "mexico city, mexico", "ciudad de méxico"],
    experiences: [
      { name: "Centro Histórico & Zócalo", area: "Centro", type: "landmark", coords: { lat: 19.4326, lng: -99.1332 }, priceBand: "free", effort: "low", bestTime: "morning", tags: ["cultural", "iconic", "neighborhood"], why: "Aztec ruins, a baroque cathedral and Rivera murals around one vast square." },
      { name: "Coyoacán & Frida Kahlo Museum", area: "Coyoacán", type: "neighborhood", coords: { lat: 19.3550, lng: -99.1626 }, priceBand: "mid", effort: "low", bestTime: "afternoon", tags: ["authentic", "cultural", "neighborhood"], why: "Cobbled colonial streets and the Blue House — book Frida ahead." },
      { name: "Teotihuacán pyramids", area: "Teotihuacán", type: "landmark", coords: { lat: 19.6925, lng: -98.8438 }, priceBand: "mid", effort: "high", bestTime: "early morning", tags: ["cultural", "iconic", "experience"], why: "The Avenue of the Dead and Sun Pyramid — go at opening, an hour out." },
      { name: "Roma & Condesa", area: "Roma Norte", type: "neighborhood", coords: { lat: 19.4150, lng: -99.1700 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["food", "festive", "neighborhood", "authentic"], why: "Art-deco streets, leafy parks and the city's best dinner-and-mezcal scene." },
      { name: "Mercado de la Merced / San Juan", area: "Centro", type: "market", coords: { lat: 19.4250, lng: -99.1230 }, priceBand: "low", effort: "moderate", bestTime: "midday", tags: ["food", "market", "chaotic", "authentic"], why: "The city's vast food markets — chiles, moles and the real taquerías." },
      { name: "Xochimilco trajineras", area: "Xochimilco", type: "experience", coords: { lat: 19.2647, lng: -99.1031 }, priceBand: "mid", effort: "low", bestTime: "afternoon", tags: ["festive", "experience", "nature"], why: "Painted boats on ancient canals — mariachi, food and floating gardens." },
      { name: "Bosque de Chapultepec & Museo Nacional de Antropología", area: "Chapultepec", type: "landmark", coords: { lat: 19.4260, lng: -99.1860 }, priceBand: "low", effort: "moderate", bestTime: "morning", tags: ["cultural", "nature", "iconic"], why: "A huge city park and the world-class museum of Mesoamerica." },
    ],
  },
  {
    city: "Reykjavik, Iceland",
    aliases: ["reykjavik", "reykjavík", "iceland", "reykjavik iceland", "reykjavik, iceland"],
    experiences: [
      { name: "Hallgrímskirkja tower", area: "Central Reykjavik", type: "viewpoint", coords: { lat: 64.1417, lng: -21.9266 }, priceBand: "low", effort: "low", bestTime: "afternoon", tags: ["viewpoint", "iconic", "cultural"], why: "The basalt-inspired church and its tower over the colored rooftops." },
      { name: "Golden Circle (Þingvellir, Geysir, Gullfoss)", area: "Southwest Iceland", type: "experience", coords: { lat: 64.3271, lng: -20.1199 }, priceBand: "mid", effort: "moderate", bestTime: "morning", tags: ["nature", "iconic", "experience", "adventure"], why: "Continental rift, erupting geyser and a thundering waterfall in one loop." },
      { name: "Sky Lagoon", area: "Kópavogur", type: "experience", coords: { lat: 64.1185, lng: -21.9430 }, priceBand: "high", effort: "low", bestTime: "evening", tags: ["wellness", "relax", "regenerating", "romantic"], why: "An ocean-edge geothermal lagoon — quieter than the Blue Lagoon." },
      { name: "Reykjanes & Bridge Between Continents", area: "Reykjanes", type: "nature", coords: { lat: 63.8680, lng: -22.6760 }, priceBand: "free", effort: "moderate", bestTime: "afternoon", tags: ["nature", "adventure", "explorative"], why: "Lava fields, steaming earth and a footbridge across the tectonic gap." },
      { name: "Harpa & Old Harbour", area: "Waterfront", type: "walk", coords: { lat: 64.1505, lng: -21.9326 }, priceBand: "free", effort: "low", bestTime: "sunset", tags: ["walk", "relax", "viewpoint"], why: "Glass concert hall and harbour — whale-watch boats and mountain light." },
      { name: "Northern Lights hunt (in season)", area: "outside the city", type: "experience", coords: { lat: 64.1600, lng: -21.7000 }, priceBand: "mid", effort: "low", bestTime: "night", tags: ["nature", "new", "experience", "romantic"], why: "Sept–April: drive from the city glow for the aurora on clear nights." },
    ],
  },
  {
    city: "New York, USA",
    aliases: ["new york", "new york city", "nyc", "manhattan", "new york usa", "new york, usa", "new york, united states", "new york city, usa"],
    experiences: [
      { name: "Central Park", area: "Manhattan", type: "nature", coords: { lat: 40.7812, lng: -73.9665 }, priceBand: "free", effort: "low", bestTime: "morning", tags: ["nature", "relax", "iconic", "regenerating"], why: "843 acres in the middle of it all — the Ramble, the Bethesda fountain, a row on the lake." },
      { name: "The High Line", area: "Chelsea", type: "walk", coords: { lat: 40.7480, lng: -74.0048 }, priceBand: "free", effort: "low", bestTime: "afternoon", tags: ["walk", "iconic", "neighborhood"], why: "An elevated rail line turned garden walk above the West Side." },
      { name: "Brooklyn Bridge to DUMBO", area: "Brooklyn", type: "walk", coords: { lat: 40.7061, lng: -73.9969 }, priceBand: "free", effort: "moderate", bestTime: "sunset", tags: ["walk", "viewpoint", "iconic", "romantic"], why: "Walk the span at golden hour and drop into DUMBO's waterfront." },
      { name: "Greenwich Village & West Village", area: "Manhattan", type: "neighborhood", coords: { lat: 40.7336, lng: -74.0027 }, priceBand: "mid", effort: "low", bestTime: "evening", tags: ["authentic", "neighborhood", "food", "explorative"], why: "Brownstone streets, jazz cellars and the city's most walkable dinner grid." },
      { name: "The Metropolitan Museum of Art", area: "Upper East Side", type: "landmark", coords: { lat: 40.7794, lng: -73.9632 }, priceBand: "mid", effort: "moderate", bestTime: "morning", tags: ["cultural", "iconic"], why: "Five thousand years under one roof — pick two wings, not ten." },
      { name: "Chelsea Market & Lower East Side eats", area: "Manhattan", type: "market", coords: { lat: 40.7424, lng: -74.0061 }, priceBand: "mid", effort: "low", bestTime: "midday", tags: ["food", "market", "festive"], why: "An indoor food hall in a former Nabisco factory — then graze downtown." },
      { name: "Top of the Rock", area: "Midtown", type: "viewpoint", coords: { lat: 40.7593, lng: -73.9794 }, priceBand: "high", effort: "low", bestTime: "sunset", tags: ["viewpoint", "iconic", "romantic"], why: "The skyline view that includes the Empire State Building — book sunset." },
    ],
  },
];

// ─── LOOKUP ─────────────────────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")                 // split accents into base + combining marks
    .replace(/[^a-z0-9 ,]/g, "")      // drop the combining marks (and any punctuation)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find the curated bank for a destination name like "Kyoto, Japan" or "Ubud, Bali".
 * Matches on the city part (before the comma) and on declared aliases. Returns
 * null when we have no curated data — caller falls back to default generation.
 */
export function getExperienceBank(destinationName: string): DestinationBank | null {
  if (!destinationName) return null;
  const full = norm(destinationName);
  const cityPart = norm(destinationName.split(",")[0] ?? "");
  for (const bank of BANKS) {
    for (const alias of bank.aliases) {
      const a = norm(alias);
      if (full === a || cityPart === a || full.includes(a) || (cityPart && a.includes(cityPart) && cityPart.length >= 4)) {
        return bank;
      }
    }
  }
  return null;
}

/**
 * Render the grounding block for the itinerary prompt. Names + area + type + why
 * + tags only — coordinates are intentionally omitted so the runtime geocoder
 * resolves pins by name (avoids propagating any imperfect coordinate). `lang`
 * keeps the framing line in the user's language; the anchor names stay as-is.
 */
export function formatExperienceBankBlock(bank: DestinationBank, lang: string): string {
  const intro = lang === "it"
    ? `ANCORE LOCALI VERIFICATE — ${bank.city}`
    : `VERIFIED LOCAL ANCHORS — ${bank.city}`;
  const rule = lang === "it"
    ? `Questi sono luoghi REALI e duraturi, verificati. Costruisci gli slot mattina/pomeriggio/esperienza e i mapPoints PRIMA da questa lista, scegliendo le ancore i cui tag combaciano con i chip dominanti del profilo e sequenziandole per zona (rispetta il limite "lunghi trasferimenti"). Usa i NOMI ESATTI qui sotto. Puoi aggiungere ristoranti/caffè specifici (non elencati, coerenti con FOOD_PREF e budget) e andare oltre la lista SOLO quando il profilo richiede qualcosa che non è coperto — ma non sostituire MAI un'ancora reale con un luogo inventato.`
    : `These are REAL, durable, verified places. Build the morning/afternoon/experience slots and mapPoints FIRST from this list, choosing the anchors whose tags match the profile's dominant chips and sequencing them by area (respect the "long transits" limit). Use the EXACT names below. You MAY add specific restaurants/cafés (not listed, matched to FOOD_PREF + budget) and go beyond the list ONLY when the profile needs something not covered — but NEVER replace a real anchor with an invented place.`;
  const lines = bank.experiences.map(
    (e) => `- ${e.name} — ${e.type}, ${e.area}; best ${e.bestTime}; ${e.priceBand} cost, ${e.effort} effort; tags: ${e.tags.join(", ")}. ${e.why}`
  );
  return `\n═══════════════════════════════════════\n${intro}\n═══════════════════════════════════════\n${rule}\n\n${lines.join("\n")}\n`;
}

// ─── LIVE TIER (any destination, via OpenStreetMap / Wikidata) ─────────────────
// For destinations we haven't hand-curated, fetch REAL, notable places live so the
// model still grounds on existing names instead of inventing them. Sources are free
// and keyless: Nominatim (geocode) + Overpass (POIs tagged with wikidata = notable).
// Results are cached in-memory per destination; any failure/timeout → "" (the caller
// falls back to default behavior). Coordinates are not injected (geocoder resolves pins).

interface LiveAnchor { name: string; type: ExpType | "attraction" | "museum"; notable: boolean; }
const liveCache = new Map<string, { block: string; ts: number }>();
const LIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeCenter(name: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1&accept-language=en`;
  const d = await fetchWithTimeout(url, 6000, { headers: { "User-Agent": "MindRoute/1.0 (itinerary grounding)" } });
  if (Array.isArray(d) && d[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  return null;
}

async function fetchLiveAnchors(name: string): Promise<LiveAnchor[]> {
  const center = await geocodeCenter(name);
  if (!center) return [];
  const { lat, lng } = center;
  // Broad pull of real sights within ~14km. We do NOT require a wikidata tag (too
  // sparse in many cities) — instead we keep all named heritage/tourism anchors and
  // rank the wikidata/wikipedia-tagged ones first (notable, and it also pushes noise
  // like individual zoo exhibits to the bottom where it gets cut).
  const q = `[out:json][timeout:25];
(
  node(around:14000,${lat},${lng})[tourism~"^(attraction|museum|viewpoint|gallery|theme_park|artwork)$"][name];
  way(around:14000,${lat},${lng})[tourism~"^(attraction|museum|viewpoint|gallery|theme_park)$"][name];
  node(around:14000,${lat},${lng})[historic~"^(monument|memorial|castle|fort|ruins|archaeological_site|city_gate|tower|palace|temple|monastery|church|shrine|aqueduct)$"][name];
  way(around:14000,${lat},${lng})[historic~"^(monument|memorial|castle|fort|ruins|archaeological_site|city_gate|tower|palace|temple|monastery|church|shrine|aqueduct)$"][name];
  way(around:14000,${lat},${lng})[leisure=park][name][wikidata];
);
out center 200;`;
  const d = await fetchWithTimeout("https://overpass-api.de/api/interpreter", 15000, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "MindRoute/1.0 (itinerary grounding)",
      "Accept": "application/json",
    },
    body: "data=" + encodeURIComponent(q),
  });
  const els: any[] = d?.elements;
  if (!Array.isArray(els)) return [];
  const seen = new Set<string>();
  const all: LiveAnchor[] = [];
  for (const e of els) {
    const tags = e.tags ?? {};
    const nm: string = (tags["name:en"] || tags.name || "").trim();
    if (!nm || nm.length < 3 || seen.has(nm.toLowerCase())) continue;
    seen.add(nm.toLowerCase());
    let type: LiveAnchor["type"] = "landmark";
    if (tags.tourism === "viewpoint") type = "viewpoint";
    else if (tags.tourism === "museum" || tags.tourism === "gallery") type = "museum";
    else if (tags.leisure === "park") type = "nature";
    else if (tags.historic) type = "landmark";
    else if (tags.tourism) type = "attraction";
    all.push({ name: nm, type, notable: !!(tags.wikidata || tags.wikipedia) });
  }
  // Notable (wikidata/wikipedia) first; keep up to 16.
  all.sort((a, b) => Number(b.notable) - Number(a.notable));
  return all.slice(0, 16);
}

function formatLiveBlock(dest: string, anchors: LiveAnchor[], lang: string): string {
  const intro = lang === "it"
    ? `ANCORE LOCALI VERIFICATE — ${dest}`
    : `VERIFIED LOCAL ANCHORS — ${dest}`;
  const rule = lang === "it"
    ? `Questi sono luoghi REALI ed esistenti (fonte: OpenStreetMap/Wikidata) a ${dest}. Usa i NOMI ESATTI qui sotto per gli slot mattina/pomeriggio/esperienza e i mapPoints, scegliendo quelli coerenti col profilo e sequenziandoli per zona (rispetta il limite "lunghi trasferimenti"). NON inventare landmark che non esistono. Puoi aggiungere ristoranti/caffè coerenti con FOOD_PREF e budget (non elencati qui).`
    : `These are REAL, existing places (source: OpenStreetMap/Wikidata) in ${dest}. Use the EXACT names below for the morning/afternoon/experience slots and mapPoints, choosing those that fit the profile and sequencing by area (respect the "long transits" limit). Do NOT invent landmarks that don't exist. You MAY add restaurants/cafés matched to FOOD_PREF + budget (not listed here).`;
  const lines = anchors.map((a) => `- ${a.name} (${a.type})`);
  return `\n═══════════════════════════════════════\n${intro}\n═══════════════════════════════════════\n${rule}\n\n${lines.join("\n")}\n`;
}

/**
 * Resolve a grounding block for ANY destination:
 *   1. curated bank (premium, rich tags + why) when we have it;
 *   2. otherwise live, real anchors from OSM/Wikidata (cached);
 *   3. otherwise "" → caller keeps current behavior.
 * Always safe: never throws, returns "" on failure.
 */
export async function resolveGroundingBlock(destinationName: string, lang: string): Promise<string> {
  if (!destinationName) return "";
  const curated = getExperienceBank(destinationName);
  if (curated) return formatExperienceBankBlock(curated, lang);

  const key = norm(destinationName);
  if (!key) return "";
  const hit = liveCache.get(key);
  if (hit && Date.now() - hit.ts < LIVE_TTL_MS) return hit.block;

  try {
    const anchors = await fetchLiveAnchors(destinationName);
    const block = anchors.length >= 4 ? formatLiveBlock(destinationName, anchors, lang) : "";
    liveCache.set(key, { block, ts: Date.now() });
    return block;
  } catch {
    liveCache.set(key, { block: "", ts: Date.now() });
    return "";
  }
}
