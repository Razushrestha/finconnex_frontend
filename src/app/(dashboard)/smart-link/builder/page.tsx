"use client";

import { BrokerHubBuilder } from "@/components/smart-links/BrokerHubBuilder";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";

// TODO(api): replace with a real fetch for the logged-in broker's hub,
// e.g. GET /brokers/me/hub
function getInitialHubConfig(): BrokerHubConfig {
  return {
    brokerId: "me",
    hubName: "Alex's Hub",
    profile: {
      slug: "alex-rivera",
      avatarUrl: null,
      title: "Alex Rivera | Wealth Advisor",
      bio: "Helping tech professionals navigate wealth building and equity compensation.",
    },
    // Starts empty — links only appear here (and in the preview) once the
    // broker adds them via the "Add link" button in the editor.
    links: [],
    // Starts empty — socials only appear here (and in the preview) once the
    // broker adds them.
    socials: [],
    published: false,
  };
}

export default function LinktreePage() {
  const handleSave = async (config: BrokerHubConfig) => {
    // TODO(api): PATCH /brokers/me/hub
    console.log("Saving hub config", config);
  };

  return (
    <BrokerHubBuilder
      initialConfig={getInitialHubConfig()}
      onSave={handleSave}
    />
  );
}
