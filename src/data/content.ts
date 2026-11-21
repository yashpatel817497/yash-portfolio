// The single source of truth for the site's default content and its shape.
// The Worker imports this module too: it validates and stores the same shape in
// D1, so client and server always agree on what a valid document looks like.

export const SECTION_TYPES = ['hero', 'work', 'about', 'skills', 'custom'] as const
export type SectionType = (typeof SECTION_TYPES)[number]

export interface Social {
  label: string
  href: string
}

export interface Section {
  id: string
  type: SectionType
  visible: boolean
  navLabel: string
  eyebrow: string
  heading: string
  note: string
  image: string
  links: Social[]
}

export interface Theme {
  bg: string
  surface: string
  fg: string
  accent: string
  accent2: string
}

export interface Project {
  id: string
  title: string
  category: string
  year: string
  summary: string
  description: string
  tags: string[]
  link?: string
  repo?: string
  hue: number
  image?: string
}

export interface Stat {
  value: string
  label: string
}

export interface Content {
  name: string
  role: string
  titles: string[]
  tagline: string
  intro: string
  bio: string[]
  location: string
  email: string
  phone: string
  available: boolean
  portrait: string
  footerHeading: string
  footerNote: string
  socials: Social[]
  stats: Stat[]
  skills: string[]
  projects: Project[]
  sections: Section[]
  theme: Theme
}

export const defaultTheme: Theme = {
  bg: '#050505',
  surface: '#0b0b0c',
  fg: '#f4f1ef',
  accent: '#ff2d2d',
  accent2: '#ff7a45',
}

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: 'Hero',
  work: 'Selected work',
  about: 'About',
  skills: 'Skills marquee',
  custom: 'Custom section',
}

export const defaultContent: Content = {
  name: 'Yash Patel',
  role: 'AI-ML Student',
  titles: ['C++ & Python', 'Full-stack development', 'Artificial intelligence', 'Aspiring software developer'],
  tagline: 'Learning AI, building software.',
  intro:
    'AI-ML undergraduate at Madhav Institute of Technology and Science (MITS-DU), Gwalior, and an aspiring software developer with strong foundations in C++ and Python — focused on full-stack web development and exploring artificial intelligence and emerging technologies through hands-on projects.',
  bio: [
    'AI-ML undergraduate at Madhav Institute of Technology and Science (MITS-DU), Gwalior, and an aspiring software developer with strong foundations in C++ and Python.',
    'My work sits between full-stack web development and software engineering. I like taking an idea from a rough prototype to something deployed and usable, and I use hands-on projects to explore artificial intelligence and emerging technologies.',
    'Outside coursework I build with Next.js and Supabase, compete in hackathons and technical events, and keep sharpening data structures, algorithms and core computer science fundamentals.',
  ],
  location: 'Gwalior, India',
  email: '',
  phone: '',
  available: true,
  portrait: '/portrait.png',
  footerHeading: "Let's build\nsomething useful.",
  footerNote: 'Open to internships and software development roles.',
  socials: [{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/yash-patel-aiml' }],
  stats: [],
  skills: [
    'C++',
    'Python',
    'JavaScript',
    'HTML5',
    'CSS3',
    'Data Structures & Algorithms',
    'Object-Oriented Programming',
    'Machine Learning Foundations',
    'OSI & TCP/IP Models',
    'IPv4 CIDR Subnetting',
    'DNS Resolution',
    'NAT',
    'Next.js',
    'Supabase',
    'Vercel',
    'Git & GitHub',
    'Cisco Packet Tracer',
    'VS Code',
    'IntelliJ IDEA',
    'Google Colab',
    'Kaggle',
  ],
  projects: [
    {
      id: 'deptlib',
      title: 'DeptLib',
      category: 'Library management',
      year: '',
      summary: 'A department-wise library management system for academic cataloging and circulation.',
      description:
        'DeptLib is a department-wise library management portal built for academic cataloging and circulation workflows. It was built with Next.js and deployed on Vercel, with a second deployment hosted on FreeBuff.\n\nAs team lead and full-stack developer, working with Saransh Gupta and Hari Om Shrivastava, I architected the portal and engineered an admin-restricted, role-based authentication flow that separates student access from administrative inventory privileges.\n\nDepartment-level book categorization, issue-request tracking, copy-count management, a student feedback pipeline and a book recommendation system make up the rest of the product.\n\nLive at deptlib-mits-ten.vercel.app and deptlib-eu37kj.freebuff.site.',
      tags: ['Next.js', 'Role-based auth', 'Vercel', 'FreeBuff'],
      link: 'https://deptlib-mits-ten.vercel.app',
      repo: '',
      hue: 356,
    },
  ],
  sections: [
    {
      id: 'hero',
      type: 'hero',
      visible: true,
      navLabel: '',
      eyebrow: '',
      heading: '',
      note: '',
      image: '',
      links: [],
    },
    {
      id: 'about',
      type: 'about',
      visible: true,
      navLabel: 'About',
      eyebrow: '01 — About',
      heading: 'AI-ML student,\nsoftware developer.',
      note: '',
      image: '/portrait.png',
      links: [],
    },
    {
      id: 'work',
      type: 'work',
      visible: true,
      navLabel: 'Work',
      eyebrow: '02 — Featured project',
      heading: 'DeptLib',
      note: 'A department-wise library portal built for MITS.',
      image: '',
      links: [],
    },
    {
      id: 'skills',
      type: 'skills',
      visible: true,
      navLabel: 'Skills',
      eyebrow: '03 — Technical skills',
      heading: 'What I work with',
      note: 'Languages, CS fundamentals and the tools I build with.',
      image: '',
      links: [],
    },
    {
      id: 'education',
      type: 'custom',
      visible: true,
      navLabel: 'Education',
      eyebrow: '04 — Education',
      heading: 'B.Tech in Artificial\nIntelligence & Machine Learning',
      note: 'Madhav Institute of Technology and Science (MITS-DU), Gwalior.\n\nUndergraduate study in artificial intelligence and machine learning, covering data structures and algorithms, object-oriented programming, and machine learning foundations alongside full-stack web development.',
      image: '',
      links: [],
    },
    {
      id: 'events',
      type: 'custom',
      visible: true,
      navLabel: 'Events',
      eyebrow: '05 — Hackathons & events',
      heading: 'Competitions and\ntechnical events',
      note: 'HackSynapse Hackathon — competed in round 1, focused on rapid technical prototyping and algorithmic problem solving.\n\nTech-Odyssey, IEEE Computer Society Student Branch (MITS) — took part in the flagship technical competition and developer event.',
      image: '',
      links: [],
    },
  ],
  theme: defaultTheme,
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function flag(value: unknown, fallback = true): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function strings(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string')
}

function links(value: unknown, fallback: Social[] = []): Social[] {
  if (!Array.isArray(value)) return fallback
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({ label: text(item.label), href: text(item.href) }))
    .filter((item) => item.label || item.href)
}

function theme(value: unknown): Theme {
  const input = value && typeof value === '
