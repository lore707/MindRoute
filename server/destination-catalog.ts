// ─────────────────────────────────────────────────────────────────────────────
// MindRoute Destination Catalog v2.0
// 20+ destinations organized by psychological profile tags
// Itineraries with contextual affiliate links
// ─────────────────────────────────────────────────────────────────────────────

export type PrimaryTag = "recovery" | "explorer" | "seeker" | "social" | "romantic";
export type BudgetTier = "low" | "medium" | "high" | "unlimited";
export type DurationFit = "weekend" | "week" | "10-14" | "long";
export type CompanionFit = "solo" | "couple" | "friends" | "family";

export interface AffiliateLinks {
  booking?: string;
  tripadvisor?: string;
  getyourguide?: string;
  viator?: string;
  skyscanner?: string;
  airbnb?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  morning: string;
  lunch: string;
  afternoon: string;
  evening: string;
  affiliateLinks: AffiliateLinks;
}

export interface ProfiledItinerary {
  profileTag: PrimaryTag;
  days: ItineraryDay[];
  budgetSummary: string;
  packingList: string;
  bestTime: string;
  gettingThere: string;
  closingMessage: string;
  topAffiliateLinks: AffiliateLinks;
}

export interface CatalogDestination {
  name: string;
  country: string;
  region: "europe" | "asia" | "americas" | "africa" | "oceania" | "middleeast";
  primaryTags: PrimaryTag[];
  keywords: string[];
  budgetTier: BudgetTier[];
  seasons: string[];
  companionFit: CompanionFit[];
  durationFit: DurationFit[];
  imageUrl: string;
  whyYoursTemplates: Record<PrimaryTag, string>;
  experiencePreview: string;
  practicalInfo: string;
  itineraries: Partial<Record<PrimaryTag, ProfiledItinerary>>;
  // Legacy fields
  whyYours?: string;
  itinerary?: any;
  profile?: any;
}

// ─── AFFILIATE LINK BUILDER ───────────────────────────────────────────────────
const BOOKING_ID = "YOUR_BOOKING_ID";
const GYG_ID = "YOUR_GYG_ID";

function bookingLink(city: string, budget: string = "medium"): string {
  const priceMap: Record<string, string> = { low: "1;2", medium: "3;4", high: "4;5", unlimited: "5" };
  const stars = priceMap[budget] || "3;4";
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&nflt=class%3D${stars}&aid=${BOOKING_ID}`;
}
function gygLink(city: string): string {
  return `https://www.getyourguide.com/${city.toLowerCase().replace(/[^a-z]/g, "-")}/?partner_id=${GYG_ID}`;
}
function tripadvisorLink(city: string): string {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(city)}`;
}
function skyscannerLink(iata: string): string {
  return `https://www.skyscanner.net/transport/flights/any/${iata}/`;
}
function airbnbLink(city: string): string {
  return `https://www.airbnb.com/s/${encodeURIComponent(city)}/homes`;
}

const EMPTY_TEMPLATES: Record<PrimaryTag, string> = {
  recovery: "", explorer: "", seeker: "", social: "", romantic: ""
};

