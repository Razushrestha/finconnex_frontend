import {
  DollarSign,
  Mail,
  Phone,
  MapPin,
  PhoneCall,
  RefreshCw,
  Layers,
  Globe,
} from "lucide-react";

export interface ContactCardProps {
  name?: string;
  initials?: string;
  amount?: string;
  email?: string;
  phone?: string;
  location?: string;
  accentColorClass?: string;
  avatarBgClass?: string;
}

export function ContactCard({
  name = "William Anderson",
  initials = "WA",
  amount = "$3,50,000",
  email = "samantha@example.com",
  phone = "+1 54655 25455",
  location = "Spain",
  accentColorClass = "bg-amber-500",
  avatarBgClass = "bg-amber-50 text-amber-600",
}: ContactCardProps) {
  return (
    <div className="w-80 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      {/* Top Accent Line */}
      <div className={`mb-4 h-1.5 w-full rounded-full ${accentColorClass}`} />

      {/* Header: Avatar & Name */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold ${avatarBgClass}`}
        >
          {initials}
        </div>
        <h3 className="text-base font-semibold text-slate-800 truncate">
          {name}
        </h3>
      </div>

      {/* Details List */}
      <div className="space-y-2.5 text-sm text-slate-600">
        <div className="flex items-center gap-2.5">
          <DollarSign className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700">{amount}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{email}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{phone}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{location}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-slate-100" />

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        {/* Left icon / status badge */}
        <button
          type="button"
          aria-label="Browser action"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-blue-600 shadow-2xs hover:bg-slate-100 transition-colors"
        >
          <Globe className="h-4 w-4 animate-spin-slow" />
        </button>

        {/* Right action icon buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Call"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <PhoneCall className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Refresh / Sync"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            aria-label="Layers / Options"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
