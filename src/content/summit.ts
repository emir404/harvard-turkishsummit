/**
 * All copy and data for the 2027 site. Links whose destination is not known
 * yet are left `undefined` and render as plain text until they are filled in.
 */

export const event = {
  name: "Harvard Türkiye Summit",
  edition: "Second edition",
  theme: "Türkiye Beyond the Crossroads",
  subtheme: "From Regional Power to Global Force",
  date: "2027-05-01",
  dateLabel: "Saturday, May 1, 2027",
  dateShort: "Sat, May 1, 2027",
  venue: "David Rubenstein Treehouse, Harvard University",
  venueShort: "David Rubenstein Treehouse, Harvard",
  address: "20 Western Ave, Boston, MA",
  addressShort: "20 Western Ave, Boston",
  summitHours: "09:00–17:00",
  galaHours: "20:00–23:00",
} as const;

export const links = {
  calendar: "/harvard-turkiye-summit-2027.ics",
  agendaPdf: undefined as string | undefined,
  sponsorshipPackage: undefined as string | undefined,
  privacyPolicy: undefined as string | undefined,
  termsOfService: undefined as string | undefined,
  pressKit: undefined as string | undefined,
  instagram: undefined as string | undefined,
  linkedin: undefined as string | undefined,
  registerSummit: "/register/summit",
  registerGala: "/register/gala",
};

export const navigation = [
  { label: "About", href: "/#about" },
  { label: "Speakers", href: "/#speakers" },
  { label: "Agenda", href: "/#program" },
  { label: "Partners", href: "/#partners" },
] as const;

export const hero = {
  edition: "Second edition · Spring 2027",
  badge: "Spring 2027 · Date to be announced",
  title: ["Harvard College", "Türkiye Summit"],
  cta: { label: "Get tickets", href: "/#tickets" },
  about: {
    title: "About the summit",
    text: "A one-day summit at Harvard that puts the top Turkish university students in the US in a room with Türkiye’s officials, investors and founders.",
  },
  partnersLabel: "In partnership with",
  scrollCue: "Scroll",
} as const;

/** The running line under the hero. */
export const themes = ["Energy", "Education", "Technology", "Future of Türkiye", "Geopolitics"] as const;

/** Numbered labels that open each section. */
export const sections = {
  about: { index: "01", label: "About" },
  mission: { index: "02", label: "Mission & vision" },
  speakers: { index: "03", label: "Speakers" },
  program: { index: "04", label: "Program" },
  tickets: { index: "05", label: "Tickets" },
  team: { index: "06", label: "Organizing team" },
  partners: { index: "07", label: "Partners" },
} as const;

export const about = {
  title: "A student-led summit at Harvard",
  text: "Students, scholars, founders and policymakers connected to Türkiye, together for one day of panels and conversation.",
  stats: [
    { figure: "300+", label: "Attendees at the inaugural summit" },
    { figure: "19", label: "Speakers in 2026" },
    { figure: "4", label: "Panels in 2027" },
    { figure: "300–400", label: "Guests expected in 2027" },
  ],
  photos: [
    {
      id: "auditorium",
      alt: "Audience facing the stage at the inaugural summit in the David Rubenstein Treehouse",
      caption: "The inaugural summit · David Rubenstein Treehouse, May 2026",
    },
    {
      id: "panel",
      alt: "Panel discussion on stage at the inaugural summit",
      caption: "Panel discussion · 2026",
    },
    {
      id: "keynote",
      alt: "Speaker presenting to the audience at the inaugural summit",
      caption: "Keynote · 2026",
    },
  ],
} as const;

export const mission = {
  title: "Connecting ideas, people and opportunities across borders.",
  /** Ties the scene back to the hero: the Harvard house, then Istanbul. */
  lead: "From a Harvard courtyard to the Bosphorus.",
  items: [
    {
      label: "Mission",
      text: "A space where Turkish leadership and creativity are recognized and celebrated.",
    },
    {
      label: "Vision",
      text: "An annual forum at Harvard where Türkiye’s ideas receive lasting international attention.",
    },
  ],
  drawingLabel: "Line drawing of a suspension bridge across the Bosphorus, joining Europe and Asia",
} as const;