// ─── CATALOG ─────────────────────────────────────────────────────────────────
export const destinationCatalog: CatalogDestination[] = [

  // ═══ RECOVERY ═══
  {
    name: "Azzorre, Portogallo",
    country: "Portugal", region: "europe",
    primaryTags: ["recovery", "seeker"],
    keywords: ["volcanic", "silence", "ocean", "thermal", "remote", "peaceful", "recharge", "green", "whale watching", "authentic", "uncrowded", "healing", "elemental", "slow", "nature"],
    budgetTier: ["medium", "high"], seasons: ["spring", "summer", "autumn", "apr", "may", "jun", "jul", "aug", "sep", "oct"],
    companionFit: ["solo", "couple"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      recovery: "Perché hai bisogno di un posto che non ti chiede nulla. Le Azzorre sono nove isole vulcaniche nell'Atlantico — lontane da tutto, vicine a qualcosa di essenziale.",
      seeker: "Perché la natura qui ha una forza primordiale. Laghi nei crateri, balene nell'oceano, silenzi che durano ore.",
      explorer: "Perché pochi ci vanno ancora. Ogni isola è un mondo — Faial, Pico, Flores — senza folle turistiche.",
      social: "Perché la gente delle Azzorre ha quella calda umanità delle isole lontane.",
      romantic: "Perché c'è qualcosa di profondamente romantico in un posto dove il mondo finisce e l'oceano inizia."
    },
    experiencePreview: "Nuotare tra delfini, camminare sui bordi di crateri vulcanici, immergersi in piscine termali naturali nella roccia lavica.",
    practicalInfo: "Voli diretti da Lisbona e molte città europee. Clima mite tutto l'anno. Auto necessaria. Sicuro e poco turistico.",
    itineraries: {
      recovery: {
        profileTag: "recovery",
        days: [
          {
            dayNumber: 1, title: "L'isola ti accoglie senza fretta",
            morning: "Atterri a São Miguel. Niente pianificazione. Guida verso Nordeste, siediti su una scogliera e guarda l'Atlantico per quanto vuoi.",
            lunch: "Cozido das Furnas — uno stufato cotto sottoterra dalla calore vulcanica. Aspetti due ore. Non ha importanza.",
            afternoon: "Piscine termali di Terra Nostra. Acqua ferrosa color ruggine, circondata da felci giganti. Ci stai dentro finché vuoi.",
            evening: "Cena in una tasca locale. Vino dell'isola, pesce del giorno, nessun menù turistico.",
            affiliateLinks: { booking: bookingLink("São Miguel Azores", "medium"), getyourguide: gygLink("azores"), tripadvisor: tripadvisorLink("Furnas Azores") }
          },
          {
            dayNumber: 2, title: "Il cratere e il silenzio",
            morning: "Sete Cidades — il lago verde smeraldo dentro al cratere. Arrivi presto. Stai fermo e ascolti il niente.",
            lunch: "Sandwich di queijo São Jorge al bordo del lago.",
            afternoon: "Whale watching nell'Atlantico. Non è un'attrazione — è un incontro.",
            evening: "Ritorno al cottage. Il suono delle onde ti addormenta.",
            affiliateLinks: { getyourguide: gygLink("sao-miguel-azores"), booking: bookingLink("Sete Cidades", "medium") }
          },
          {
            dayNumber: 3, title: "L'ultima mattina lenta",
            morning: "Miradouro da Boca do Inferno alle 7. Il sole nasce sull'oceano.",
            lunch: "Lapas grelhadas — patelle grigliate con burro e limone.",
            afternoon: "Giardino Terra Nostra ancora una volta, tra le camelia e le magnolie centenarie.",
            evening: "L'ultimo tramonto sull'Atlantico. Porti a casa una certa lentezza interna.",
            affiliateLinks: { tripadvisor: tripadvisorLink("Terra Nostra Garden Azores"), booking: bookingLink("Furnas Azores", "medium") }
          }
        ],
        budgetSummary: "€800–1.100 totale escl. voli. Hotel boutique €70–110/notte, pasti €20–35/giorno, whale watching €55, auto €30/giorno.",
        packingList: "Giacca impermeabile, scarpe da trekking, costume, crema solare, un libro.",
        bestTime: "Maggio–Ottobre. Poco affollato rispetto ad altre mete europee.",
        gettingThere: "Voli diretti da Lisbona (2h), Londra, Amsterdam. Aeroporto di Ponta Delgada a 3 km dalla città.",
        closingMessage: "Le Azzorre non ti chiedono di fare. Ti chiedono solo di essere.",
        topAffiliateLinks: { booking: bookingLink("Azores", "medium"), getyourguide: gygLink("azores"), skyscanner: skyscannerLink("PDL") }
      }
    }
  },

  {
    name: "Alentejo, Portogallo",
    country: "Portugal", region: "europe",
    primaryTags: ["recovery", "romantic"],
    keywords: ["slow", "wine", "cork", "plains", "silence", "rural", "authentic", "olive", "hidden", "uncrowded", "pastoral", "whitewashed", "warmth", "gentle", "local"],
    budgetTier: ["low", "medium", "high"], seasons: ["spring", "autumn", "winter", "mar", "apr", "may", "sep", "oct", "nov", "feb"],
    companionFit: ["solo", "couple"], durationFit: ["weekend", "week"],
    imageUrl: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      recovery: "Perché l'Alentejo è il posto dove il tempo scorre più lento d'Europa. Pianure infinite, villaggi bianchi, vino fatto a mano.",
      romantic: "Perché certe sere — vino locale, tramonto sulle pianure — hanno la qualità dei ricordi che si tengono per sempre.",
      seeker: "Perché qui la vita rurale portoghese è ancora quella vera. Nessuna performance turistica.",
      explorer: "Perché pochi sanno che l'Alentejo esiste. È la regione più grande e meno visitata del Portogallo.",
      social: "Perché i portoghesi dell'Alentejo hanno un'ospitalità genuina e disarmante."
    },
    experiencePreview: "Dormire in una quinta tra gli ulivi, bere vino Alentejano in cantina, perdersi in villaggi medievali silenziosi.",
    practicalInfo: "1h30 da Lisbona in auto. Molto economico. Estate calda (40°C), primavera e autunno perfetti.",
    itineraries: {
      recovery: {
        profileTag: "recovery",
        days: [
          {
            dayNumber: 1, title: "Il silenzio della pianura",
            morning: "Partenza da Lisbona. Entri in Alentejo e il paesaggio cambia — sugheri, ulivi, pianure ocra. Nessuna fretta.",
            lunch: "Évora — açorda (zuppa di pane) e carne de porco à alentejana.",
            afternoon: "Cromeleque dos Almendres — cerchio di megaliti preistorici nei campi. Più antico di Stonehenge. Probabilmente sarai solo.",
            evening: "Check-in in una quinta tra gli ulivi. Aperitivo sul terrazzo con il tramonto arancione.",
            affiliateLinks: { booking: bookingLink("Évora Alentejo", "medium"), airbnb: airbnbLink("Alentejo Portugal"), tripadvisor: tripadvisorLink("Évora Portugal") }
          },
          {
            dayNumber: 2, title: "Vino, lentezza, verità",
            morning: "Cantina artigianale. Il vignaiolo ti mostra le vigne, ti spiega come il terreno cambia il sapore.",
            lunch: "Picnic nei campi con formaggio de ovelha, pão alentejano e vinho.",
            afternoon: "Mértola — villaggio medievale sul fiume Guadiana. Sembra fuori dal tempo.",
            evening: "Cena alla quinta con prodotti dell'orto. Il proprietario siede con te.",
            affiliateLinks: { getyourguide: gygLink("alentejo-wine-tour"), booking: bookingLink("Mértola Portugal", "low") }
          }
        ],
        budgetSummary: "€400–650 totale escl. voli. Quinta €60–90/notte, pasti €12–20/giorno, auto €25/giorno.",
        packingList: "Abiti leggeri o strati per la primavera, scarpe per i borghi, borsa per i vini.",
        bestTime: "Marzo–Maggio (verde) o Settembre–Novembre (vendemmia).",
        gettingThere: "Vola a Lisbona, noleggia auto. 1h30 fino a Évora.",
        closingMessage: "L'Alentejo ti insegna che rallentare non è perdere tempo — è trovarlo.",
        topAffiliateLinks: { booking: bookingLink("Alentejo", "medium"), airbnb: airbnbLink("Alentejo"), skyscanner: skyscannerLink("LIS") }
      }
    }
  },

  {
    name: "Isole Lofoten, Norvegia",
    country: "Norway", region: "europe",
    primaryTags: ["recovery", "explorer"],
    keywords: ["fjords", "silence", "aurora", "fishing", "raw", "wild", "remote", "midnight sun", "mountain", "nordic", "elemental", "photography", "dramatic", "vast", "sea"],
    budgetTier: ["high", "unlimited"], seasons: ["winter", "summer", "jun", "jul", "aug", "jan", "feb", "mar"],
    companionFit: ["solo", "couple"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      recovery: "Perché le Lofoten ti rimettono in scala. Montagne dal mare, villaggi rossi contro la neve, silenzi che pesano. Ti fanno sentire piccoli nel modo migliore.",
      explorer: "Perché le Lofoten sono fisicamente raggiungibili ma emotivamente remote. Strade che finiscono nel nulla, un paesaggio inaspettato.",
      romantic: "Perché in estate il sole non tramonta mai e in inverno il cielo si riempie di aurora. Entrambe le cose rendono ogni momento speciale.",
      seeker: "Perché c'è qualcosa di meditativo nell'aria delle Lofoten. La luce cambia ogni ora.",
      social: "Perché i locali delle Lofoten hanno quella sincerità dei posti davvero lontani."
    },
    experiencePreview: "Dormire in un rorbu (capanna da pesca) sul mare, pescare il merluzzo all'alba, vedere l'aurora boreale sopra i fiordi.",
    practicalInfo: "Costoso ma unico. Auto necessaria. Estate: sole di mezzanotte. Inverno: aurora. Voli per Bodø o Svolvær.",
    itineraries: {
      recovery: {
        profileTag: "recovery",
        days: [
          {
            dayNumber: 1, title: "L'arrivo nel paesaggio impossibile",
            morning: "Traghetto da Bodø per Moskenes (3h30). Siediti sul ponte. Le montagne emergono dall'acqua.",
            lunch: "Klippfisk (baccalà) in un piccolo ristorante a Å — il villaggio alla fine della strada.",
            afternoon: "Reine — il villaggio più fotografato della Norvegia. Stai e guarda l'acqua cambiare colore.",
            evening: "Check-in nel rorbu sul mare. Il suono delle onde ti addormenta.",
            affiliateLinks: { booking: bookingLink("Reine Lofoten", "high"), airbnb: airbnbLink("Lofoten Norway"), tripadvisor: tripadvisorLink("Lofoten Islands Norway") }
          },
          {
            dayNumber: 2, title: "Il sole e il silenzio",
            morning: "Hike al Reinebringen — 1 ora di salita, vista sulle isole. Sei quasi solo.",
            lunch: "Pane, salmone affumicato, caffè in termos.",
            afternoon: "Spiaggia di Kvalvika — raggiungibile solo a piedi. Sabbia bianca, montagne, nessun servizio.",
            evening: "Cena nel rorbu con pesce comprato dai pescatori.",
            affiliateLinks: { getyourguide: gygLink("lofoten-hiking"), tripadvisor: tripadvisorLink("Kvalvika Beach Lofoten") }
          }
        ],
        budgetSummary: "€1.400–2.000 totale escl. voli. Rorbu €120–180/notte, pasti €40–60/giorno, auto €70/giorno.",
        packingList: "Strati termici, impermeabile tecnico, scarpe da trekking impermeabili, guanti, binocolo.",
        bestTime: "Giugno–Agosto per sole di mezzanotte. Gennaio–Marzo per aurora boreale.",
        gettingThere: "Vola a Bodø via Oslo + traghetto 3h30, oppure direttamente a Svolvær.",
        closingMessage: "Nelle Lofoten il silenzio non è assenza di rumore — è presenza di qualcosa di più grande.",
        topAffiliateLinks: { booking: bookingLink("Lofoten", "high"), getyourguide: gygLink("lofoten"), skyscanner: skyscannerLink("BOO") }
      }
    }
  },

  {
    name: "Madeira, Portogallo",
    country: "Portugal", region: "europe",
    primaryTags: ["recovery", "romantic"],
    keywords: ["flowers", "levada", "mild", "ocean", "nature", "hiking", "slow", "lush", "subtropical", "wine", "cliffs", "peaceful", "escape", "green", "eternal spring"],
    budgetTier: ["medium", "high"], seasons: ["jan", "feb", "mar", "apr", "may", "oct", "nov", "dec", "spring", "autumn", "winter"],
    companionFit: ["solo", "couple", "family"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1548603986-4a7b7eddec0e?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      recovery: "Perché Madeira è un'isola che non conosce stagioni brutte. 22°C tutto l'anno, fiori ovunque, levadas nella foresta. Il corpo si rilassa da solo.",
      romantic: "Perché c'è qualcosa di profondamente romantico in un'isola con scogliere sull'oceano, vino al tramonto e una lentezza naturale.",
      explorer: "Perché l'interno è foresta primaria UNESCO. Le levadas ti portano in posti inaccessibili in altro modo.",
      seeker: "Perché camminare nelle levadas — canali del 1400 scavati nella roccia — è una meditazione in movimento.",
      social: "Perché Funchal ha una scena gastronomica sorprendente per la sua dimensione."
    },
    experiencePreview: "Camminare sulle levadas attraverso foreste millenarie, bere Poncha con i pescatori, guardare il tramonto da Cabo Girão.",
    practicalInfo: "Voli diretti da tutta Europa. Clima perfetto tutto l'anno. Auto consigliata. Ottimo senza jet lag.",
    itineraries: {
      recovery: {
        profileTag: "recovery",
        days: [
          {
            dayNumber: 1, title: "L'isola che profuma di fiori",
            morning: "Mercado dos Lavradores — fiori tropicali, frutta esotica. Lento giro senza meta.",
            lunch: "Bolo do caco (pane caldo) con aglio e burro, espetada madeirense.",
            afternoon: "Monte Palace Tropical Garden — giardino botanico sulla collina con piante da tutto il mondo.",
            evening: "Poncha sul lungomare. Tramonto sull'Atlantico.",
            affiliateLinks: { booking: bookingLink("Funchal Madeira", "medium"), getyourguide: gygLink("madeira"), tripadvisor: tripadvisorLink("Funchal Madeira") }
          },
          {
            dayNumber: 2, title: "La foresta e il silenzio verde",
            morning: "Levada do Caldeirão Verde — 4 ore nella Floresta Laurissilva. Tunnel nella roccia, felci giganti, acqua accanto ai passi.",
            lunch: "Sandwich seduto sui gradini di pietra con i picchi tra le nuvole.",
            afternoon: "Piscina naturale di Porto Moniz — vasche di lava nera riempite dall'oceano.",
            evening: "Cena a lume di candela a Câmara de Lobos, il piccolo porto dei pescatori.",
            affiliateLinks: { getyourguide: gygLink("madeira-levada-walk"), tripadvisor: tripadvisorLink("Porto Moniz Natural Pools"), booking: bookingLink("Câmara de Lobos", "medium") }
          }
        ],
        budgetSummary: "€700–1.000 totale escl. voli. Hotel boutique €80–120/notte, pasti €20–30/giorno, auto €25/giorno.",
        packingList: "Scarpe da trekking impermeabili, strati leggeri, impermeabile tascabile, crema solare.",
        bestTime: "Tutto l'anno. Aprile–Maggio per la Festa dos Flores.",
        gettingThere: "Voli diretti da tutta Europa a Funchal (FNC).",
        closingMessage: "Madeira è quella rara cosa — un posto bello che non ti chiede niente in cambio.",
        topAffiliateLinks: { booking: bookingLink("Madeira", "medium"), getyourguide: gygLink("madeira"), skyscanner: skyscannerLink("FNC") }
      }
    }
  },

  // ═══ EXPLORER ═══
  {
    name: "Georgia, Caucaso",
    country: "Georgia", region: "europe",
    primaryTags: ["explorer", "seeker", "social"],
    keywords: ["wine", "mountains", "ancient", "hospitality", "offbeat", "discovery", "caucasus", "unique", "authentic", "fortress", "chacha", "warm people", "unexpected", "culture", "church"],
    budgetTier: ["low", "medium"], seasons: ["spring", "autumn", "summer", "apr", "may", "jun", "sep", "oct"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1565008576549-57569a49f9ca?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      explorer: "Perché la Georgia è ancora uno di quei posti dove arrivi e pensi 'come non ne sapevo niente'. Tbilisi è affascinante, le montagne mozzafiato, tutto costa quasi niente.",
      seeker: "Perché la Georgia è la culla del vino — 8.000 anni in anfore di terracotta. E le chiese rupestri nelle montagne hanno una spiritualità antica.",
      social: "Perché i georgiani praticano il tamada — l'arte del brindisi come rituale. Ti sentirai il benvenuto più benvenuto del mondo.",
      recovery: "Perché Tbilisi ha un ritmo lento e un'atmosfera onirica. Bagni sulfurei sotterranei, caffè nascosti nei cortili.",
      romantic: "Perché il vecchio Tbilisi — balconi in legno, vicoli, candele — è una delle città più romantiche che non conosci."
    },
    experiencePreview: "Bere vino arancione dalla kvevri, fare il bagno nei solfurei di Abanotubani, guardare il Caucaso nevoso da un monastero del 1000 d.C.",
    practicalInfo: "Molto economico. Visa-free per europei. Sicuro. Inglese diffuso nelle città.",
    itineraries: {
      explorer: {
        profileTag: "explorer",
        days: [
          {
            dayNumber: 1, title: "Tbilisi — la città che non ti aspetti",
            morning: "Abanotubani — bagni sulfurei sotterranei con cupole a forma di alveare. Un bagno privato. L'acqua scioglie tutto.",
            lunch: "Hinkali (ravioli di brodo e carne). Si mangiano con le mani.",
            afternoon: "Fortezza di Narikala sulla collina. Tbilisi si distende sotto come un tappeto di tetti arancioni.",
            evening: "Vino arancione georgiano al Fabrika (ex fabbrica riconvertita in hub creativo). Giovane, autentico.",
            affiliateLinks: { booking: bookingLink("Tbilisi Georgia", "low"), getyourguide: gygLink("tbilisi"), tripadvisor: tripadvisorLink("Tbilisi Georgia") }
          },
          {
            dayNumber: 2, title: "Il monastero e la montagna",
            morning: "Drive a Kazbegi (2h30). Il paesaggio diventa surreale.",
            lunch: "Khinkali con carne di montagna nel villaggio.",
            afternoon: "Monastero di Gergeti a 2.170m con il Kazbek (5047m) alle spalle. 2 ore di cammino. Vale ogni passo.",
            evening: "Ritorno a Tbilisi. Cena con churchkhela e chacha.",
            affiliateLinks: { getyourguide: gygLink("kazbegi-day-trip"), tripadvisor: tripadvisorLink("Gergeti Trinity Church Georgia") }
          },
          {
            dayNumber: 3, title: "Kakheti — la culla del vino",
            morning: "Cantina artigianale con vino kvevri — fermentato nelle anfore sotterrate per mesi.",
            lunch: "Supra (pranzo georgiano tradizionale) a casa di una famiglia. Venti piatti portati da una nonna.",
            afternoon: "Sighnaghi — città murata sulle colline con vista sull'Alazani Valley.",
            evening: "Tramonto sulle vigne con il vino appena comprato.",
            affiliateLinks: { getyourguide: gygLink("kakheti-wine-tour"), tripadvisor: tripadvisorLink("Sighnaghi Georgia"), booking: bookingLink("Sighnaghi Georgia", "low") }
          }
        ],
        budgetSummary: "€400–600 totale escl. voli. Hotel €30–50/notte, pasti €8–15/giorno, tour Kazbegi €40.",
        packingList: "Scarpe da trekking, giacca per la montagna, vestiti rispettosi per i monasteri.",
        bestTime: "Aprile–Giugno o Settembre–Ottobre.",
        gettingThere: "Voli diretti da molte città europee a Tbilisi (TBS).",
        closingMessage: "La Georgia ti dà il senso che il mondo è più grande e più interessante di quanto pensavi.",
        topAffiliateLinks: { booking: bookingLink("Tbilisi", "low"), getyourguide: gygLink("tbilisi"), skyscanner: skyscannerLink("TBS") }
      }
    }
  },

  {
    name: "Albania",
    country: "Albania", region: "europe",
    primaryTags: ["explorer", "social"],
    keywords: ["undiscovered", "riviera", "mountains", "cheap", "authentic", "offbeat", "ruins", "communism", "contrast", "beach", "bunkers", "wild", "emerging", "raw", "turchese"],
    budgetTier: ["low", "medium"], seasons: ["spring", "summer", "autumn", "may", "jun", "jul", "aug", "sep", "oct"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      explorer: "Perché l'Albania è l'ultimo segreto d'Europa. Riviera turchese senza turismo di massa, montagne selvagge, storia che nessuno conosce. Tutto a prezzi incredibili.",
      social: "Perché gli albanesi sono tra le persone più ospitali d'Europa — il codice Kanun non nega mai il pane a uno straniero.",
      recovery: "Perché Berat — la 'città delle mille finestre' — è fuori dal tempo. Nessuna folla, nessuna fretta.",
      seeker: "Perché l'Albania ha una storia spirituale unica — Islam, Ortodossia e Cattolicesimo che hanno creato una tolleranza rara.",
      romantic: "Perché la Riviera Albanese è quello che la Costiera Amalfitana era 30 anni fa."
    },
    experiencePreview: "Nuotare in acque turchesi deserte, mangiare pesce fresco a Himara, camminare tra le case ottomane di Berat.",
    practicalInfo: "Uno dei paesi più economici d'Europa. Sicuro. Euro accettato. Auto consigliata per la riviera.",
    itineraries: {
      explorer: {
        profileTag: "explorer",
        days: [
          {
            dayNumber: 1, title: "Tirana — la capitale più sorprendente d'Europa",
            morning: "Blloku — ex quartiere dell'élite comunista, ora pieno di caffè e street art.",
            lunch: "Byrek (torta salata con formaggio). Costa €1.",
            afternoon: "Bunk'Art — bunker nucleare di Enver Hoxha trasformato in museo. 5 livelli sottoterra. Surreale.",
            evening: "Aperitivo con vista sul castello. Birra Korça €1,50.",
            affiliateLinks: { booking: bookingLink("Tirana Albania", "low"), getyourguide: gygLink("tirana"), tripadvisor: tripadvisorLink("Tirana Albania") }
          },
          {
            dayNumber: 2, title: "Berat — la città fuori dal tempo",
            morning: "Drive a Berat (2h30). La città delle mille finestre appare da lontano.",
            lunch: "Tavë kosi (agnello al forno con yogurt) sotto il castello.",
            afternoon: "Castello di Berat — ancora abitato. Case e chiese bizantine con la gente che vive.",
            evening: "Quartiere Mangalem illuminato. Una delle viste più belle dei Balcani.",
            affiliateLinks: { booking: bookingLink("Berat Albania", "low"), getyourguide: gygLink("berat-albania"), tripadvisor: tripadvisorLink("Berat Albania") }
          },
          {
            dayNumber: 3, title: "La Riviera",
            morning: "Drive verso Himara. La strada lungo la riviera è una delle più belle d'Europa.",
            lunch: "Pesce freschissimo a Himara. Il cameriere porta il pesce crudo per scegliere.",
            afternoon: "Spiaggia di Gjipe — canyon che finisce nel mare. Solo a piedi (40 min). Probabilmente ci sei solo tu.",
            evening: "Tramonto con rakı sulla terrazza che guarda l'Ionio.",
            affiliateLinks: { booking: bookingLink("Himara Albania", "low"), tripadvisor: tripadvisorLink("Albanian Riviera") }
          }
        ],
        budgetSummary: "€300–450 totale escl. voli. Hotel €20–40/notte, pasti €5–12/giorno, auto €20/giorno.",
        packingList: "Leggero e versatile. Scarpe per il castello, costume per la riviera, qualche cash.",
        bestTime: "Maggio–Giugno o Settembre per riviera senza folla.",
        gettingThere: "Voli per Tirana (TIA) o traghetto da Bari/Ancona a Durazzo.",
        closingMessage: "L'Albania è quello che la gente dice quando dice 'vai prima che cambi'. Ascoltali questa volta.",
        topAffiliateLinks: { booking: bookingLink("Albania", "low"), getyourguide: gygLink("tirana"), skyscanner: skyscannerLink("TIA") }
      }
    }
  },

  {
    name: "Uzbekistan",
    country: "Uzbekistan", region: "middleeast",
    primaryTags: ["explorer", "seeker"],
    keywords: ["silk road", "ancient", "islamic architecture", "mosaics", "blue tiles", "samarcanda", "caravans", "desert", "oasis", "history", "stunning", "offbeat", "unique", "unesco"],
    budgetTier: ["low", "medium"], seasons: ["spring", "autumn", "mar", "apr", "may", "sep", "oct"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      explorer: "Perché Samarcanda è una delle città più belle della storia umana e quasi nessuno ci va. Moschee di piastrelle blu cobalto, medresse del 1400, l'ombra di Tamerlano.",
      seeker: "Perché camminare nel Registan di Samarcanda al tramonto è uno di quei momenti che capisce perché si viaggia.",
      recovery: "Perché l'Uzbekistan è lento, economico e distante da tutto.",
      social: "Perché l'ospitalità uzbeka è leggendaria — il plov si condivide sempre con gli ospiti.",
      romantic: "Perché Bukhara — 3.000 anni di storia, bazaar coperti, minaret illuminati — è un sogno ad occhi aperti."
    },
    experiencePreview: "Camminare nel Registan al tramonto, dormire in una caravanserai del 1500 a Bukhara, vedere il deserto del Kyzylkum all'alba.",
    practicalInfo: "E-visa semplice. Economico. Estate molto calda. Primavera e autunno perfetti.",
    itineraries: {
      explorer: {
        profileTag: "explorer",
        days: [
          {
            dayNumber: 1, title: "Samarcanda — il cuore della Via della Seta",
            morning: "Registan — la piazza più bella dell'Islam. Tre medresse del 1400. Arrivi presto, prima dei gruppi.",
            lunch: "Plov al bazaar del Siab seduto accanto ai mercanti locali.",
            afternoon: "Mausoleo di Tamerlano — il tetto turchese brilla sotto il sole del deserto.",
            evening: "Registan di notte, illuminato. Un'altra cosa.",
            affiliateLinks: { booking: bookingLink("Samarkand Uzbekistan", "low"), getyourguide: gygLink("samarkand"), tripadvisor: tripadvisorLink("Samarkand Uzbekistan") }
          },
          {
            dayNumber: 2, title: "Bukhara — 3.000 anni in un giorno",
            morning: "Treno Afrosiyob da Samarcanda (1h30). Paesaggio desertico.",
            lunch: "Manti (ravioli di montone) nel centro storico.",
            afternoon: "Bazaar coperti, minaret del X secolo, moschee medievali ancora vive.",
            evening: "Cena sul tetto di una caravanserai trasformata. Cielo stellato nel deserto.",
            affiliateLinks: { booking: bookingLink("Bukhara Uzbekistan", "low"), getyourguide: gygLink("bukhara"), tripadvisor: tripadvisorLink("Bukhara Uzbekistan") }
          }
        ],
        budgetSummary: "€400–600 totale escl. voli. Guesthouse €20–35/notte, pasti €5–10/giorno, treni €10–20.",
        packingList: "Vestiti leggeri rispettosi, cappello, scarpe comode per i sanpietrini.",
        bestTime: "Marzo–Maggio o Settembre–Ottobre. Estate 40°C+ difficile.",
        gettingThere: "Voli per Tashkent (TAS) via Istanbul, Mosca, Dubai. Treno interno.",
        closingMessage: "Samarcanda non è una destinazione turistica — è una delle cose più belle che gli esseri umani abbiano costruito.",
        topAffiliateLinks: { booking: bookingLink("Samarkand", "low"), getyourguide: gygLink("uzbekistan"), skyscanner: skyscannerLink("TAS") }
      }
    }
  },

  // ═══ SEEKER ═══
  {
    name: "Varanasi, India",
    country: "India", region: "asia",
    primaryTags: ["seeker", "explorer"],
    keywords: ["sacred", "ganges", "death", "life", "spiritual", "hindu", "ghats", "cremation", "chaos", "profound", "ancient", "ritual", "transformation", "philosophy", "intense"],
    budgetTier: ["low", "medium"], seasons: ["winter", "autumn", "oct", "nov", "dec", "jan", "feb", "mar"],
    companionFit: ["solo", "couple"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      seeker: "Perché Varanasi è il posto dove l'umanità confronta la propria mortalità da 5.000 anni. Il Gange, i ghat, le cremazioni a cielo aperto — il posto più vivo che esista perché non smette di morire.",
      explorer: "Perché Varanasi non è una destinazione turistica — è un'esperienza ontologica. Non si può capire prima di esserci.",
      recovery: "Perché guardare le cremazioni all'alba rimette tutto in prospettiva in modo definitivo.",
      social: "Perché i chai wallahs, i barcaioli, i sadhu — hanno una presenza diversa. Come se sapessero qualcosa.",
      romantic: "Perché una mattina in barca sul Gange all'alba — nebbia, canto, fumo — è una delle cose più strane e belle che si possano condividere."
    },
    experiencePreview: "Prendere una barca all'alba sul Gange, assistere all'Aarti al tramonto, perdersi nei vicoli dove convivono mucche, sadhu e sari coloratissimi.",
    practicalInfo: "Prepárati al caos. L'acqua del Gange non si beve. Vestiti rispettosamente. Trasformativa per chi è aperta.",
    itineraries: {
      seeker: {
        profileTag: "seeker",
        days: [
          {
            dayNumber: 1, title: "L'alba sul Gange",
            morning: "4:30 AM — barca sul Gange. Nebbia, lampade votive sull'acqua, canto dai ghat. Nessuna fotografia cattura questo.",
            lunch: "Lassi e chaat nei vicoli intorno a Dashashwamedh Ghat.",
            afternoon: "Perderti. I vicoli di Varanasi sono un labirinto intenzionale.",
            evening: "Cerimonia Ganga Aarti — sacerdoti con bracieri, canto, folla. Ogni sera da millenni.",
            affiliateLinks: { booking: bookingLink("Varanasi India", "low"), getyourguide: gygLink("varanasi"), tripadvisor: tripadvisorLink("Varanasi India") }
          },
          {
            dayNumber: 2, title: "Il ghat della cremazione",
            morning: "Manikarnika Ghat — cremazioni 24h su 24. Si entra con rispetto, senza macchina fotografica.",
            lunch: "Dal baati churma in un dhaba locale. €1,50.",
            afternoon: "Sarnath — dove Buddha tenne il primo discorso dopo l'illuminazione.",
            evening: "Meditazione guidata o silenzio al ghat. Dipende da te.",
            affiliateLinks: { getyourguide: gygLink("varanasi-boat-tour"), tripadvisor: tripadvisorLink("Sarnath India") }
          }
        ],
        budgetSummary: "€250–400 totale escl. voli. Guesthouse €15–25/notte, pasti €3–8/giorno, barca €10–15.",
        packingList: "Vestiti coprenti, sandali comodi, stomaco robusto, mente aperta.",
        bestTime: "Ottobre–Marzo. Evita i monsoni e l'estate.",
        gettingThere: "Voli per Varanasi (VNS) via Delhi o Mumbai. O treno notturno da Delhi.",
        closingMessage: "Varanasi non ti lascia indifferente. Ti cambia o ti respinge — di solito entrambe le cose.",
        topAffiliateLinks: { booking: bookingLink("Varanasi", "low"), getyourguide: gygLink("varanasi"), skyscanner: skyscannerLink("VNS") }
      }
    }
  },

  {
    name: "Cappadocia, Turchia",
    country: "Turkey", region: "middleeast",
    primaryTags: ["seeker", "romantic", "recovery"],
    keywords: ["fairy chimneys", "hot air balloon", "cave", "underground", "surreal", "ancient", "volcanic", "unique", "mystical", "otherworldly", "sunrise", "landscape", "troglodyte"],
    budgetTier: ["medium", "high"], seasons: ["spring", "autumn", "apr", "may", "sep", "oct"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["weekend", "week"],
    imageUrl: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      seeker: "Perché la Cappadocia non sembra reale. Ciminiere di fata e città sotterranee millenarie — capisci che gli esseri umani vivono in posti straordinari da sempre.",
      romantic: "Perché alzarsi alle 5 AM e salire su un pallone aerostatico mentre il sole nasce sulle rocce rosa è probabilmente la cosa più bella che si possa fare insieme.",
      recovery: "Perché dormire in una cave suite scavata nella roccia — muri di pietra, silenzio totale — è un riposo di qualità diversa.",
      explorer: "Perché sotto la Cappadocia ci sono città sotterranee come Derinkuyu, 18 livelli, 20.000 persone. Ancora in gran parte inesplorate.",
      social: "Perché i turchi della Cappadocia producono vino da uve vulcaniche e sono straordinariamente ospitali."
    },
    experiencePreview: "Volare in mongolfiera all'alba, dormire in una cave hotel nella roccia, esplorare Derinkuyu sotterranea.",
    practicalInfo: "Voli per Nevşehir o Kayseri. Primavera/autunno ideali. Mongolfiera: prenota con anticipo.",
    itineraries: {
      romantic: {
        profileTag: "romantic",
        days: [
          {
            dayNumber: 1, title: "Il paesaggio impossibile",
            morning: "Göreme Open Air Museum — chiese rupestri del X secolo con affreschi bizantini.",
            lunch: "Testi kebab in vaso di creta con vista sulle ciminiere.",
            afternoon: "Valle delle Rose — rocce salmone, luce incandescente nel tardo pomeriggio.",
            evening: "Cena sul terrazzo della cave hotel. La Cappadocia cambia colore ogni ora.",
            affiliateLinks: { booking: bookingLink("Göreme Cappadocia", "medium"), getyourguide: gygLink("cappadocia"), tripadvisor: tripadvisorLink("Cappadocia Turkey") }
          },
          {
            dayNumber: 2, title: "Il pallone e il cielo",
            morning: "4:30 AM — mongolfiera all'alba. 60 palloni che si alzano. 1 ora di volo silenzioso.",
            lunch: "Köfte e meze in un lokanta locale.",
            afternoon: "Derinkuyu — città sotterranea su 18 livelli. 20.000 persone 3.500 anni fa.",
            evening: "Hammam nella cave spa. Poi vino vulcanico locale.",
            affiliateLinks: { getyourguide: gygLink("cappadocia-hot-air-balloon"), tripadvisor: tripadvisorLink("Derinkuyu Underground City") }
          }
        ],
        budgetSummary: "€700–1.000 totale escl. voli. Cave hotel €90–160/notte, pasti €20–30/giorno, mongolfiera €150–200.",
        packingList: "Strati caldi per le mattine presto, scarpe comode per i tunnel.",
        bestTime: "Aprile–Maggio o Settembre–Ottobre.",
        gettingThere: "Vola a Nevşehir (NAV) o Kayseri (ASR) da Istanbul.",
        closingMessage: "La Cappadocia ti fa sentire che il mondo è più strano e più bello di quanto pensavi.",
        topAffiliateLinks: { booking: bookingLink("Cappadocia", "medium"), getyourguide: gygLink("cappadocia"), skyscanner: skyscannerLink("NAV") }
      }
    }
  },

  {
    name: "Luang Prabang, Laos",
    country: "Laos", region: "asia",
    primaryTags: ["seeker", "recovery"],
    keywords: ["monks", "mekong", "temple", "slow", "spiritual", "french colonial", "waterfall", "buddhism", "peaceful", "gentle", "UNESCO", "orange robes", "dawn", "silence", "timeless"],
    budgetTier: ["low", "medium"], seasons: ["winter", "autumn", "nov", "dec", "jan", "feb", "mar"],
    companionFit: ["solo", "couple"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      seeker: "Perché Luang Prabang è rimasta fuori dal tempo. Ogni mattina alle 5:30, centinaia di monaci in arancione camminano per le elemosine — un rituale che continua da secoli.",
      recovery: "Perché il ritmo qui è il più lento immaginabile. Il Mekong scorre, i templi sono aperti, non c'è fretta.",
      explorer: "Perché il Laos è ancora quello che era la Thailandia 30 anni fa.",
      romantic: "Perché le strade di Luang Prabang di sera — lanterne, architettura coloniale — hanno un'atmosfera da film.",
      social: "Perché i monaci accettano di parlare nel pomeriggio. Conversazioni che cambiano prospettive."
    },
    experiencePreview: "Svegliarsi all'alba per la cerimonia delle elemosine, fare il bagno a Kuang Si, navigare il Mekong verso le grotte di Pak Ou.",
    practicalInfo: "Economicissimo. Sicuro. Visto all'arrivo. Internet lento — feature, non bug.",
    itineraries: {
      seeker: {
        profileTag: "seeker",
        days: [
          {
            dayNumber: 1, title: "I monaci all'alba",
            morning: "5:30 AM — tak bat (cerimonia delle elemosine). Centinaia di monaci in fila. Silenzio. Non fotografare in faccia — stai.",
            lunch: "Khao niao con larb in un mercato locale.",
            afternoon: "Tempio Wat Xieng Thong con i suoi mosaici di vetro colorato.",
            evening: "Tramonto dal monte Phousi. La città tra due fiumi si illumina.",
            affiliateLinks: { booking: bookingLink("Luang Prabang Laos", "low"), getyourguide: gygLink("luang-prabang"), tripadvisor: tripadvisorLink("Luang Prabang Laos") }
          },
          {
            dayNumber: 2, title: "Le cascate turchesi",
            morning: "Kuang Si Waterfalls — 1h di tuk-tuk. Piscine color turchese nella giungla. Fai il bagno. Non andare via.",
            lunch: "Picnic ai piedi delle cascate.",
            afternoon: "Bear Rescue Center vicino alle cascate.",
            evening: "Cena sul Mekong. Beerlao fredda, tramonto arancione, pesce del fiume.",
            affiliateLinks: { getyourguide: gygLink("kuang-si-falls"), tripadvisor: tripadvisorLink("Kuang Si Falls Laos") }
          }
        ],
        budgetSummary: "€350–500 totale escl. voli. Guesthouse €20–35/notte, pasti €5–10/giorno, tuk-tuk €5–10.",
        packingList: "Vestiti rispettosi per i templi, sandali, repellente, torcia.",
        bestTime: "Novembre–Febbraio.",
        gettingThere: "Voli per Luang Prabang (LPQ) via Bangkok, Hanoi.",
        closingMessage: "Luang Prabang non ti dà esperienze da raccontare. Ti dà una lentezza che porti a casa.",
        topAffiliateLinks: { booking: bookingLink("Luang Prabang", "low"), getyourguide: gygLink("luang-prabang"), skyscanner: skyscannerLink("LPQ") }
      }
    }
  },

  {
    name: "Kyoto, Giappone",
    country: "Japan", region: "asia",
    primaryTags: ["seeker", "recovery", "romantic"],
    keywords: ["temple", "zen", "geisha", "bamboo", "tea ceremony", "cherry blossom", "autumn leaves", "tradition", "aesthetics", "mindful", "slow", "craft", "garden", "discipline", "beauty"],
    budgetTier: ["medium", "high", "unlimited"], seasons: ["spring", "autumn", "mar", "apr", "oct", "nov"],
    companionFit: ["solo", "couple"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      seeker: "Perché Kyoto è il posto dove la bellezza è una disciplina — ogni giardino, ogni cerimonia, ogni tempio è il risultato di secoli di cura intenzionale.",
      recovery: "Perché il ritmo di Kyoto ti rallenta fisicamente. I giardini zen sono progettati per questo.",
      romantic: "Perché passeggiare per Gion al tramonto, con le lanterne e il shamisen, è una delle esperienze più romantiche d'Asia.",
      explorer: "Perché dietro Kyoto c'è un Giappone rurale — Kurama, Kibune, Ohara — che pochissimi trovano.",
      social: "Perché i kaiseki — alta cucina giapponese — sono esperienze sociali dove il cibo è linguaggio."
    },
    experiencePreview: "Camminare nel Bosco di Bambù all'alba, partecipare a una cerimonia del tè tradizionale, trovare i templi nascosti lungo il Cammino del Filosofo.",
    practicalInfo: "Ottimi trasporti. Japan Rail Pass consigliato. Sicurissimo. Sakura (marzo–aprile) e foglie (novembre) magiche ma affollate.",
    itineraries: {
      seeker: {
        profileTag: "seeker",
        days: [
          {
            dayNumber: 1, title: "L'antica capitale",
            morning: "Fushimi Inari alle 6 AM. Mille torii arancioni sulla montagna. Quasi solo.",
            lunch: "Ramen in un minuscolo negozio di 8 posti. 10 euro. Il migliore.",
            afternoon: "Quartiere di Gion — se sei fortunato, una geisha.",
            evening: "Cena kaiseki — 8 portate di stagione. Ogni piatto un'opera d'arte temporanea.",
            affiliateLinks: { booking: bookingLink("Kyoto Japan", "medium"), getyourguide: gygLink("kyoto"), tripadvisor: tripadvisorLink("Kyoto Japan") }
          },
          {
            dayNumber: 2, title: "Il bambù e la cerimonia",
            morning: "5:30 AM — Bosco di Bambù di Arashiyama. Il suono del vento è quello più usato nelle meditazioni. Ora sai perché.",
            lunch: "Yudofu (tofu in brodo) in un ristorante con giardino.",
            afternoon: "Cerimonia del tè con una maestra certificata. 2 ore. Ogni gesto ha 400 anni.",
            evening: "Nishiki Market. L'ultimo tramonto sul Kamo River.",
            affiliateLinks: { getyourguide: gygLink("kyoto-tea-ceremony"), tripadvisor: tripadvisorLink("Arashiyama Bamboo Grove") }
          }
        ],
        budgetSummary: "€1.200–1.600 totale escl. voli. Machiya €100–150/notte, pasti €25–50/giorno, cerimonia €50.",
        packingList: "Scarpe slip-on, strati per le stagioni di transizione, borsa piccola.",
        bestTime: "Fine marzo–metà aprile per sakura. Metà novembre per foglie.",
        gettingThere: "Vola a Kansai (KIX). Haruka Express a Kyoto Station in 75 minuti.",
        closingMessage: "Kyoto non ti mostra il Giappone — ti mostra cosa significa fare le cose bene.",
        topAffiliateLinks: { booking: bookingLink("Kyoto", "high"), getyourguide: gygLink("kyoto"), skyscanner: skyscannerLink("KIX") }
      }
    }
  },

  // ═══ SOCIAL ═══
  {
    name: "Napoli, Italia",
    country: "Italy", region: "europe",
    primaryTags: ["social", "seeker", "explorer"],
    keywords: ["pizza", "chaos", "energy", "authentic", "street life", "history", "underground", "art", "spontaneous", "raw", "vesuvio", "pompeii", "neapolitan", "passionate", "real"],
    budgetTier: ["low", "medium"], seasons: ["spring", "autumn", "summer", "apr", "may", "jun", "sep", "oct"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["weekend", "week"],
    imageUrl: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      social: "Perché Napoli non esiste per il turista — esiste per sé stessa. La città italiana più italiana. Il caos è autentico, la gente è vera, la pizza è la migliore al mondo.",
      explorer: "Perché sotto Napoli c'è un'altra città — 40 km di tunnel greco-romani. La Napoli sotterranea è più surreale di qualsiasi destinazione esotica.",
      seeker: "Perché Napoli porta i segni di 3.000 anni di storia — greca, romana, normanna, borbonica — tutti sovrapposti senza filtri.",
      recovery: "Perché Napoli ti obbliga a essere presente. Non puoi essere distratto in una città così intensa.",
      romantic: "Perché il lungomare con il Vesuvio al tramonto è una vista che entra nei ricordi permanenti."
    },
    experiencePreview: "Mangiare la vera pizza fritta ai Quartieri Spagnoli, scendere nella Napoli sotterranea, vedere Pompei all'alba.",
    practicalInfo: "Molto economico. Borsa a tracolla davanti. Pizza costa €3. Treni per Pompei da piazza Garibaldi.",
    itineraries: {
      social: {
        profileTag: "social",
        days: [
          {
            dayNumber: 1, title: "La città che non si scusa",
            morning: "Mercato di Porta Nolana — pesce freschissimo, urla dei venditori. Napoli alle 8.",
            lunch: "Pizza fritta da Concettina ai Tre Santi nei Quartieri Spagnoli. €3. La migliore cosa che mangerai.",
            afternoon: "Napoli sotterranea — tunnel greco-romani sotto la città. Catacombe, bunker WWII. 2 ore.",
            evening: "Aperitivo sul lungomare Caracciolo. Spritz, pizza a portafoglio, Vesuvio al tramonto.",
            affiliateLinks: { booking: bookingLink("Naples Italy", "low"), getyourguide: gygLink("naples"), tripadvisor: tripadvisorLink("Naples Italy") }
          },
          {
            dayNumber: 2, title: "Pompei e il Vesuvio",
            morning: "Circumvesuviana da piazza Garibaldi (40 min). Pompei alle 9, prima delle folle.",
            lunch: "Ragù napoletano in una trattoria. Pasta lenta 5 ore.",
            afternoon: "Museo Nazionale — tesori di Pompei, Stanza Segreta (mosaici erotici romani). Una delle collezioni più belle al mondo.",
            evening: "Serata nei Quartieri Spagnoli — vino sfuso, musica dai portoni.",
            affiliateLinks: { getyourguide: gygLink("pompeii-tour"), tripadvisor: tripadvisorLink("Pompeii Archaeological Park") }
          }
        ],
        budgetSummary: "€350–550 totale escl. voli. Hotel €45–70/notte, pasti €12–20/giorno, Pompei €16.",
        packingList: "Scarpe comode, borsa davanti, abbigliamento casual.",
        bestTime: "Aprile–Giugno o Settembre–Ottobre.",
        gettingThere: "Voli per Napoli (NAP). Metro dall'aeroporto.",
        closingMessage: "Napoli non è per tutti — è per chi non ha paura della vita vera.",
        topAffiliateLinks: { booking: bookingLink("Naples", "low"), getyourguide: gygLink("naples"), skyscanner: skyscannerLink("NAP") }
      }
    }
  },

  {
    name: "Medellín, Colombia",
    country: "Colombia", region: "americas",
    primaryTags: ["social", "explorer"],
    keywords: ["transformation", "innovation", "nightlife", "flowers", "cable car", "resilience", "spring eternal", "food", "art", "salsa", "urban", "contrast", "emerging", "reinvention"],
    budgetTier: ["low", "medium"], seasons: ["spring", "autumn", "dec", "jan", "feb", "mar", "apr", "aug", "sep"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1574482620811-1aa16ffe3c82?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      social: "Perché Medellín è la città della trasformazione — da una delle più pericolose al mondo a una delle più innovative. La gente ha un'energia che viene dall'aver superato qualcosa.",
      explorer: "Perché Medellín dimostra che il mondo cambia — e andare prima che lo scoprano tutti è sempre la scelta giusta.",
      recovery: "Perché Medellín ha 22°C tutto l'anno. La chiamano 'la città dell'eterna primavera'. Non è un slogan.",
      romantic: "Perché ballare salsa al tramonto con vista sulla valle illuminata è uno di quei momenti indimenticabili.",
      seeker: "Perché la storia di Medellín — dal cartello alla rinascita — è una delle più intense del XX secolo."
    },
    experiencePreview: "Salire in cabinovia sui barrios di montagna, bere aguardiente con i locali, visitare il museo che racconta Escobar senza romanticizzarlo.",
    practicalInfo: "Molto economico. Clima perfetto. Spagnolo utile. Metro + cabinovia eccellenti.",
    itineraries: {
      social: {
        profileTag: "social",
        days: [
          {
            dayNumber: 1, title: "La città che si è reinventata",
            morning: "El Poblado — caffè specialty (il caffè colombiano è il migliore al mondo), street art.",
            lunch: "Bandeja paisa — il piatto tradizionale. In realtà sei piatti. Impossibile finirlo.",
            afternoon: "Metrocable a Santo Domingo — il progetto urbanistico che ha cambiato la città.",
            evening: "Parroquia — aperitivo con aguardiente tra la gente locale. Musica dai portoni.",
            affiliateLinks: { booking: bookingLink("Medellin Colombia", "low"), getyourguide: gygLink("medellin"), tripadvisor: tripadvisorLink("Medellin Colombia") }
          },
          {
            dayNumber: 2, title: "Un'altra storia",
            morning: "Tour della storia di Escobar — non romanticizzato. Una guida locale cambia la prospettiva.",
            lunch: "Ajiaco (zuppa di patate e pollo) a La Candelaria.",
            afternoon: "Plaza Botero — 23 sculture di Fernando Botero. Il Louvre è pieno di gente — qui quasi solo.",
            evening: "Lezione di salsa. Poi cena tardi, come colombiani.",
            affiliateLinks: { getyourguide: gygLink("medellin-pablo-escobar-tour"), tripadvisor: tripadvisorLink("Plaza Botero Medellin") }
          }
        ],
        budgetSummary: "€450–650 totale escl. voli. Hotel €25–45/notte, pasti €5–12/giorno.",
        packingList: "Abbigliamento casual, giacca per le sere fresche in altura.",
        bestTime: "Dicembre–Marzo o Agosto–Settembre.",
        gettingThere: "Voli per Medellín (MDE) via Bogotá, Miami, Madrid.",
        closingMessage: "Medellín ti dimostra che le città possono cambiare. E forse anche le persone.",
        topAffiliateLinks: { booking: bookingLink("Medellin", "low"), getyourguide: gygLink("medellin"), skyscanner: skyscannerLink("MDE") }
      }
    }
  },

  {
    name: "Marrakech, Marocco",
    country: "Morocco", region: "africa",
    primaryTags: ["social", "seeker", "explorer"],
    keywords: ["medina", "souk", "spice", "riad", "chaos", "color", "mint tea", "atlas", "vibrant", "exotic", "labyrinth", "hammam", "sensory", "immersive", "pattern"],
    budgetTier: ["low", "medium"], seasons: ["spring", "autumn", "winter", "mar", "apr", "may", "oct", "nov", "feb"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["weekend", "week"],
    imageUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      social: "Perché Marrakech è un'esperienza sensoriale totale — souk coloratissimi, mint tea sui tetti, Gnawa nella piazza. Impossibile restare spettatori.",
      seeker: "Perché la medina è un labirinto medievale intatto. Ci si perde — e in quel perdersi si trova qualcosa.",
      explorer: "Perché le montagne dell'Atlas sono a 1h e ci sono villaggi berberi raggiungibili solo a piedi.",
      recovery: "Perché un hammam tradizionale è il reset più fisico che esista.",
      romantic: "Perché dormire in un riad con giardino interno e fontana è un lusso intimo irriproducibile."
    },
    experiencePreview: "Perdersi nei souk, fare un hammam tradizionale, mangiare tajine sotto le stelle.",
    practicalInfo: "Economico. Tratta sempre il prezzo. Vestiti rispettosamente. Sicuro con attenzione.",
    itineraries: {
      seeker: {
        profileTag: "seeker",
        days: [
          {
            dayNumber: 1, title: "Nel cuore del labirinto",
            morning: "Souk dei tintori — stoffe nei tini di pigmento naturale. Uno degli spettacoli cromatici più intensi.",
            lunch: "Tajine di agnello con prugne e mandorle in una trattoria nella medina.",
            afternoon: "Madrasa Ben Youssef del 1500 — stucchi arabescati, zellige, legno di cedro.",
            evening: "Piazza Djemaa el-Fna al tramonto — giocolieri, cantastorie. Cena ai ristoranti sul bordo.",
            affiliateLinks: { booking: bookingLink("Marrakech Morocco", "medium"), getyourguide: gygLink("marrakech"), tripadvisor: tripadvisorLink("Marrakech Morocco") }
          },
          {
            dayNumber: 2, title: "Il corpo e l'anima",
            morning: "Hammam tradizionale — 2 ore di vapore, scrub, massaggio. Esci con una pelle nuova.",
            lunch: "Harira e msemen — la colazione tardiva marocchina.",
            afternoon: "Giardini della Menara — ulivi del 1100 con padiglione riflesso nella vasca.",
            evening: "Cena nel riad. Bastilla (torta di piccione e mandorle), couscous.",
            affiliateLinks: { getyourguide: gygLink("marrakech-hammam"), tripadvisor: tripadvisorLink("Majorelle Garden Marrakech") }
          }
        ],
        budgetSummary: "€400–600 totale escl. voli. Riad €50–90/notte, pasti €10–18/giorno, hammam €25–40.",
        packingList: "Vestiti coprenti leggeri, sandali, crema solare, cash per i souk.",
        bestTime: "Marzo–Maggio o Ottobre–Novembre.",
        gettingThere: "Voli diretti da tutta Europa per Marrakech (RAK).",
        closingMessage: "Marrakech non ti lascia neutro. Ti trasforma per eccesso di vita.",
        topAffiliateLinks: { booking: bookingLink("Marrakech", "medium"), getyourguide: gygLink("marrakech"), skyscanner: skyscannerLink("RAK") }
      }
    }
  },

  // ═══ ROMANTIC ═══
  {
    name: "Puglia, Italia",
    country: "Italy", region: "europe",
    primaryTags: ["romantic", "recovery", "social"],
    keywords: ["trulli", "olive", "orecchiette", "sea", "whitewashed", "slow", "food", "wine", "baroque", "coast", "authentic", "golden", "sensory", "summer", "italian"],
    budgetTier: ["medium", "high"], seasons: ["spring", "summer", "autumn", "may", "jun", "sep", "oct"],
    companionFit: ["couple", "friends", "family"], durationFit: ["weekend", "week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      romantic: "Perché la Puglia ha quella luce che cambia tutto — ulivi argentei, pietre bianche, mare blu. E una cucina che parla d'amore in ogni piatto.",
      recovery: "Perché il ritmo pugliese è quello giusto — colazione alle 9, bagno a mezzogiorno, pennichella, aperitivo al tramonto.",
      social: "Perché la Puglia è fatta di piazze, sagre, gente che mangia insieme. La socievolezza è nell'architettura.",
      explorer: "Perché la Puglia è varia — trulli, Salento, Matera a un'ora.",
      seeker: "Perché Otranto ha il mosaico pavimentale più grande del mondo — tutta la cosmologia medievale in una stanza."
    },
    experiencePreview: "Dormire in un trullo tra gli ulivi, fare le orecchiette con una nonna, nuotare a Polignano a Mare.",
    practicalInfo: "Voli per Bari o Brindisi. Auto indispensabile. Maggio–Giugno e Settembre perfetti.",
    itineraries: {
      romantic: {
        profileTag: "romantic",
        days: [
          {
            dayNumber: 1, title: "La luce del Sud",
            morning: "Bari Vecchia — le donne fanno orecchiette sulle soglie. Ti siedono di fianco e ti insegnano.",
            lunch: "Polpo alla pignata, friselle al pomodoro, vino primitivo.",
            afternoon: "Polignano a Mare — città bianca sulle scogliere. L'acqua è di quel blu impossibile.",
            evening: "Tramonto dal belvedere. Aperol spritz. Il sole finisce nel mare.",
            affiliateLinks: { booking: bookingLink("Polignano a Mare Puglia", "medium"), airbnb: airbnbLink("Puglia Italy"), tripadvisor: tripadvisorLink("Polignano a Mare Italy") }
          },
          {
            dayNumber: 2, title: "I trulli e la valle",
            morning: "Alberobello — case con tetti a cono in pietra. Unici al mondo.",
            lunch: "Agnello al forno con verdure di stagione in una masseria.",
            afternoon: "Valle d'Itria — ulivi centenari, muretti a secco. Guida senza meta.",
            evening: "Cena a lume di candela nella masseria. Burrata, orecchiette al ragù, fichi.",
            affiliateLinks: { booking: bookingLink("Alberobello Puglia", "medium"), getyourguide: gygLink("alberobello-trulli"), airbnb: airbnbLink("Alberobello Italy") }
          }
        ],
        budgetSummary: "€600–900 totale escl. voli. Masseria €80–130/notte, pasti €20–35/giorno, auto €25/giorno.",
        packingList: "Abiti estivi, sandali, costume, crema solare alta protezione.",
        bestTime: "Maggio–Giugno o Settembre–Ottobre.",
        gettingThere: "Vola a Bari (BRI) o Brindisi (BDS). Noleggio auto all'aeroporto.",
        closingMessage: "La Puglia non vuole farti fare cose — vuole farti stare.",
        topAffiliateLinks: { booking: bookingLink("Puglia", "medium"), airbnb: airbnbLink("Puglia"), skyscanner: skyscannerLink("BRI") }
      }
    }
  },

  {
    name: "Lisbona, Portogallo",
    country: "Portugal", region: "europe",
    primaryTags: ["romantic", "social", "recovery"],
    keywords: ["fado", "tram", "pasteis", "golden light", "hills", "melancholy", "saudade", "tiles", "warm", "sunset", "affordable", "walkable", "wine", "seafood", "europe"],
    budgetTier: ["low", "medium", "high"], seasons: ["spring", "autumn", "summer", "mar", "apr", "may", "jun", "sep", "oct"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["weekend", "week"],
    imageUrl: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      romantic: "Perché Lisbona ha una malinconia dolce — fado, luce dorata, vento atlantico — che rende ogni momento cinematografico.",
      social: "Perché il Time Out Market, Bairro Alto, le serate di fado — Lisbona ha vita notturna accessibile e genuina.",
      recovery: "Perché Lisbona va lenta. Il tram 28 fa quello che vuole, i caffè non ti cacciano.",
      explorer: "Perché fuori c'è Sintra e la Serra da Arrábida — scogliere bianche su mare cristallino.",
      seeker: "Perché gli azulejos raccontano storie — battaglie, geometrie moresque. Ogni parete è un libro."
    },
    experiencePreview: "Ascoltare il fado in Mouraria, mangiare pastéis caldi a Belém, guardare l'Atlantico al tramonto.",
    practicalInfo: "Eccellente per qualsiasi budget. Centro a piedi. Sicuro. Estate calda e affollata.",
    itineraries: {
      romantic: {
        profileTag: "romantic",
        days: [
          {
            dayNumber: 1, title: "La luce dorata di Alfama",
            morning: "Alfama — vicoli stretti, laundry tra i balconi. Tram 28 su.",
            lunch: "Bacalhau à brás in una tasca tipica.",
            afternoon: "Castelo de São Jorge — vista su Lisbona, Tago, Ponte 25 de Abril.",
            evening: "Fado in un piccolo locale di Mouraria. Una voce, una chitarra, la saudade.",
            affiliateLinks: { booking: bookingLink("Lisbon Portugal", "medium"), getyourguide: gygLink("lisbon"), tripadvisor: tripadvisorLink("Lisbon Portugal") }
          },
          {
            dayNumber: 2, title: "Belém e il tramonto",
            morning: "Monastero dos Jerónimos e Torre di Belém.",
            lunch: "Pastéis de Belém — caldi, con cannella. La coda vale ogni secondo.",
            afternoon: "LX Factory — mercato creativo. Sabato: libri usati più bello d'Europa.",
            evening: "Tramonto al Miradouro da Graça con vinho verde.",
            affiliateLinks: { getyourguide: gygLink("lisbon-food-tour"), tripadvisor: tripadvisorLink("Belém Tower Lisbon") }
          }
        ],
        budgetSummary: "€500–750 totale escl. voli. Hotel boutique €70–100/notte, pasti €15–25/giorno, fado show €25.",
        packingList: "Scarpe comode per i sampietrini, strati, impermeabile leggero.",
        bestTime: "Aprile–Giugno o Settembre–Ottobre.",
        gettingThere: "Voli diretti da tutta Europa per Lisbona (LIS). Metro dall'aeroporto.",
        closingMessage: "Lisbona non ti corre dietro. Ti aspetta, con la luce accesa.",
        topAffiliateLinks: { booking: bookingLink("Lisbon", "medium"), getyourguide: gygLink("lisbon"), skyscanner: skyscannerLink("LIS") }
      }
    }
  },

  {
    name: "Praga, Repubblica Ceca",
    country: "Czech Republic", region: "europe",
    primaryTags: ["romantic", "social", "seeker"],
    keywords: ["gothic", "baroque", "beer", "castle", "old town", "fairytale", "history", "art nouveau", "medieval", "bridge", "europe", "walkable", "cozy", "golden", "prague"],
    budgetTier: ["low", "medium"], seasons: ["spring", "autumn", "winter", "mar", "apr", "may", "sep", "oct", "nov", "dec"],
    companionFit: ["couple", "friends", "solo"], durationFit: ["weekend", "week"],
    imageUrl: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      romantic: "Perché Praga fuori stagione è una città fiabesca senza folle. Il Ponte Carlo nella nebbia mattutina è una delle cose più romantiche d'Europa.",
      social: "Perché i cechi producono la birra migliore al mondo e la bevono nei pub medievali sotterranei a prezzi che non esistono più.",
      seeker: "Perché Praga è stratificata — romanica, gotica, barocca, art nouveau, comunista — in un centro storico intatto.",
      explorer: "Perché oltre al centro c'è una Praga di caffè d'artista e quartieri bohémien che la maggior parte non trova.",
      recovery: "Perché Karlovy Vary — la città termale più famosa d'Europa — è a 1h da Praga."
    },
    experiencePreview: "Attraversare il Ponte Carlo all'alba, bere Pilsner Urquell alla fonte, perdersi nel quartiere ebraico.",
    practicalInfo: "Molto economico. Centro percorribile. Metro efficiente. Alta stagione luglio–agosto — preferisci primavera o autunno.",
    itineraries: {
      romantic: {
        profileTag: "romantic",
        days: [
          {
            dayNumber: 1, title: "La città delle guglie",
            morning: "6:30 AM — Ponte Carlo senza nessuno. Nebbia sul Moldava, statue barocche, vista sul Castello.",
            lunch: "Svíčková con birra ceca in una pivnice tradizionale.",
            afternoon: "Quartiere ebraico — cimitero su 12 livelli, sinagoghe del 1200.",
            evening: "Concerto in una chiesa barocca. Vivaldi dove erano suonate allora.",
            affiliateLinks: { booking: bookingLink("Prague Czech Republic", "medium"), getyourguide: gygLink("prague"), tripadvisor: tripadvisorLink("Prague Czech Republic") }
          },
          {
            dayNumber: 2, title: "Il castello e la birra",
            morning: "Castello di Praga — il più grande al mondo. Cattedrale di San Vito, vicoli d'oro.",
            lunch: "Lokál — la migliore birra spillata di Praga, goulash con knedlíky.",
            afternoon: "Vinohrady — Praga locale, senza turisti. Caffè d'artista, librerie usate.",
            evening: "Cena al ristorante Field — cucina ceca contemporanea. Prenota.",
            affiliateLinks: { getyourguide: gygLink("prague-castle-tour"), tripadvisor: tripadvisorLink("Prague Castle") }
          }
        ],
        budgetSummary: "€450–650 totale escl. voli. Hotel boutique €60–90/notte, pasti €10–20/giorno, birra €1,50.",
        packingList: "Scarpe per i sanpietrini, strati per le serate fresche, giacca impermeabile.",
        bestTime: "Marzo–Maggio o Settembre–Novembre. Dicembre per i mercatini.",
        gettingThere: "Voli diretti da tutta Europa per Praga (PRG).",
        closingMessage: "Praga è quella città che ti convince che le fiabe hanno un indirizzo.",
        topAffiliateLinks: { booking: bookingLink("Prague", "medium"), getyourguide: gygLink("prague"), skyscanner: skyscannerLink("PRG") }
      }
    }
  },

  {
    name: "Reykjavík, Islanda",
    country: "Iceland", region: "europe",
    primaryTags: ["explorer", "recovery", "seeker"],
    keywords: ["aurora", "midnight sun", "geothermal", "volcanic", "wilderness", "waterfalls", "glaciers", "raw nature", "dramatic", "road trip", "photography", "elemental", "remote", "blue lagoon"],
    budgetTier: ["high", "unlimited"], seasons: ["winter", "summer", "sep", "oct", "nov", "dec", "jan", "feb", "jun", "jul", "aug"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["week", "10-14"],
    imageUrl: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      explorer: "Perché l'Islanda è uno dei pochi posti dove la natura non è ancora doma. Ghiacciai, vulcani attivi, aurora boreale — il pianeta ancora in formazione.",
      recovery: "Perché immergersi nella Blue Lagoon a -5°C sotto le stelle è uno dei reset più completi che esistano.",
      seeker: "Perché la luce in Islanda è diversa. In estate il sole non tramonta mai. In inverno l'aurora boreale dipinge il cielo.",
      romantic: "Perché vedere l'aurora insieme è una di quelle esperienze che diventano parte dell'identità condivisa.",
      social: "Perché i bar di Reykjavík il venerdì sera sono tra i più vivaci d'Europa."
    },
    experiencePreview: "Inseguire l'aurora nelle pianure vulcaniche, camminare tra le placche tettoniche, stare sotto le cascate di Seljalandsfoss.",
    practicalInfo: "Molto caro. Auto 4x4 necessaria. Il tempo cambia ogni 20 minuti. Sicurissimo.",
    itineraries: {
      explorer: {
        profileTag: "explorer",
        days: [
          {
            dayNumber: 1, title: "Il pianeta alieno",
            morning: "Atterri, prendi la 4x4. Fuori: campi di lava nera. Nessun altro paesaggio simile.",
            lunch: "Zuppa di aragosta a Grindavík. La migliore, €12.",
            afternoon: "Blue Lagoon — acqua geotermica azzurra tra i massi neri.",
            evening: "Reykjavík — Hallgrímskirkja, il porto arcobaleno.",
            affiliateLinks: { booking: bookingLink("Reykjavik Iceland", "high"), getyourguide: gygLink("reykjavik"), tripadvisor: tripadvisorLink("Blue Lagoon Iceland") }
          },
          {
            dayNumber: 2, title: "Il Golden Circle",
            morning: "Þingvellir — cammini tra le placche tettoniche. Letteralmente tra i continenti.",
            lunch: "Ristorante in una serra geotermica — pomodori coltivati con calore vulcanico.",
            afternoon: "Geyser Strokkur ogni 8 minuti. Gullfoss — 32 metri di caduta.",
            evening: "Se inverno: aurora hunt. Se estate: sole di mezzanotte.",
            affiliateLinks: { getyourguide: gygLink("golden-circle-iceland"), tripadvisor: tripadvisorLink("Golden Circle Iceland") }
          }
        ],
        budgetSummary: "€1.600–2.200 totale escl. voli. Hotel €150–220/notte, pasti €45–65/giorno, auto 4x4 €90/giorno.",
        packingList: "Impermeabile tecnico, termici, scarpe impermeabili, costume, batterie extra.",
        bestTime: "Settembre–Marzo per aurora. Giugno–Agosto per sole di mezzanotte.",
        gettingThere: "Voli diretti da molte città europee per Keflavík (KEF).",
        closingMessage: "L'Islanda ti fa sentire su un pianeta giovane, ancora in costruzione.",
        topAffiliateLinks: { booking: bookingLink("Reykjavik", "high"), getyourguide: gygLink("iceland"), skyscanner: skyscannerLink("KEF") }
      }
    }
  },

  {
    name: "Patagonia, Argentina & Cile",
    country: "Argentina/Chile", region: "americas",
    primaryTags: ["explorer", "seeker", "recovery"],
    keywords: ["glaciers", "torres del paine", "wilderness", "trekking", "end of world", "dramatic", "remote", "pristine", "condors", "vast", "wind", "raw nature", "perito moreno", "austral"],
    budgetTier: ["high", "unlimited"], seasons: ["summer", "nov", "dec", "jan", "feb", "mar"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["10-14", "long"],
    imageUrl: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      explorer: "Perché la Patagonia è letteralmente la fine del mondo — Torres del Paine, il Perito Moreno, i ghiacciai azzurri.",
      recovery: "Perché non c'è posto dove la mente si svuota più velocemente che davanti a un ghiacciaio nel silenzio totale.",
      seeker: "Perché il vento patagónico è una forza fisica. Cammini contro di lui e senti quanto sei piccolo.",
      romantic: "Perché fare il W Trek a Torres del Paine insieme è un legame che dura.",
      social: "Perché i rifugi del trekking sono posti dove si mangia con sconosciuti di 12 nazionalità e si diventa amici in 20 minuti."
    },
    experiencePreview: "W Trek di Torres del Paine, Perito Moreno che si spezza nell'acqua turchese, dormire in un refugio sotto le stelle australi.",
    practicalInfo: "Lontano e costoso ma unico. Novembre–Marzo estate australe. Prenotare rifugi con largo anticipo.",
    itineraries: {
      explorer: {
        profileTag: "explorer",
        days: [
          {
            dayNumber: 1, title: "La fine del mondo",
            morning: "El Calafate. L'aria è diversa. Il cielo è enorme.",
            lunch: "Cordero al palo (agnello intero allo spiedo). La carne migliore della vita.",
            afternoon: "Perito Moreno — 5 km di fronte glaciale. Ti siedi e aspetti che si spezzi.",
            evening: "El Calafate al tramonto. Condori in volo.",
            affiliateLinks: { booking: bookingLink("El Calafate Argentina", "high"), getyourguide: gygLink("patagonia-perito-moreno"), tripadvisor: tripadvisorLink("Perito Moreno Glacier") }
          },
          {
            dayNumber: 2, title: "Torres del Paine",
            morning: "Puerto Natales. Le Torres specchiate nel lago all'alba.",
            lunch: "Sopa de lentejas al rifugio. Birra fredda.",
            afternoon: "Valle del Francés — condor nelle correnti termiche.",
            evening: "Refugio Paine Grande. Cena con trekkers da tutto il mondo.",
            affiliateLinks: { booking: bookingLink("Torres del Paine Chile", "high"), getyourguide: gygLink("torres-del-paine-trek") }
          }
        ],
        budgetSummary: "€2.000–3.000 totale escl. voli intercontinentali. Refugios €60–90/notte, pasti €20–35/giorno.",
        packingList: "Trekking pants tecnici, impermeabile vento-resistente (obbligatorio), scarpe impermeabili, strati termici.",
        bestTime: "Novembre–Marzo. Dicembre–Febbraio picco — prenotare 6 mesi prima.",
        gettingThere: "Vola a Buenos Aires (EZE) o Santiago (SCL), poi interno a El Calafate (FTE).",
        closingMessage: "La Patagonia ti ridimensiona. E questo, di solito, è esattamente quello di cui hai bisogno.",
        topAffiliateLinks: { booking: bookingLink("Patagonia", "high"), getyourguide: gygLink("patagonia"), skyscanner: skyscannerLink("EZE") }
      }
    }
  },

  {
    name: "Oaxaca, Messico",
    country: "Mexico", region: "americas",
    primaryTags: ["seeker", "social", "explorer"],
    keywords: ["mole", "mezcal", "indigenous", "crafts", "ruins", "food", "color", "authentic", "markets", "art", "culture", "vibrant", "traditions", "history", "zapotec"],
    budgetTier: ["low", "medium"], seasons: ["winter", "autumn", "oct", "nov", "dec", "jan", "feb", "mar"],
    companionFit: ["solo", "couple", "friends"], durationFit: ["week", "10-14", "long"],
    imageUrl: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&h=400&fit=crop",
    whyYoursTemplates: {
      seeker: "Perché Oaxaca è dove la cultura zapoteca sopravvive senza filtri. Il mole negro — 30 ingredienti, giorni di preparazione — è una forma d'arte culinaria.",
      social: "Perché a Oaxaca si mangia, si beve mezcal e si balla insieme. La gioia è collettiva.",
      explorer: "Perché Monte Albán — città zapoteca sulla montagna nel 500 a.C. — è uno dei siti più impressionanti delle Americhe.",
      recovery: "Perché il ritmo è quello messicano del Sud — lento, colorato, senza urgenza.",
      romantic: "Perché i mercati notturni con lanterne e donne in huipil ricamato hanno una qualità da sogno."
    },
    experiencePreview: "Fare il mole con una cuoca locale, assaggiare mezcal direttamente dalla distilleria, vedere l'alba su Monte Albán.",
    practicalInfo: "Molto economico. Voli via Città del Messico. Fine ottobre: Día de los Muertos.",
    itineraries: {
      seeker: {
        profileTag: "seeker",
        days: [
          {
            dayNumber: 1, title: "I colori e i sapori",
            morning: "Mercado 20 de Noviembre — donne in huipil, cacao, chapulines (cavallette). Siediti al corridoio della carne.",
            lunch: "Tlayuda con tasajo, quesillo, frijoles negros. Il piatto nazionale.",
            afternoon: "Museo Textile — tessuti zapotechi che raccontano 3.000 anni di cosmologia.",
            evening: "Mezcal al bar In Situ — 400 varietà artigianali.",
            affiliateLinks: { booking: bookingLink("Oaxaca Mexico", "low"), getyourguide: gygLink("oaxaca"), tripadvisor: tripadvisorLink("Oaxaca Mexico") }
          },
          {
            dayNumber: 2, title: "Monte Albán e il mole",
            morning: "Monte Albán all'alba — la città zapoteca sulla montagna. Vista sulla valle, silenziosa.",
            lunch: "Classe di cucina con maestra locale — 3 ore, mole negro, 30 ingredienti.",
            afternoon: "Distilleria artigianale di mezcal — il maestro raccoglie l'agave con il machete.",
            evening: "Cena con il mole che hai fatto tu.",
            affiliateLinks: { getyourguide: gygLink("oaxaca-cooking-class"), tripadvisor: tripadvisorLink("Monte Alban Oaxaca") }
          }
        ],
        budgetSummary: "€400–600 totale escl. voli. Hotel boutique €35–55/notte, pasti €8–15/giorno, classe cucina €45.",
        packingList: "Abbigliamento leggero, crema solare, repellente, stomaco avventuroso.",
        bestTime: "Ottobre–Marzo. Fine ottobre per il Día de los Muertos — unico al mondo.",
        gettingThere: "Vola a Oaxaca (OAX) via Città del Messico.",
        closingMessage: "Oaxaca non riempie solo l'itinerario — riempie qualcosa di più profondo.",
        topAffiliateLinks: { booking: bookingLink("Oaxaca", "low"), getyourguide: gygLink("oaxaca"), skyscanner: skyscannerLink("OAX") }
      }
    }
  }
];

// ─── LEGACY COMPATIBILITY ─────────────────────────────────────────────────────
for (const dest of destinationCatalog) {
  if (!dest.whyYours) {
    dest.whyYours = dest.whyYoursTemplates[dest.primaryTags[0]] || "";
  }
  // Legacy profile field for old matching engine
  if (!dest.profile) {
    dest.profile = {
      keywords: dest.keywords,
      budgetTier: dest.budgetTier,
      seasons: dest.seasons,
      companionFit: dest.companionFit,
      durationFit: dest.durationFit
    };
  }
  if (!dest.itinerary) {
    const firstTag = dest.primaryTags[0];
    const itin = dest.itineraries[firstTag];
    if (itin) {
      dest.itinerary = {
        days: itin.days.map(d => ({
          dayNumber: d.dayNumber, title: d.title,
          morning: d.morning, lunch: d.lunch,
          afternoon: d.afternoon, evening: d.evening
        })),
        budgetSummary: itin.budgetSummary,
        packingList: itin.packingList,
        bestTime: itin.bestTime,
        gettingThere: itin.gettingThere,
        closingMessage: itin.closingMessage
      };
    }
  }
}
