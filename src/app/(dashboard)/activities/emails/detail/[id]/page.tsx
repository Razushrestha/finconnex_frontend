import React from "react";
import { ArrowLeft, Send, Tag } from "lucide-react";
import { Email, emails } from "@/lib/emails/types";
import { EmailAttachment } from "@/components/activities/emails/detail/EmailAttachment";
import { CrmProfileCard } from "@/components/activities/emails/detail/CrmProfileCard";
import { ActivityTimeline } from "@/components/activities/emails/detail/ActivityTimeline";

export default async function EmailDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email: Email = emails.find((e) => e.id === id) || emails[0];

  const timelineEvents = [
    {
      id: "1",
      title: "Email Opened",
      timestamp: email.openedDate || "16/07/2026 - 11:40 AM",
    },
    {
      id: "2",
      title: "Email Sent",
      timestamp: email.sentDate || "16/07/2026 - 10:15 AM",
    },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main Email Content Area */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40 backdrop-blur-md">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to Emails
          </button>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer">
              <Send className="w-4 h-4" /> Reply
            </button>
          </div>
        </div>

        {/* Email Header Metadata */}
        <div className="p-6 border-b border-border bg-card/20 space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              {email.subject}
            </h1>
            {email.templateUsed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Tag className="w-3 h-3" /> {email.templateUsed}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="text-muted-foreground/70">From:</span>{" "}
              <span className="text-card-foreground">{email.from}</span>
            </div>
            <div>
              <span className="text-muted-foreground/70">Sent Date:</span>{" "}
              <span className="text-card-foreground">{email.sentDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground/70">To:</span>{" "}
              <span className="text-card-foreground">
                {email.to.join(", ")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground/70">Status:</span>{" "}
              <span className="text-emerald-500 font-medium">
                {email.status}
              </span>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="text-sm text-card-foreground/90 leading-relaxed space-y-4 max-w-3xl">
            <p>{email.body}</p>
            <p>
              Best regards,
              <br />
              Bishnu
            </p>
          </div>

          {/* Attachments Section */}
          <div className="pt-4 border-t border-border/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Attachments (1)
            </h3>
            <EmailAttachment name="Proposal_v2_Final.pdf" size="2.4 MB" />
          </div>
        </div>
      </div>

      {/* CRM Context Sidebar */}
      <div className="w-80 bg-card/30 p-6 flex flex-col gap-6 overflow-y-auto border-l border-border">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Related CRM Profile
          </h3>
          <CrmProfileCard
            name={email.relatedTo || "Shiva Khadka"}
            initials="SK"
            role="Client / Lead"
            company="Nepatronix Client"
            activeDeal="Enterprise Tier Upgrade"
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Activity Timeline
          </h3>
          <ActivityTimeline events={timelineEvents} />
        </div>
      </div>
    </div>
  );
}
