/**
 * Digital Marketplace Category Taxonomy
 * 
 * Rich editorial category hierarchy for discoverability, mega menu navigation,
 * and multi-faceted product catalog exploration.
 */

export interface SubCategory {
  name: string;
  slug: string;
  description?: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  featured?: boolean;
  subCategories: SubCategory[];
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  {
    id: "cat-design",
    name: "Design",
    slug: "design",
    description: "UI kits, Figma components, design systems, and icon systems.",
    iconName: "Palette",
    featured: true,
    subCategories: [
      { name: "UI Kits", slug: "design" },
      { name: "Design Systems", slug: "design" },
      { name: "Icons", slug: "design" },
      { name: "Mockups", slug: "design" },
    ],
  },
  {
    id: "cat-development",
    name: "Development",
    slug: "development",
    description: "Production boilerplates, React components, full-stack starters, and APIs.",
    iconName: "Code",
    featured: true,
    subCategories: [
      { name: "Next.js & React", slug: "development" },
      { name: "Boilerplates", slug: "development" },
      { name: "Full-Stack Starters", slug: "development" },
      { name: "Developer Tools", slug: "development" },
    ],
  },
  {
    id: "cat-templates",
    name: "Templates",
    slug: "templates",
    description: "Website templates, Notion systems, landing pages, and presentation decks.",
    iconName: "LayoutTemplate",
    featured: true,
    subCategories: [
      { name: "Landing Pages", slug: "templates" },
      { name: "SaaS Dashboards", slug: "templates" },
      { name: "Pitch Decks", slug: "templates" },
      { name: "Resumes & CVs", slug: "templates" },
    ],
  },
  {
    id: "cat-music",
    name: "Music & Audio",
    slug: "music-audio",
    description: "Loops, samples, royalty-free audio, synth patches, and sound packs.",
    iconName: "Music",
    featured: true,
    subCategories: [
      { name: "Sample Packs", slug: "music-audio" },
      { name: "Lo-Fi Beats", slug: "music-audio" },
      { name: "Synth Presets", slug: "music-audio" },
      { name: "Podcast Mastering", slug: "music-audio" },
    ],
  },
  {
    id: "cat-photography",
    name: "Photography",
    slug: "photography",
    description: "Lightroom presets, high-res photo packs, film profiles, and textures.",
    iconName: "Camera",
    featured: true,
    subCategories: [
      { name: "Lightroom Presets", slug: "photography" },
      { name: "35mm Film Profiles", slug: "photography" },
      { name: "Street & Urban", slug: "photography" },
      { name: "Portrait Grading", slug: "photography" },
    ],
  },
  {
    id: "cat-video",
    name: "Video",
    slug: "video",
    description: "DaVinci presets, motion graphics, video LUTs, and transitions.",
    iconName: "Film",
    featured: true,
    subCategories: [
      { name: "LUTs", slug: "video" },
      { name: "Motion Graphics", slug: "video" },
      { name: "DaVinci Presets", slug: "video" },
    ],
  },
  {
    id: "cat-3d",
    name: "3D",
    slug: "3d",
    description: "Blender models, 3D icons, textures, and game-ready assets.",
    iconName: "Box",
    featured: true,
    subCategories: [
      { name: "Blender Assets", slug: "3d" },
      { name: "3D Icons", slug: "3d" },
      { name: "Isometric Scenes", slug: "3d" },
      { name: "Textures & PBR", slug: "3d" },
    ],
  },
  {
    id: "cat-education",
    name: "Education",
    slug: "education",
    description: "Courses, technical guides, video masterclasses, and study notes.",
    iconName: "GraduationCap",
    featured: true,
    subCategories: [
      { name: "System Design", slug: "education" },
      { name: "Architecture Guides", slug: "education" },
      { name: "Workbooks", slug: "education" },
      { name: "Creator Playbooks", slug: "education" },
    ],
  },
  {
    id: "cat-business",
    name: "Business",
    slug: "business",
    description: "Financial models, pitch decks, proposals, and business kits.",
    iconName: "Briefcase",
    featured: true,
    subCategories: [
      { name: "Financial Models", slug: "business" },
      { name: "Pitch Decks", slug: "business" },
      { name: "Consultant Kits", slug: "business" },
      { name: "Cap Tables", slug: "business" },
    ],
  },
  {
    id: "cat-marketing",
    name: "Marketing",
    slug: "marketing",
    description: "Growth playbooks, ad templates, email sequences, and copy kits.",
    iconName: "TrendingUp",
    featured: false,
    subCategories: [
      { name: "Ad Creative", slug: "marketing" },
      { name: "Email Sequences", slug: "marketing" },
      { name: "Growth Playbooks", slug: "marketing" },
    ],
  },
  {
    id: "cat-writing",
    name: "Writing",
    slug: "writing",
    description: "Author toolkits, screenplay templates, and storytelling frameworks.",
    iconName: "PenTool",
    featured: false,
    subCategories: [
      { name: "Novel Frameworks", slug: "writing" },
      { name: "Technical Writing", slug: "writing" },
      { name: "Screenplays", slug: "writing" },
    ],
  },
  {
    id: "cat-productivity",
    name: "Productivity",
    slug: "productivity",
    description: "Notion systems, time-tracking frameworks, and workflow templates.",
    iconName: "CheckSquare",
    featured: false,
    subCategories: [
      { name: "Notion OS", slug: "productivity" },
      { name: "Second Brain", slug: "productivity" },
      { name: "Time Blocking", slug: "productivity" },
    ],
  },
  {
    id: "cat-ai",
    name: "AI",
    slug: "ai",
    description: "Prompt collections, GPT workflow pipelines, and AI fine-tuning guides.",
    iconName: "Sparkles",
    featured: true,
    subCategories: [
      { name: "System Prompts", slug: "ai" },
      { name: "Midjourney Blueprints", slug: "ai" },
      { name: "Agent Workflows", slug: "ai" },
    ],
  },
  {
    id: "cat-fonts",
    name: "Fonts",
    slug: "fonts",
    description: "Display typefaces, variable font families, and typography kits.",
    iconName: "Type",
    featured: false,
    subCategories: [
      { name: "Serif Fonts", slug: "fonts" },
      { name: "Sans-Serif Fonts", slug: "fonts" },
      { name: "Display Type", slug: "fonts" },
    ],
  },
  {
    id: "cat-illustration",
    name: "Illustration",
    slug: "illustration",
    description: "Vector graphics, hand-drawn packs, and character illustrations.",
    iconName: "Smile",
    featured: false,
    subCategories: [
      { name: "Botanical Vectors", slug: "illustration" },
      { name: "Character Avatars", slug: "illustration" },
      { name: "Risograph Brushes", slug: "illustration" },
    ],
  },
  {
    id: "cat-ebooks",
    name: "E-books",
    slug: "ebooks",
    description: "Digital books, deep-dive technical manuals, and whitepapers.",
    iconName: "BookOpen",
    featured: false,
    subCategories: [
      { name: "Engineering Handbooks", slug: "ebooks" },
      { name: "Design Manuals", slug: "ebooks" },
      { name: "Business Guides", slug: "ebooks" },
    ],
  },
];
