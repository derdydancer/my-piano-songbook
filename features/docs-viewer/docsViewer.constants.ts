
export interface DocFile {
  name: string;
  path: string; // Relative path from public/ or root if served directly
  description: string;
}

export const AVAILABLE_DOCS: DocFile[] = [
  {
    name: "Feature Organization & Dev Guide",
    path: "docs/FeatureOrganization.md",
    description: "Project structure and guide for adding new utilities."
  },
  {
    name: "Bar Loading Logic",
    path: "docs/BarLoadingLogic.md",
    description: "Details on bar loading calculations and optimization."
  },
  // Add new doc files here
  // Example: { name: "My New Doc", path: "docs/MyNewDoc.md", description: "About my new doc." }
];
