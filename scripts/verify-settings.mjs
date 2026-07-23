/**
 * Verify SRS §27 Settings coverage
 * Usage: npx tsx scripts/verify-settings.mjs
 */
import {
  SETTINGS_CATEGORIES,
  MY_PREFERENCES_TABS,
  SETTINGS_TOOLBAR,
  settingsCoverageStats,
  allSettingsPaths,
} from "../src/lib/settings/settings-config.ts";
import {
  SETTINGS_SCHEMAS,
  assertFullSchemaCoverage,
  getSettingsSchema,
} from "../src/lib/settings/settings-schemas.ts";

const EXPECTED = {
  organization: 19,
  "users-and-access": 9,
  "crm-configuration": 15,
  "workflow-and-automation": 9,
  communication: 14,
  templates: 10,
  "forms-and-client-experience": 6,
  finance: 7,
  ai: 7,
  integrations: 21,
  security: 15,
  notifications: 9,
  "reports-and-analytics": 6,
  "data-management": 9,
  marketplace: 5,
  "subscription-and-billing": 8,
  developer: 7,
  system: 12,
  "help-and-support": 6,
};

const REQUIRED_TITLES = {
  organization: [
    "Company Profile",
    "Branding",
    "Business Information",
    "Business Hours",
    "Holidays",
    "Time Zone",
    "Language",
    "Currency",
    "Regional Settings",
    "Multi-Currency",
    "Multi-Language",
    "Themes",
    "Dark Mode",
    "Accent Colors",
    "Sidebar Layout",
    "White Label",
    "Email Branding",
    "Login Page Branding",
    "Favicon",
  ],
  communication: ["Facebook Page", "Instagram Business", "WhatsApp Business"],
  "crm-configuration": ["Industry Preset"],
  marketplace: ["Template Marketplace"],
  system: ["Queue Monitor"],
  ai: ["AI Usage / Credits"],
  notifications: [
    "Email",
    "SMS",
    "Push",
    "In-App Notifications",
    "Notification Rules",
    "Mentions",
    "Digest Settings",
    "Push Notification Settings",
    "Mobile App Settings",
  ],
};

const TOOLBAR_LABELS = [
  "Search Settings",
  "Favorites",
  "Audit History",
  "Quick Create",
  "Help",
  "My Preferences",
];

const PREF_TABS = ["Profile", "Signature", "Password", "Notifications", "Theme"];

let fail = 0;
const stats = settingsCoverageStats();
const expectedPages = Object.values(EXPECTED).reduce((a, b) => a + b, 0);

console.log("\n§27 Settings coverage verification\n");

if (stats.sections !== 19) {
  console.log(`FAIL  sections: got ${stats.sections}, expected 19`);
  fail++;
} else console.log("PASS  19 sections");

if (stats.pages !== expectedPages) {
  console.log(`FAIL  pages: got ${stats.pages}, expected ${expectedPages}`);
  fail++;
} else console.log(`PASS  ${stats.pages} pages`);

for (const cat of SETTINGS_CATEGORIES) {
  const want = EXPECTED[cat.slug];
  const got = cat.items.length;
  if (want !== got) {
    console.log(
      `FAIL  ${cat.section} ${cat.slug}: ${got} items, expected ${want}`,
    );
    fail++;
  } else {
    console.log(`PASS  ${cat.section} ${cat.title} (${got})`);
  }

  const required = REQUIRED_TITLES[cat.slug];
  if (required) {
    for (const title of required) {
      if (!cat.items.some((i) => i.title === title)) {
        console.log(`FAIL  missing "${title}" in ${cat.slug}`);
        fail++;
      }
    }
  }

  if (cat.slug === "organization") {
    for (const bad of ["Date Format", "Time Format", "Number Format"]) {
      if (cat.items.some((i) => i.title === bad)) {
        console.log(
          `FAIL  org still has separate "${bad}" (fold into Regional Settings)`,
        );
        fail++;
      }
    }
  }
}

const missingSchemas = assertFullSchemaCoverage();
if (missingSchemas.length) {
  console.log(`FAIL  missing schemas: ${missingSchemas.join(", ")}`);
  fail++;
} else {
  console.log(
    `PASS  schemas for all ${Object.keys(SETTINGS_SCHEMAS).length} registry keys`,
  );
}

const paths = allSettingsPaths();
const dup = new Map();
for (const p of paths) dup.set(p.key, (dup.get(p.key) || 0) + 1);
const dups = [...dup.entries()].filter(([, n]) => n > 1);
if (dups.length) {
  console.log(`FAIL  duplicate schema keys`);
  fail++;
} else console.log("PASS  unique schema keys");

for (const label of TOOLBAR_LABELS) {
  if (!SETTINGS_TOOLBAR.some((t) => t.label === label)) {
    console.log(`FAIL  toolbar missing "${label}"`);
    fail++;
  }
}
console.log(`PASS  toolbar has ${SETTINGS_TOOLBAR.length} actions`);

for (const title of PREF_TABS) {
  const tab = MY_PREFERENCES_TABS.find((t) => t.title === title);
  if (!tab) {
    console.log(`FAIL  My Preferences missing tab "${title}"`);
    fail++;
    continue;
  }
  const schema = getSettingsSchema("my-preferences", tab.slug);
  if (!schema?.fields?.length) {
    console.log(`FAIL  My Preferences schema empty for ${tab.slug}`);
    fail++;
  }
}
console.log(`PASS  My Preferences ${MY_PREFERENCES_TABS.length} tabs with schemas`);

const linked = paths.filter((p) => p.item.moduleHref);
if (linked.length < 8) {
  console.log(`FAIL  expected module deep-links, got ${linked.length}`);
  fail++;
} else console.log(`PASS  ${linked.length} pages link to live modules`);

console.log(`\n${fail ? "FAILED" : "OK"} · ${fail} issue(s)\n`);
process.exit(fail ? 1 : 0);
