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
    description: "UI kits, Figma components, design systems, vector illustrations and 3D assets.",
    iconName: "Palette",
    featured: true,
    subCategories: [
      { name: "UI Kits", slug: "ui-kits" },
      { name: "Figma Resources", slug: "figma-resources" },
      { name: "Design Systems", slug: "design-systems" },
      { name: "Icons", slug: "icons" },
      { name: "Illustrations", slug: "illustrations" },
      { name: "Mockups", slug: "mockups" },
      { name: "3D Assets", slug: "3d-assets" },
    ],
  },
  {
    id: "cat-development",
    name: "Development",
    slug: "development",
    description: "Production boilerplates, React components, full-stack templates, and APIs.",
    iconName: "Code",
    featured: true,
    subCategories: [
      { name: "React", slug: "react" },
      { name: "Next.js", slug: "nextjs" },
      { name: "HTML/CSS", slug: "html-css" },
      { name: "JavaScript", slug: "javascript" },
      { name: "WordPress", slug: "wordpress" },
      { name: "Components", slug: "components" },
      { name: "Boilerplates", slug: "boilerplates" },
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
      { name: "Website Templates", slug: "website-templates" },
      { name: "Landing Pages", slug: "landing-pages" },
      { name: "Dashboard Templates", slug: "dashboard-templates" },
      { name: "Resume Templates", slug: "resume-templates" },
      { name: "Presentation Templates", slug: "presentation-templates" },
      { name: "Notion Templates", slug: "notion-templates" },
    ],
  },
  {
    id: "cat-business",
    name: "Business",
    slug: "business",
    description: "Financial models, marketing playbooks, spreadsheets, and operational systems.",
    iconName: "Briefcase",
    featured: true,
    subCategories: [
      { name: "Business Templates", slug: "business-templates" },
      { name: "Finance & Runway", slug: "finance" },
      { name: "Marketing Playbooks", slug: "marketing" },
      { name: "Sales Pipelines", slug: "sales" },
      { name: "Productivity", slug: "productivity" },
    ],
  },
  {
    id: "cat-education",
    name: "Education",
    slug: "education",
    description: "Deep-dive e-books, engineering guides, video masterclasses, and study notes.",
    iconName: "GraduationCap",
    featured: true,
    subCategories: [
      { name: "Courses", slug: "courses" },
      { name: "Study Resources", slug: "study-resources" },
      { name: "E-books", slug: "ebooks" },
      { name: "Developer Guides", slug: "guides" },
    ],
  },
  {
    id: "cat-creative",
    name: "Creative",
    slug: "creative",
    description: "Fonts, audio loops, stock photography, video LUTs, and digital brushes.",
    iconName: "Camera",
    featured: true,
    subCategories: [
      { name: "Photography", slug: "photography" },
      { name: "Music & Audio", slug: "music" },
      { name: "Video & LUTs", slug: "video" },
      { name: "Fonts & Type", slug: "fonts" },
      { name: "Graphics", slug: "graphics" },
    ],
  },
  {
    id: "cat-ai",
    name: "AI & Machine Learning",
    slug: "ai",
    description: "Tested prompt packs, AI agent workflows, embeddings templates, and LLM guides.",
    iconName: "Sparkles",
    featured: true,
    subCategories: [
      { name: "Prompt Packs", slug: "prompt-packs" },
      { name: "AI Workflows", slug: "ai-workflows" },
      { name: "AI Templates", slug: "ai-templates" },
      { name: "Model Resources", slug: "ai-resources" },
    ],
  },
];
