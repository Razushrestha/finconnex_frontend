/** SRS §7.9 Internal Team Chat */

export interface ChatMessage {
  id: string;
  channelId: string;
  author: string;
  body: string;
  sentAt: string;
  isOwn?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  unread: number;
}

export const chatChannels: ChatChannel[] = [
  {
    id: "general",
    name: "# general",
    description: "Company-wide announcements",
    unread: 2,
  },
  {
    id: "sales",
    name: "# sales",
    description: "Pipeline & deal chatter",
    unread: 5,
  },
  {
    id: "support",
    name: "# support",
    description: "Internal support coordination",
    unread: 0,
  },
  {
    id: "dm-shiva",
    name: "Shiva Kadhka",
    description: "Direct message",
    unread: 1,
  },
];

export const chatMessages: Record<string, ChatMessage[]> = {
  general: [
    {
      id: "cm1",
      channelId: "general",
      author: "John Smith",
      body: "Reminder: Q3 forecast lock Friday EOD.",
      sentAt: "09:12 AM",
    },
    {
      id: "cm2",
      channelId: "general",
      author: "Roshna Abraham",
      body: "Got it — I'll push the NSW numbers today.",
      sentAt: "09:18 AM",
      isOwn: true,
    },
  ],
  sales: [
    {
      id: "cm3",
      channelId: "sales",
      author: "Shiva Kadhka",
      body: "Greystone is asking for a revised proposal by Thursday.",
      sentAt: "10:02 AM",
    },
    {
      id: "cm4",
      channelId: "sales",
      author: "Tejas Gokhe",
      body: "I can take that — creating a task from this thread.",
      sentAt: "10:05 AM",
      isOwn: true,
    },
    {
      id: "cm5",
      channelId: "sales",
      author: "System",
      body: "Task T-010 created: Revised Greystone proposal",
      sentAt: "10:06 AM",
    },
  ],
  support: [
    {
      id: "cm6",
      channelId: "support",
      author: "John Smith",
      body: "Anyone free for a Contoso billing callback?",
      sentAt: "11:20 AM",
    },
  ],
  "dm-shiva": [
    {
      id: "cm7",
      channelId: "dm-shiva",
      author: "Shiva Kadhka",
      body: "Can you cover my calls Friday morning?",
      sentAt: "Yesterday",
    },
    {
      id: "cm8",
      channelId: "dm-shiva",
      author: "You",
      body: "Sure — assign them to me.",
      sentAt: "Yesterday",
      isOwn: true,
    },
  ],
};
