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
  { label: "Program", href: "/#program" },
  { label: "Speakers", href: "/#speakers" },
  { label: "Sponsors", href: "/#sponsors" },
  { label: "Organizers", href: "/#organizers" },
] as const;

export const about = {
  statement:
    "A student-led summit at Harvard that brings together students, scholars, entrepreneurs, policymakers and leaders connected to Türkiye.",
  body: [
    "Through interdisciplinary panels and meaningful conversations, the Summit explores Türkiye’s contributions and potential across science, technology, business, culture and global affairs.",
    "Organized by Harvard students in partnership with the Investment and Finance Office of the Presidency of the Republic of Türkiye, it builds a platform for dialogue, innovation and lasting connections between Harvard and Türkiye.",
  ],
  stats: [
    { figure: "300+", label: "Attendees at the inaugural summit, May 2026" },
    { figure: "19", label: "Speakers from government, industry and academia in 2026" },
    { figure: "4", label: "Panels across the 2027 focus areas" },
    { figure: "300–400", label: "Participants expected on May 1, 2027" },
  ],
  photoCaption: "The inaugural summit · David Rubenstein Treehouse, May 2, 2026",
} as const;

export const mission = {
  statement: "Connecting ideas, people and opportunities across borders.",
  blocks: [
    {
      label: "Mission",
      heading: "A space where Turkish leadership and creativity are recognized and celebrated.",
      text: "A multidisciplinary forum exploring Türkiye’s evolving role in the global landscape, at the intersection of academia, technology, entrepreneurship, culture and innovation.",
    },
    {
      label: "Vision",
      heading: "An annual forum at Harvard where Türkiye’s ideas receive lasting international attention.",
      text: "A tradition future generations of students can carry forward, and a lasting platform for dialogue, innovation and connection between Harvard and Türkiye.",
    },
  ],
  whyNow: [
    {
      title: "Global relevance",
      text: "At the crossroads of Europe, the Middle East and Asia, Türkiye plays a unique role in innovation, trade and culture.",
    },
    {
      title: "Harvard stage",
      text: "The second summit brings Türkiye-focused dialogue back to Harvard’s international community.",
    },
    {
      title: "Networking & development",
      text: "Leaders, innovators and organizations connect, forge partnerships and tap into Harvard’s talent network.",
    },
    {
      title: "A growing tradition",
      text: "Building on the inaugural gathering toward a lasting forum between Harvard and Türkiye.",
    },
  ],
} as const;

export const panels = [
  {
    numeral: "I",
    panel: "Panel I",
    time: "11:00",
    area: "Biotechnology & Life Sciences",
    description: "Pharmaceuticals, life sciences, medical technology, healthcare innovation and public health.",
    title: "The Next Biotech Frontier: Türkiye Engineering the Future of Health",
  },
  {
    numeral: "II",
    panel: "Panel II",
    time: "12:00",
    area: "Energy & Infrastructure",
    description: "Renewables, energy transition, critical minerals and sustainable infrastructure.",
    title: "The Engine of Growth: Türkiye’s Energy and Infrastructure Power",
  },
  {
    numeral: "III",
    panel: "Panel III",
    time: "13:40",
    area: "Economy & Investment",
    description: "Emerging markets, entrepreneurship, global finance, trade, investment and corporate transformation.",
    title: "Capital Without Borders: Türkiye’s Economic Ascent",
  },
  {
    numeral: "IV",
    panel: "Panel IV",
    time: "14:40",
    area: "Geopolitics, Diplomacy & Defense",
    description: "Türkiye’s role in international affairs, diplomacy, regional security and the defense sector.",
    title: "Shifting Balance of Power: Türkiye on the World Stage",
  },
] as const;

export const theme = {
  subtitle: "From regional power to global force. Four focus areas, one panel each.",
} as const;

export const speakers = {
  title: "Speakers to be announced",
  subtitle:
    "Officials, investors, founders and scholars across the four focus areas. Announcements are coming soon.",
  slots: [
    { tag: "Keynote", role: "Keynote speaker" },
    ...panels.map((panel) => ({ tag: panel.panel, role: panel.area })),
  ],
} as const;

export type ScheduleEntry = {
  kind: "session" | "break";
  start: string;
  end: string;
  title: string;
  track?: string;
  format?: string;
};

export const schedule: ScheduleEntry[] = [
  { kind: "session", start: "09:00", end: "10:00", title: "Registration and coffee", format: "Arrival" },
  { kind: "session", start: "10:00", end: "10:40", title: "Opening remarks and keynote speeches", format: "Keynote" },
  { kind: "break", start: "10:40", end: "11:00", title: "Break" },
  { kind: "session", start: "11:00", end: "11:40", title: panels[0].title, track: panels[0].area, format: panels[0].panel },
  { kind: "break", start: "11:40", end: "12:00", title: "Break" },
  { kind: "session", start: "12:00", end: "12:40", title: panels[1].title, track: panels[1].area, format: panels[1].panel },
  { kind: "session", start: "12:40", end: "13:40", title: "Lunch break and sponsor exhibitions", format: "Lunch" },
  { kind: "session", start: "13:40", end: "14:20", title: panels[2].title, track: panels[2].area, format: panels[2].panel },
  { kind: "break", start: "14:20", end: "14:40", title: "Break" },
  { kind: "session", start: "14:40", end: "15:20", title: panels[3].title, track: panels[3].area, format: panels[3].panel },
  { kind: "break", start: "15:20", end: "15:30", title: "Break" },
  { kind: "session", start: "15:30", end: "16:00", title: "Closing speeches", format: "Closing" },
  { kind: "session", start: "16:00", end: "17:00", title: "Networking session", format: "Networking" },
];

