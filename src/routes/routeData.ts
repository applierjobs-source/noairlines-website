export interface RouteData {
  id: string
  from: string
  to: string
  fromCode?: string
  toCode?: string
  title: string
  description: string
  slug: string
}

export const routes: RouteData[] = [
  {
    id: 'west-palm-beach-nantucket',
    from: 'West Palm Beach',
    to: 'Nantucket',
    fromCode: 'PBI',
    toCode: 'ACK',
    slug: 'west-palm-beach-nantucket',
    title: 'West Palm Beach → Nantucket',
    description: 'Trade the tropics for the island breeze in just three hours. Fly straight from Palm Beach to Nantucket — no connections, no ferries — and arrive refreshed at your summer home or weekend getaway. Perfect for travelers who split their seasons between the East Coast\'s most exclusive enclaves.'
  },
  {
    id: 'new-york-aspen',
    from: 'New York City',
    to: 'Aspen',
    fromCode: 'JFK',
    toCode: 'ASE',
    slug: 'new-york-aspen',
    title: 'New York City → Aspen',
    description: 'Skip the Denver connection and land steps from the slopes. A nonstop charter from New York to Aspen delivers you directly into the heart of the Rockies — ideal for skiers, families, and holiday travelers seeking luxury, speed, and privacy on the way to one of America\'s premier winter destinations.'
  },
  {
    id: 'los-angeles-telluride',
    from: 'Los Angeles',
    to: 'Telluride',
    fromCode: 'LAX',
    toCode: 'TEX',
    slug: 'los-angeles-telluride',
    title: 'Los Angeles → Telluride',
    description: 'Go from Beverly Hills to the base of the San Juans in under two hours. Telluride\'s remote mountain setting means long drives for most travelers — but not you. Private charters touch down minutes from the village, transforming an all-day trek into a scenic, two-hour escape.'
  },
  {
    id: 'new-york-outer-banks',
    from: 'New York City',
    to: 'Outer Banks',
    fromCode: 'JFK',
    toCode: 'FFA',
    slug: 'new-york-outer-banks',
    title: 'New York City → Outer Banks',
    description: 'Reach the Outer Banks\' pristine beaches in 90 minutes — no traffic, bridges, or layovers required. Fly directly to the islands\' private airfields and step out onto the Carolina coast. It\'s the fastest, most exclusive route to one of the East Coast\'s most peaceful beach retreats.'
  },
  {
    id: 'los-angeles-napa',
    from: 'Los Angeles',
    to: 'Napa Valley',
    fromCode: 'LAX',
    toCode: 'APC',
    slug: 'los-angeles-napa',
    title: 'Los Angeles → Napa Valley',
    description: 'From runway to vineyard in under two hours. Avoid Bay Area congestion entirely and fly straight into the heart of wine country. Whether you\'re touring estates or attending a private tasting, this charter route is the ultimate pairing of convenience and indulgence.'
  },
  {
    id: 'los-angeles-sedona',
    from: 'Los Angeles',
    to: 'Sedona',
    fromCode: 'LAX',
    toCode: 'SEZ',
    slug: 'los-angeles-sedona',
    title: 'Los Angeles → Sedona',
    description: 'Trade freeways for red rocks. A one-and-a-half-hour charter from L.A. lands you atop Sedona\'s scenic mesa, just minutes from its luxury spas and resorts. Forget the long desert drive — this is the effortless, elevated way to begin a restorative weekend.'
  },
  {
    id: 'los-angeles-grand-canyon',
    from: 'Los Angeles',
    to: 'Grand Canyon',
    fromCode: 'LAX',
    toCode: 'GCN',
    slug: 'los-angeles-grand-canyon',
    title: 'Los Angeles → Grand Canyon',
    description: 'Experience one of the Seven Natural Wonders of the World without the crowds or connections. Fly directly from L.A. to the South Rim\'s private airfield — arriving in an hour instead of five. Perfect for exclusive tours, photo excursions, or a family adventure with a VIP touch.'
  },
  {
    id: 'los-angeles-west-yellowstone',
    from: 'Los Angeles',
    to: 'West Yellowstone',
    fromCode: 'LAX',
    toCode: 'WYS',
    slug: 'los-angeles-west-yellowstone',
    title: 'Los Angeles → West Yellowstone',
    description: 'Reach Yellowstone\'s west entrance faster than anyone else. This charter route connects Southern California travelers directly to Montana\'s gateway to nature\'s grandest spectacle — ideal for lodge guests, adventurers, and wildlife photographers seeking both speed and solitude.'
  },
  {
    id: 'new-york-bar-harbor',
    from: 'New York City',
    to: 'Bar Harbor',
    fromCode: 'JFK',
    toCode: 'BHB',
    slug: 'new-york-bar-harbor',
    title: 'New York City → Bar Harbor',
    description: 'Arrive at Acadia National Park\'s doorstep in just two hours. Instead of connecting through Boston or driving for hours, step off your jet and breathe in the Maine coastal air minutes from Bar Harbor\'s marinas, lodges, and seaside restaurants.'
  },
  {
    id: 'new-york-lake-placid',
    from: 'New York City',
    to: 'Lake Placid',
    fromCode: 'JFK',
    toCode: 'LKP',
    slug: 'new-york-lake-placid',
    title: 'New York City → Lake Placid',
    description: 'From Manhattan skyline to mountain peaks in about an hour. Fly straight into the Adirondacks and begin your getaway with Olympic-level scenery and serenity. Skip the five-hour drive — arrive in style for a weekend of skiing, hiking, or lakeside relaxation.'
  },
  {
    id: 'new-york-sea-island',
    from: 'New York City',
    to: 'Sea Island',
    fromCode: 'JFK',
    toCode: 'SSI',
    slug: 'new-york-sea-island',
    title: 'New York City → Sea Island',
    description: 'Indulge in a Southern sanctuary of golf, beaches, and privacy. This nonstop charter brings you from the Northeast directly to Sea Island — bypassing the long drives from Savannah or Jacksonville — and delivers you within minutes of the resort\'s gates and world-class amenities.'
  },
  {
    id: 'los-angeles-lanai',
    from: 'Los Angeles',
    to: 'Lanai, Hawaii',
    fromCode: 'LAX',
    toCode: 'LNY',
    slug: 'los-angeles-lanai',
    title: 'Los Angeles → Lanai, Hawaii',
    description: 'Discover Hawaii\'s most exclusive island — without the layover. A private jet from Los Angeles lands you directly on Lanai, home to the secluded Four Seasons resort. No transfers through Honolulu, no crowds — just a seamless, five-hour journey from your coastal mansion to paradise.'
  }
]

export function getRouteBySlug(slug: string): RouteData | undefined {
  return routes.find(route => route.slug === slug)
}