/** Isometric drawings that stand for each part of the program (src/components/iso/drawings). */
export type IconName = "keynote" | "biotech" | "energy" | "economy" | "geopolitics";

export const panels = [
  {
    numeral: "I",
    panel: "Panel I",
    time: "11:00",
    end: "11:40",
    icon: "biotech",
    area: "Biotechnology & Life Sciences",
    short: "Biotech & Life Sciences",
    title: "The Next Biotech Frontier: Türkiye Engineering the Future of Health",
  },
  {
    numeral: "II",
    panel: "Panel II",
    time: "12:00",
    end: "12:40",
    icon: "energy",
    area: "Energy & Infrastructure",
    short: "Energy & Infrastructure",
    title: "The Engine of Growth: Türkiye’s Energy and Infrastructure Power",
  },
  {
    numeral: "III",
    panel: "Panel III",
    time: "13:40",
    end: "14:20",
    icon: "economy",
    area: "Economy & Investment",
    short: "Economy & Investment",
    title: "Capital Without Borders: Türkiye’s Economic Ascent",
  },
  {
    numeral: "IV",
    panel: "Panel IV",
    time: "14:40",
    end: "15:20",
    icon: "geopolitics",
    area: "Geopolitics, Diplomacy & Defense",
    short: "Geopolitics & Defense",
    title: "Shifting Balance of Power: Türkiye on the World Stage",
  },
] as const;

export const speakers = {
  title: "Speakers to be announced",
  text: "Officials, investors, founders and scholars, one stage at a time. Announcements are coming soon.",
  cards: [
    { tag: "Keynote", time: "10:00", role: "Keynote speaker", icon: "keynote" as IconName },
    ...panels.map((panel) => ({ tag: panel.panel, time: panel.time, role: panel.short, icon: panel.icon as IconName })),
  ],
  status: "To be announced",
  inquiry: "Speaker inquiries",
} as const;

export type ProgramItem = {
  start: string;
  end: string;
  title: string;
  /** Set for the four panels. */
  panel?: (typeof panels)[number];
};

export const program = {
  title: "One day at the Treehouse",
  blocks: [
    {
      id: "morning",
      label: "Morning",
      start: "09:00",
      end: "12:40",
      items: [
        { start: "09:00", end: "10:00", title: "Registration and coffee" },
        { start: "10:00", end: "10:40", title: "Opening remarks and keynote speeches" },
        { start: panels[0].time, end: panels[0].end, title: panels[0].title, panel: panels[0] },
        { start: panels[1].time, end: panels[1].end, title: panels[1].title, panel: panels[1] },
      ],
    },
    {
      id: "afternoon",
      label: "Afternoon",
      start: "12:40",
      end: "17:00",
      items: [
        { start: "12:40", end: "13:40", title: "Lunch and sponsor exhibitions" },
        { start: panels[2].time, end: panels[2].end, title: panels[2].title, panel: panels[2] },
        { start: panels[3].time, end: panels[3].end, title: panels[3].title, panel: panels[3] },
        { start: "15:30", end: "16:00", title: "Closing speeches" },
        { start: "16:00", end: "17:00", title: "Networking session" },
      ],
    },
  ] satisfies readonly { id: string; label: string; start: string; end: string; items: readonly ProgramItem[] }[],
  note: "Short breaks between sessions · Preliminary, subject to change",
} as const;

export const gala = {
  label: "Evening",
  start: "20:00",
  end: "23:00",
  title: "The Summit Gala",
  text: "Cocktail reception and evening networking with speakers, guests and partners.",
  note: "Venue to be announced",
  ticketNote: "Separate ticket",
} as const;

