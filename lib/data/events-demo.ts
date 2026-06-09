import type { Club, EventListItem, LineupArtist } from "./events"

// Voorbeeld-data zodat de agenda en clubs gevuld lijken, ook zonder records
// in de database. Worden alleen getoond als er nog geen echte data is.

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const now = new Date().toISOString()

function club(
  id: string,
  name: string,
  city: string,
  lat: number,
  lng: number,
  image_url: string,
  description: string,
  capacity: number,
): Club {
  return {
    id,
    name,
    city,
    lat,
    lng,
    image_url,
    description,
    capacity,
    address: null,
    contact_email: null,
    contact_phone: null,
    website_url: null,
    user_id: null,
    created_at: now,
    updated_at: now,
  }
}

export const DEMO_CLUBS: Club[] = [
  club(
    "demo-club-paradiso",
    "Paradiso",
    "Amsterdam",
    52.3624,
    4.8838,
    "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800",
    "Iconische poptempel in een oude kerk aan de Weteringschans. Twee zalen, legendarische line-ups.",
    1500,
  ),
  club(
    "demo-club-nowwow",
    "NOW&WOW",
    "Rotterdam",
    51.9069,
    4.4853,
    "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800",
    "Rauwe Rotterdamse club in de Maassilo. House, techno en disco tot diep in de ochtend.",
    2000,
  ),
  club(
    "demo-club-thuishaven",
    "Thuishaven",
    "Amsterdam",
    52.387,
    4.829,
    "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800",
    "Openlucht- en indoor festivalterrein in West. Bonte kampvuren, kunst en lange techno-nachten.",
    3500,
  ),
]

function artist(
  id: string,
  stage_name: string,
  avatar_url: string | null = null,
): { artists: LineupArtist } {
  return { artists: { id, stage_name, avatar_url } }
}

function event(
  id: string,
  title: string,
  clubId: string,
  city: string,
  dateOffset: number,
  start_time: string,
  end_time: string,
  genre: { id: number; name: string },
  flyer_url: string,
  ticket_price: number,
  min_age: number,
  lineup: { artists: LineupArtist }[],
  description: string,
): EventListItem {
  const c = DEMO_CLUBS.find((x) => x.id === clubId)!
  return {
    id,
    title,
    club_id: clubId,
    organizer_id: null,
    description,
    event_date: daysFromNow(dateOffset),
    start_time,
    end_time,
    genre_id: genre.id,
    city,
    flyer_url,
    ticket_url: "https://example.com/tickets",
    ticket_price,
    min_age,
    published: true,
    created_at: now,
    updated_at: now,
    clubs: { id: c.id, name: c.name, city: c.city },
    genres: genre,
    event_artists: lineup,
  }
}

const HOUSE = { id: 1, name: "House" }
const TECHNO = { id: 2, name: "Techno" }
const DISCO = { id: 3, name: "Disco" }
const HIPHOP = { id: 4, name: "Hip-hop" }

export const DEMO_EVENTS: EventListItem[] = [
  event(
    "demo-event-1",
    "Paradiso Nightclub: Opening Night",
    "demo-club-paradiso",
    "Amsterdam",
    3,
    "23:00",
    "05:00",
    HOUSE,
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
    18,
    18,
    [
      artist("demo-art-1", "Carista"),
      artist("demo-art-2", "Job Jobse"),
      artist("demo-art-3", "Elias Mazian"),
    ],
    "De zomer trapt af in de grote zaal met een line-up vol Amsterdamse helden. Twee floors, non-stop house tot zonsopgang.",
  ),
  event(
    "demo-event-2",
    "Maassilo Techno Marathon",
    "demo-club-nowwow",
    "Rotterdam",
    6,
    "22:00",
    "08:00",
    TECHNO,
    "https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=800",
    25,
    21,
    [
      artist("demo-art-4", "Reinier Zonneveld"),
      artist("demo-art-5", "AIROD"),
      artist("demo-art-6", "L[]Corelli"),
    ],
    "Tien uur rauwe techno in de betonnen hallen van de Maassilo. Eén lange marathon, geen pauze.",
  ),
  event(
    "demo-event-3",
    "Thuishaven Buitenfeest",
    "demo-club-thuishaven",
    "Amsterdam",
    9,
    "16:00",
    "02:00",
    HOUSE,
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800",
    27,
    18,
    [
      artist("demo-art-7", "Sandrien"),
      artist("demo-art-8", "Boris Werner"),
      artist("demo-art-9", "Olde Gunnar"),
    ],
    "Overdag de zon op het terrein, 's avonds vuurkorven en deep house. Het buitenseizoen is begonnen.",
  ),
  event(
    "demo-event-4",
    "Disco Inferno",
    "demo-club-paradiso",
    "Amsterdam",
    13,
    "23:00",
    "04:00",
    DISCO,
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
    20,
    18,
    [artist("demo-art-10", "The Magician"), artist("demo-art-11", "Aeroplane")],
    "Glitter, spiegelbollen en alleen maar disco-klassiekers. Dresscode: zo gek mogelijk.",
  ),
  event(
    "demo-event-5",
    "Rotterdam Hip-hop Night",
    "demo-club-nowwow",
    "Rotterdam",
    17,
    "22:00",
    "04:00",
    HIPHOP,
    "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800",
    22,
    18,
    [artist("demo-art-12", "Sef"), artist("demo-art-13", "Kingsize")],
    "De beste Nederlandse hip-hop op één avond. Live optredens plus DJ-sets tot in de kleine uurtjes.",
  ),
  event(
    "demo-event-6",
    "Sunrise Sessions",
    "demo-club-thuishaven",
    "Amsterdam",
    21,
    "06:00",
    "14:00",
    TECHNO,
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800",
    24,
    18,
    [artist("demo-art-14", "Identified Patient"), artist("demo-art-15", "Nala")],
    "Begin waar anderen stoppen. Een ochtendsessie met hypnotiserende techno terwijl de zon opkomt.",
  ),
]

export function filterDemoEvents(filters: {
  q?: string
  city?: string
  genre?: string
  from?: string
}): EventListItem[] {
  return DEMO_EVENTS.filter((e) => {
    if (filters.q && !e.title.toLowerCase().includes(filters.q.toLowerCase()))
      return false
    if (
      filters.city &&
      !(e.city ?? "").toLowerCase().includes(filters.city.toLowerCase())
    )
      return false
    if (filters.genre) {
      const gid = Number(filters.genre)
      if (!Number.isNaN(gid) && e.genre_id !== gid) return false
    }
    return true
  })
}

export function filterDemoClubs(filters: {
  q?: string
  city?: string
}): Club[] {
  return DEMO_CLUBS.filter((c) => {
    if (filters.q && !c.name.toLowerCase().includes(filters.q.toLowerCase()))
      return false
    if (
      filters.city &&
      !(c.city ?? "").toLowerCase().includes(filters.city.toLowerCase())
    )
      return false
    return true
  })
}