export const gala = {
  start: "20:00",
  end: "23:00",
  title: "Gala, cocktail reception and networking",
  note: "Evening program · Venue to be announced",
  ticketNote: "Separate ticket",
} as const;

export const programNotes = {
  ticketing: "Summit and Gala are ticketed separately. Speaker details to be confirmed.",
  status: "Preliminary, subject to change",
} as const;

export const tickets = {
  title: "Two events, two tickets.",
  intro: "The Summit and the evening Gala are ticketed separately. Join us for one, or for both.",
  options: [
    {
      id: "summit",
      kicker: "Summit pass",
      hours: event.summitHours,
      title: "Harvard Türkiye Summit",
      meta: `${event.dateLabel} · ${event.venue}`,
      includes: [
        "Opening remarks and keynote speeches",
        "Four panels: biotech, energy, economy and geopolitics",
        "Lunch and sponsor exhibitions",
        "Afternoon networking session",
      ],
      price: "To be announced",
      action: "Register for the Summit",
      href: links.registerSummit,
    },
    {
      id: "gala",
      kicker: "Gala",
      hours: event.galaHours,
      title: "The Summit Gala",
      meta: `${event.dateLabel} · Venue to be announced`,
      includes: [
        "Cocktail reception",
        "Evening networking with guests and partners",
        "Venue details shared with ticket holders",
        "Ticketed separately from the Summit Pass",
      ],
      price: "To be announced",
      action: "Register for the Gala",
      href: links.registerGala,
    },
  ],
} as const;

export const preRegistration = {
  title: "Be first in line for 2027.",
  body: "Tickets are not on sale yet. Pre-register and we will email you first when Summit and Gala tickets open, along with speaker and program announcements.",
  steps: [
    "Pre-register in under a minute",
    "Get early access by email when tickets open",
    "Choose the Summit, the Gala, or both",
  ],
} as const;

export const attendeeTypes = ["Student", "Academic", "Professional", "Media", "Sponsor or partner"] as const;

export const dietaryOptions = ["No requirements", "Vegetarian", "Vegan", "Halal", "Gluten-free", "Other"] as const;

export const organizers = {
  title: "Student-led, in partnership with the Investment and Finance Office.",
  intro:
    "A joint initiative with the Investment and Finance Office of the Presidency of the Republic of Türkiye and members of the broader Harvard community.",
  committee: {
    kicker: "Organizer",
    name: "Harvard Türkiye Summit organizing committee",
    description:
      "A student-led team at Harvard University bringing together students, scholars, entrepreneurs, policymakers and leaders connected to Türkiye.",
  },
  partner: {
    kicker: "In partnership with",
    name: "Presidency of the Republic of Türkiye Investment and Finance Office",
    description:
      "The official organization promoting Türkiye’s investment opportunities to the global business community and supporting investors before, during and after their entry into Türkiye.",
  },
  teamTitle: "Organizing team 2027",
  teamNote: "Full committee announced soon",
  team: [
    { name: "Elif Lara Okyay", role: "Co-President", email: "laraokyay@college.harvard.edu", linkedin: undefined },
    { name: "Merve Çakır", role: "Co-President", email: "mervecakir@college.harvard.edu", linkedin: undefined },
    { name: "Yavuz Atlamaz", role: "Treasurer", email: undefined, linkedin: undefined },
  ] as { name: string; role: string; email?: string; linkedin?: string }[],
  teamPlaceholder: { title: "And the full team", note: "Committee leads to be announced" },
};

export const sponsors = {
  title: "The partners who make the summit possible.",
  intro:
    "2027 sponsors will be announced in the coming months. Interested in partnering? We would love to hear from you.",
  mainPartner: { name: "Main partner", note: "Confirmed" },
  openTiers: [
    { name: "Platinum", note: "To be announced", slots: 2 },
    { name: "Gold", note: "To be announced", slots: 3 },
    { name: "Silver", note: "To be announced", slots: 4 },
  ],
  slotText: "Your logo here",
  become: {
    title: "Connect with a focused, international audience.",
    body: "Silver, Gold and Platinum packages, plus à la carte add-ons such as exhibition booths, handbook features and sponsored sessions.",
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
        { label: "Program", href: "/#program" },
        { label: "Speakers", href: "/#speakers" },
        { label: "Organizers", href: "/#organizers" },
        { label: "Sponsors", href: "/#sponsors" },
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
  contacts: organizers.team.filter((member) => member.email).map((member) => ({
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