export const tickets = {
  title: "Two events, two tickets.",
  intro: "The Summit and the evening Gala are ticketed separately. Join us for one, or both.",
  options: [
    {
      id: "summit",
      kicker: "Summit pass",
      hours: event.summitHours,
      title: "The Summit",
      meta: "David Rubenstein Treehouse",
      includes: ["Keynotes and four panels", "Lunch and sponsor exhibitions", "Afternoon networking"],
      price: "To be announced",
      action: "Register",
      href: links.registerSummit,
    },
    {
      id: "gala",
      kicker: "Gala",
      hours: event.galaHours,
      title: "The Gala",
      meta: "Venue to be announced",
      includes: ["Cocktail reception", "Evening networking", "Ticketed separately"],
      price: "To be announced",
      action: "Register",
      href: links.registerGala,
    },
  ],
} as const;

export const preRegistration = {
  title: "Be first in line.",
  body: "Tickets aren’t on sale yet. Pre-register and we’ll email you the moment Summit and Gala tickets open.",
  /** The two emails the phone beside the form receives, oldest first. */
  phone: [
    {
      title: "You’re on the list",
      body: "We’ll write the moment Summit and Gala tickets open.",
      time: "2w ago",
    },
    {
      title: "Tickets are open",
      body: "You’re first in line. Summit and Gala passes for May 1 are on sale now.",
      time: "now",
    },
  ],
};

export const attendeeTypes = ["Student", "Academic", "Professional", "Media", "Sponsor or partner"] as const;

export const dietaryOptions = ["No requirements", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] as const;

export const team = {
  title: "Run by students at Harvard",
  text: "A student-led team, in partnership with the Investment and Finance Office of the Presidency of the Republic of Türkiye.",
  members: [
    { name: "Elif Lara Okyay", role: "Co-President", email: "laraokyay@college.harvard.edu", linkedin: undefined },
    { name: "Merve Çakır", role: "Co-President", email: "mervecakir@college.harvard.edu", linkedin: undefined },
    { name: "Yavuz Atlamaz", role: "Treasurer", email: undefined, linkedin: undefined },
  ] as { name: string; role: string; email?: string; linkedin?: string }[],
  more: { title: "And the full team", note: "Committee announced soon" },
};

export const partners = {
  title: "The partners who make it possible.",
  list: [
    {
      id: "ifo",
      role: "Main partner",
      name: "Presidency of the Republic of Türkiye Investment and Finance Office",
    },
    { id: "nexus", role: "Partner", name: "Nexus of the World" },
  ],
  become: {
    title: "Become a sponsor",
    text: "Connect with a focused, international audience. Silver, Gold and Platinum packages, plus booths, handbook features and sponsored sessions.",
  },
} as const;

export const mailingList = {
  title: "Stay in the loop.",
  body: "Speaker announcements, ticket releases and program news. A few emails a season, never spam.",
  note: "By subscribing you agree to our Privacy Policy.",
} as const;

export const footer = {
  tagline: "Bridging academia and leadership to explore Türkiye’s global future.",
  columns: [
    {
      title: "Summit",
      links: [
        { label: "About", href: "/#about" },
        { label: "Mission & vision", href: "/#mission" },
        { label: "Speakers", href: "/#speakers" },
        { label: "Program", href: "/#program" },
        { label: "Organizing team", href: "/#team" },
        { label: "Partners", href: "/#partners" },
      ],
    },
    {
      title: "Get involved",
      links: [
        { label: "Summit tickets", href: links.registerSummit },
        { label: "Gala tickets", href: links.registerGala },
        { label: "Pre-register", href: "/#pre-register" },
        { label: "Become a sponsor", href: "/#become-a-sponsor" },
        { label: "Speaker inquiries", href: "/#contact" },
      ],
    },
  ],
  contacts: team.members
    .filter((member) => member.email)
    .map((member) => ({
      name: `${member.name}, ${member.role}`,
      email: member.email as string,
    })),
  legal: [
    { label: "Privacy Policy", href: links.privacyPolicy },
    { label: "Terms of Service", href: links.termsOfService },
    { label: "Press Kit", href: links.pressKit },
  ],
  copyright: "© 2027 Harvard Türkiye Summit · Not an official Harvard University event.",
  locations: "Boston, MA · Istanbul, TR",
};
