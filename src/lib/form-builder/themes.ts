export interface FormTheme {
  id: string;
  name: string;
  gradient: string; // CSS gradient used as a placeholder thumbnail
  accentColor: string; // primary button / accent color for the theme
}

export const FORM_THEMES: FormTheme[] = [
  {
    id: "default",
    name: "Default",
    gradient: "linear-gradient(135deg, #d9f2ea, #f4faf7)",
    accentColor: "#16a34a",
  },
  {
    id: "nebula",
    name: "Nebula",
    gradient: "linear-gradient(135deg, #6366f1, #a855f7)",
    accentColor: "#6366f1",
  },
  {
    id: "law-bridge",
    name: "Law Bridge",
    gradient: "linear-gradient(135deg, #92703a, #4b3419)",
    accentColor: "#92703a",
  },
  {
    id: "nightfall",
    name: "Nightfall",
    gradient: "linear-gradient(135deg, #1e1b4b, #0f0e2a)",
    accentColor: "#818cf8",
  },
  {
    id: "pawfect-friends",
    name: "Pawfect Friends",
    gradient: "linear-gradient(135deg, #be123c, #f43f5e)",
    accentColor: "#be123c",
  },
  {
    id: "blue-desk",
    name: "Blue Desk",
    gradient: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
    accentColor: "#0ea5e9",
  },
];

export const DEFAULT_THEME_ID = "default";
