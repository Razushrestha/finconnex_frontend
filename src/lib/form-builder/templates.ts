export interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  fields: FormField[];
}

export const ZOHO_CATEGORIES = [
  "All",
  "Business",
  "Lead Generation",
  "E-commerce",
  "Order",
  "Feedback",
  "Requests",
  "Working Forms",
  "Contact us",
  "RSVP",
  "Registration",
  "Sign up",
  "Membership",
];

export const ZOHO_TEMPLATES: Template[] = [
  // --- CONTACT US ---
  {
    id: "contact-us",
    title: "Contact Us",
    category: "Contact us",
    description:
      "Standard business contact form for general visitor inquiries.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Full name *",
        required: true,
        placeholder: "First Last",
      },
      {
        id: "f2",
        type: "email",
        label: "Email *",
        required: true,
        placeholder: "Enter email...",
      },
      {
        id: "f3",
        type: "textarea",
        label: "Leave us a few words *",
        required: true,
        placeholder: "Type message...",
      },
    ],
  },
  {
    id: "quick-inquiry",
    title: "Quick Inquiry",
    category: "Contact us",
    description: "Fast-response contact form for landing pages.",
    fields: [
      { id: "f1", type: "text", label: "Name *", required: true },
      { id: "f2", type: "email", label: "Email Address *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Subject",
        placeholder: "What is this about?",
      },
      { id: "f4", type: "textarea", label: "Message *", required: true },
    ],
  },
  {
    id: "branch-locator-contact",
    title: "Branch Locator Contact",
    category: "Contact us",
    description: "Direct inquiries to specific local corporate branches.",
    fields: [
      { id: "f1", type: "text", label: "Your Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Select Branch *",
        required: true,
        options: ["New York", "London", "Tokyo", "Sydney"],
      },
      { id: "f3", type: "email", label: "Email *", required: true },
      {
        id: "f4",
        type: "textarea",
        label: "Inquiry Details *",
        required: true,
      },
    ],
  },
  {
    id: "media-press-contact",
    title: "Media & Press Contact",
    category: "Contact us",
    description: "Tailored inquiry form for journalists and press releases.",
    fields: [
      { id: "f1", type: "text", label: "Reporter Name *", required: true },
      { id: "f2", type: "text", label: "Media Publication *", required: true },
      {
        id: "f3",
        type: "email",
        label: "Professional Email *",
        required: true,
      },
      {
        id: "f4",
        type: "textarea",
        label: "Story Angle / Request *",
        required: true,
      },
    ],
  },

  // --- BUSINESS ---
  {
    id: "client-details",
    title: "Client Details Intake",
    category: "Business",
    description: "Collect detailed client information and requirements.",
    fields: [
      { id: "f1", type: "text", label: "Client Name *", required: true },
      { id: "f2", type: "text", label: "Company *", required: true },
      { id: "f3", type: "email", label: "Email *", required: true },
      {
        id: "f4",
        type: "text",
        label: "Phone Number",
        placeholder: "+1 (555) 000-0000",
      },
    ],
  },
  {
    id: "software-evaluation",
    title: "Software Evaluation",
    category: "Business",
    description: "Gather feedback and evaluations for software alternatives.",
    fields: [
      { id: "f1", type: "text", label: "Evaluator Name *", required: true },
      { id: "f2", type: "text", label: "Department *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Performance Rating",
        options: ["Excellent", "Good", "Average", "Poor"],
      },
      {
        id: "f4",
        type: "textarea",
        label: "Key Observations *",
        required: true,
      },
    ],
  },
  {
    id: "complaints",
    title: "Customer Complaint Tracker",
    category: "Business",
    description: "Customer complaint tracking and resolution form.",
    fields: [
      { id: "f1", type: "text", label: "Full Name *", required: true },
      { id: "f2", type: "email", label: "Email *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Order / Invoice ID",
        placeholder: "#INV-000",
      },
      {
        id: "f4",
        type: "textarea",
        label: "Where did we go wrong? *",
        required: true,
      },
    ],
  },
  {
    id: "bug-tracker",
    title: "Internal Bug Tracker",
    category: "Business",
    description: "Report bugs with system specifications.",
    fields: [
      { id: "f1", type: "text", label: "Bug Title *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Severity Level *",
        options: ["Low", "Medium", "High", "Critical"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Issue Description & Steps *",
        required: true,
      },
    ],
  },
  {
    id: "vendor-onboarding",
    title: "Vendor Onboarding",
    category: "Business",
    description: "Register new third-party vendors and suppliers.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Vendor / Company Name *",
        required: true,
      },
      { id: "f2", type: "text", label: "Tax ID / EIN *", required: true },
      {
        id: "f3",
        type: "email",
        label: "Primary Contact Email *",
        required: true,
      },
      { id: "f4", type: "text", label: "Website URL", placeholder: "https://" },
    ],
  },

  // --- LEAD GENERATION ---
  {
    id: "ebook-download",
    title: "E-book & Whitepaper Download",
    category: "Lead Generation",
    description: "Capture emails in exchange for a resource download.",
    fields: [
      { id: "f1", type: "text", label: "First Name *", required: true },
      { id: "f2", type: "email", label: "Work Email *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Job Title",
        placeholder: "e.g. Product Manager",
      },
    ],
  },
  {
    id: "consultation-booking",
    title: "Free Strategy Consultation",
    category: "Lead Generation",
    description: "High-intent lead generation form for scheduling calls.",
    fields: [
      { id: "f1", type: "text", label: "Full Name *", required: true },
      { id: "f2", type: "email", label: "Email *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Company Size",
        placeholder: "e.g. 50-200 employees",
      },
      {
        id: "f4",
        type: "textarea",
        label: "What are your core goals? *",
        required: true,
      },
    ],
  },
  {
    id: "webinar-registration",
    title: "Live Webinar Registration",
    category: "Lead Generation",
    description: "Sign up attendees for online workshops and masterclasses.",
    fields: [
      { id: "f1", type: "text", label: "Your Name *", required: true },
      { id: "f2", type: "email", label: "Email Address *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Preferred Session Time *",
        options: ["Morning (10 AM EST)", "Evening (5 PM EST)"],
      },
    ],
  },
  {
    id: "newsletter-signup",
    title: "Growth Hack Newsletter",
    category: "Lead Generation",
    description: "Minimalist email capture form for weekly roundups.",
    fields: [
      {
        id: "f1",
        type: "email",
        label: "Enter your email address *",
        required: true,
        placeholder: "name@company.com",
      },
    ],
  },
  {
    id: "quote-calculator-lead",
    title: "Instant Quote Request",
    category: "Lead Generation",
    description:
      "Generate qualified prospects via customized quote estimation.",
    fields: [
      { id: "f1", type: "text", label: "Full Name *", required: true },
      { id: "f2", type: "email", label: "Email *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Estimated Project Budget *",
        options: ["<$5k", "$5k - $15k", "$15k - $50k", "$50k+"],
      },
      {
        id: "f4",
        type: "textarea",
        label: "Project Scope Summary *",
        required: true,
      },
    ],
  },

  // --- E-COMMERCE ---
  {
    id: "product-review",
    title: "Product Review & Rating",
    category: "E-commerce",
    description: "Collect ratings and reviews from verified purchasers.",
    fields: [
      { id: "f1", type: "text", label: "Reviewer Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Rating Score *",
        options: [
          "5 Stars - Outstanding",
          "4 Stars - Good",
          "3 Stars - Average",
          "2 Stars - Poor",
          "1 Star - Terrible",
        ],
      },
      { id: "f3", type: "text", label: "Product SKU / Name *", required: true },
      {
        id: "f4",
        type: "textarea",
        label: "Detailed Review *",
        required: true,
      },
    ],
  },
  {
    id: "return-exchange",
    title: "Return & Exchange Request",
    category: "E-commerce",
    description:
      "Manage product returns, refunds, and replacements seamlessly.",
    fields: [
      { id: "f1", type: "text", label: "Order Number *", required: true },
      { id: "f2", type: "email", label: "Account Email *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Request Type *",
        options: ["Refund", "Size Exchange", "Defective Replacement"],
      },
      {
        id: "f4",
        type: "textarea",
        label: "Reason for Return *",
        required: true,
      },
    ],
  },
  {
    id: "wholesale-application",
    title: "Wholesale Buyer Application",
    category: "E-commerce",
    description: "Verify and onboard bulk retail store partners.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Business Legal Name *",
        required: true,
      },
      {
        id: "f2",
        type: "text",
        label: "Reseller Permit Number *",
        required: true,
      },
      {
        id: "f3",
        type: "email",
        label: "Purchasing Manager Email *",
        required: true,
      },
      {
        id: "f4",
        type: "text",
        label: "Store Location / Physical Address *",
        required: true,
      },
    ],
  },
  {
    id: "gift-card-inquiry",
    title: "Corporate Gift Card Request",
    category: "E-commerce",
    description: "Handle bulk digital or physical gift card orders.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Corporate Client Name *",
        required: true,
      },
      { id: "f2", type: "email", label: "Email *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Total Quantity Needed *",
        required: true,
      },
      {
        id: "f4",
        type: "textarea",
        label: "Custom Branding Notes",
        placeholder: "Include company logo...",
      },
    ],
  },

  // --- ORDER ---
  {
    id: "custom-cake-order",
    title: "Custom Cake & Bakery Order",
    category: "Order",
    description: "Detailed custom food and bakery order specifications.",
    fields: [
      { id: "f1", type: "text", label: "Customer Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Pickup Date *",
        placeholder: "MM/DD/YYYY",
        required: true,
      },
      {
        id: "f3",
        type: "select",
        label: "Flavor Profile *",
        options: [
          "Chocolate Fudge",
          "Vanilla Bean",
          "Red Velvet",
          "Fruit Gateau",
        ],
      },
      {
        id: "f4",
        type: "textarea",
        label: "Design Text & Theme Instructions *",
        required: true,
      },
    ],
  },
  {
    id: "catering-service-order",
    title: "Catering Service Booking",
    category: "Order",
    description: "Book food and service staff for catering events.",
    fields: [
      { id: "f1", type: "text", label: "Organizer Name *", required: true },
      { id: "f2", type: "text", label: "Headcount Estimate *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Event Date *",
        placeholder: "MM/DD/YYYY",
      },
      {
        id: "f4",
        type: "textarea",
        label: "Dietary Restrictions & Menu Preferences *",
        required: true,
      },
    ],
  },
  {
    id: "print-merch-order",
    title: "Custom Merchandise & Print Order",
    category: "Order",
    description: "Order custom t-shirts, mugs, and promotional swag.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Organization / Team Name *",
        required: true,
      },
      {
        id: "f2",
        type: "select",
        label: "Item Type *",
        options: ["Cotton T-Shirts", "Hoodies", "Ceramic Mugs", "Stickers"],
      },
      { id: "f3", type: "text", label: "Quantity Required *", required: true },
      {
        id: "f4",
        type: "textarea",
        label: "Artwork Instructions *",
        required: true,
      },
    ],
  },
  {
    id: "equipment-rental-order",
    title: "Equipment Rental Form",
    category: "Order",
    description: "Reserve audio, video, or construction equipment rentals.",
    fields: [
      { id: "f1", type: "text", label: "Renter Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Start Date *",
        placeholder: "MM/DD/YYYY",
      },
      {
        id: "f3",
        type: "text",
        label: "End Date *",
        placeholder: "MM/DD/YYYY",
      },
      {
        id: "f4",
        type: "textarea",
        label: "Equipment Items Requested *",
        required: true,
      },
    ],
  },

  // --- FEEDBACK ---
  {
    id: "employee-satisfaction",
    title: "Internal Employee Pulse Check",
    category: "Feedback",
    description: "Anonymous or open internal feedback survey for HR.",
    fields: [
      {
        id: "f1",
        type: "select",
        label: "Department *",
        options: ["Engineering", "Sales", "Marketing", "Operations"],
      },
      {
        id: "f2",
        type: "select",
        label: "Overall Job Satisfaction *",
        options: ["Very Satisfied", "Neutral", "Dissatisfied"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "What can we improve? *",
        required: true,
      },
    ],
  },
  {
    id: "course-evaluation",
    title: "Training Course Feedback",
    category: "Feedback",
    description: "Gather feedback following educational workshops or webinars.",
    fields: [
      { id: "f1", type: "text", label: "Attendee Name (Optional)" },
      {
        id: "f2",
        type: "select",
        label: "Instructor Effectiveness *",
        options: ["Outstanding", "Good", "Needs Improvement"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Key takeaways and comments *",
        required: true,
      },
    ],
  },
  {
    id: "website-ux-feedback",
    title: "Website UX & Usability Feedback",
    category: "Feedback",
    description: "Collect user feedback regarding site navigation and bugs.",
    fields: [
      { id: "f1", type: "email", label: "Your Email (Optional)" },
      {
        id: "f2",
        type: "select",
        label: "Did you find what you were looking for? *",
        options: ["Yes, easily", "With some difficulty", "No"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Describe your experience or issues found *",
        required: true,
      },
    ],
  },
  {
    id: "restaurant-dining-feedback",
    title: "Restaurant Table Experience Feedback",
    category: "Feedback",
    description: "Post-dining customer experience rating questionnaire.",
    fields: [
      { id: "f1", type: "text", label: "Server Name", placeholder: "Optional" },
      {
        id: "f2",
        type: "select",
        label: "Food Quality *",
        options: ["Exceptional", "Good", "Average", "Poor"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Additional Comments *",
        required: true,
      },
    ],
  },

  // --- REQUESTS ---
  {
    id: "it-support-ticket",
    title: "IT Support Helpdesk Ticket",
    category: "Requests",
    description: "Log hardware, software, or network support requests.",
    fields: [
      { id: "f1", type: "text", label: "Employee Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Asset Tag / Computer ID *",
        required: true,
      },
      {
        id: "f3",
        type: "select",
        label: "Issue Category *",
        options: [
          "Hardware Failure",
          "Password Reset",
          "Software License",
          "Network/VPN",
        ],
      },
      {
        id: "f4",
        type: "textarea",
        label: "Detailed Description *",
        required: true,
      },
    ],
  },
  {
    id: "time-off-request",
    title: "Employee Time Off Request",
    category: "Requests",
    description: "Submit vacation, sick leave, or personal leave requests.",
    fields: [
      { id: "f1", type: "text", label: "Employee Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Leave Type *",
        options: [
          "Vacation",
          "Sick Leave",
          "Personal Day",
          "Maternity/Paternity",
        ],
      },
      {
        id: "f3",
        type: "text",
        label: "Start Date *",
        placeholder: "MM/DD/YYYY",
      },
      {
        id: "f4",
        type: "text",
        label: "End Date *",
        placeholder: "MM/DD/YYYY",
      },
    ],
  },
  {
    id: "facility-maintenance",
    title: "Facility Maintenance Request",
    category: "Requests",
    description: "Report office building repairs and maintenance tasks.",
    fields: [
      { id: "f1", type: "text", label: "Requester Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Office Room / Floor Number *",
        required: true,
      },
      {
        id: "f3",
        type: "select",
        label: "Problem Type *",
        options: [
          "Plumbing",
          "Electrical",
          "HVAC / Climate",
          "Furniture Repair",
        ],
      },
      { id: "f4", type: "textarea", label: "Describe issue *", required: true },
    ],
  },
  {
    id: "travel-expense-approval",
    title: "Travel & Expense Pre-Approval",
    category: "Requests",
    description: "Get management sign-off on corporate travel budgets.",
    fields: [
      { id: "f1", type: "text", label: "Traveler Name *", required: true },
      { id: "f2", type: "text", label: "Destination *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Estimated Budget ($) *",
        required: true,
      },
      {
        id: "f4",
        type: "textarea",
        label: "Business Purpose *",
        required: true,
      },
    ],
  },

  // --- WORKING FORMS ---
  {
    id: "project-estimation",
    title: "Client Project Scope Builder",
    category: "Working Forms",
    description: "Internal working form used to scope new deliverables.",
    fields: [
      { id: "f1", type: "text", label: "Project Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Core Tech Stack *",
        options: [
          "Next.js / React",
          "Django / Python",
          "Node.js / Express",
          "Full Stack Custom",
        ],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Deliverables Checklist *",
        required: true,
      },
    ],
  },
  {
    id: "incident-report",
    title: "Workspace Safety Incident Report",
    category: "Working Forms",
    description: "Formal documentation form for workplace safety audits.",
    fields: [
      { id: "f1", type: "text", label: "Reporter Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Incident Date & Time *",
        placeholder: "YYYY-MM-DD HH:MM",
      },
      {
        id: "f3",
        type: "textarea",
        label: "Detailed Event Sequence *",
        required: true,
      },
    ],
  },
  {
    id: "petty-cash-voucher",
    title: "Petty Cash Reimbursement Voucher",
    category: "Working Forms",
    description: "Operational form to track small cash spends.",
    fields: [
      { id: "f1", type: "text", label: "Applicant Name *", required: true },
      { id: "f2", type: "text", label: "Expense Amount ($) *", required: true },
      {
        id: "f3",
        type: "textarea",
        label: "Business Justification & Receipt Ref *",
        required: true,
      },
    ],
  },
  {
    id: "content-editorial-pitch",
    title: "Content Editorial & Blog Pitch",
    category: "Working Forms",
    description: "Submit article ideas for marketing team approval.",
    fields: [
      { id: "f1", type: "text", label: "Author Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Proposed Article Title *",
        required: true,
      },
      {
        id: "f3",
        type: "textarea",
        label: "Brief Outline / Abstract *",
        required: true,
      },
    ],
  },

  // --- RSVP ---
  {
    id: "corporate-gala-rsvp",
    title: "Annual Corporate Gala RSVP",
    category: "RSVP",
    description:
      "Confirm attendance for corporate parties and end-of-year events.",
    fields: [
      { id: "f1", type: "text", label: "Attendee Name *", required: true },
      { id: "f2", type: "email", label: "Email Address *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Will you attend? *",
        options: ["Joyfully Accept", "Regretfully Decline"],
      },
      {
        id: "f4",
        type: "text",
        label: "Plus One Name (If applicable)",
        placeholder: "Guest full name",
      },
    ],
  },
  {
    id: "wedding-rsvp",
    title: "Wedding Reception RSVP",
    category: "RSVP",
    description: "Classic wedding invitation response card template.",
    fields: [
      { id: "f1", type: "text", label: "Guest Name(s) *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Attendance Status *",
        options: ["Attending", "Not Attending"],
      },
      {
        id: "f3",
        type: "select",
        label: "Meal Choice Preference *",
        options: ["Prime Beef", "Pan-Seared Salmon", "Vegetarian Selection"],
      },
    ],
  },
  {
    id: "workshop-seminar-rsvp",
    title: "Workshop & Seminar RSVP",
    category: "RSVP",
    description: "Track seats for educational seminars and training events.",
    fields: [
      { id: "f1", type: "text", label: "Participant Name *", required: true },
      { id: "f2", type: "email", label: "Email *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Attendance Mode *",
        options: ["In-Person Venue", "Virtual Livestream"],
      },
    ],
  },
  {
    id: "party-invitation-rsvp",
    title: "Private Party & Celebration RSVP",
    category: "RSVP",
    description: "Casual gathering invitation tracker.",
    fields: [
      { id: "f1", type: "text", label: "Your Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Are you coming? *",
        options: ["Yes, count me in!", "Sorry, can't make it"],
      },
      {
        id: "f3",
        type: "textarea",
        label: "Dietary restrictions or allergy notes",
      },
    ],
  },

  // --- REGISTRATION ---
  {
    id: "sports-tournament-reg",
    title: "Sports Tournament Registration",
    category: "Registration",
    description: "Register players or teams for athletic competitions.",
    fields: [
      { id: "f1", type: "text", label: "Team / Player Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Sport Category *",
        options: [
          "Football / Soccer",
          "Basketball",
          "Tennis Singles",
          "Badminton",
        ],
      },
      { id: "f3", type: "email", label: "Captain Email *", required: true },
    ],
  },
  {
    id: "hackathon-registration",
    title: "Hackathon Dev Event Registration",
    category: "Registration",
    description: "Sign up hackers, designers, and developers for code sprints.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Participant Full Name *",
        required: true,
      },
      {
        id: "f2",
        type: "text",
        label: "GitHub Profile URL",
        placeholder: "https://github.com/username",
      },
      {
        id: "f3",
        type: "select",
        label: "Primary Role *",
        options: [
          "Frontend Developer",
          "Backend Developer",
          "UI/UX Designer",
          "Product Manager",
        ],
      },
    ],
  },
  {
    id: "volunteer-program-reg",
    title: "Community Volunteer Program Registration",
    category: "Registration",
    description: "Onboard volunteers for non-profit initiatives.",
    fields: [
      { id: "f1", type: "text", label: "Full Name *", required: true },
      { id: "f2", type: "email", label: "Email Address *", required: true },
      {
        id: "f3",
        type: "select",
        label: "Availability *",
        options: ["Weekdays", "Weekends", "Flexible"],
      },
    ],
  },
  {
    id: "summer-camp-reg",
    title: "Youth Summer Camp Registration",
    category: "Registration",
    description: "Register children for seasonal recreational camps.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Parent / Guardian Name *",
        required: true,
      },
      { id: "f2", type: "text", label: "Camper Name & Age *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Emergency Contact Number *",
        required: true,
      },
    ],
  },

  // --- SIGN UP ---
  {
    id: "portal-account-signup",
    title: "SaaS Platform Account Sign Up",
    category: "Sign up",
    description: "Standard user account registration form.",
    fields: [
      { id: "f1", type: "text", label: "Desired Username *", required: true },
      { id: "f2", type: "email", label: "Email Address *", required: true },
      { id: "f3", type: "text", label: "Password *", placeholder: "••••••••" },
    ],
  },
  {
    id: "beta-tester-signup",
    title: "Exclusive Beta Tester Sign Up",
    category: "Sign up",
    description: "Recruit early adopters for pre-release software builds.",
    fields: [
      { id: "f1", type: "text", label: "Name *", required: true },
      { id: "f2", type: "email", label: "Email *", required: true },
      {
        id: "f3",
        type: "text",
        label: "Operating System / Device Spec",
        placeholder: "e.g. MacOS / Windows / iOS",
      },
    ],
  },
  {
    id: "club-chapter-signup",
    title: "Local Community Club Sign Up",
    category: "Sign up",
    description: "Join regional chapters or hobby clubs.",
    fields: [
      { id: "f1", type: "text", label: "Full Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Select Chapter *",
        options: ["Downtown Chapter", "Westside Hub", "North Campus"],
      },
      { id: "f3", type: "email", label: "Email Address *", required: true },
    ],
  },
  {
    id: "creator-program-signup",
    title: "Influencer & Creator Program Sign Up",
    category: "Sign up",
    description: "Sign up content creators for brand partnerships.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Creator Handle / Name *",
        required: true,
      },
      {
        id: "f2",
        type: "text",
        label: "Social Channel Link *",
        placeholder: "YouTube/Instagram/TikTok URL",
      },
      { id: "f3", type: "email", label: "Business Email *", required: true },
    ],
  },

  // --- MEMBERSHIP ---
  {
    id: "gym-fitness-membership",
    title: "Gym & Fitness Club Membership",
    category: "Membership",
    description:
      "Sign up new members for health club access and training plans.",
    fields: [
      { id: "f1", type: "text", label: "Full Name *", required: true },
      {
        id: "f2",
        type: "select",
        label: "Membership Tier *",
        options: [
          "Standard Access",
          "Gold All-Inclusive",
          "VIP Private Trainer Bundle",
        ],
      },
      { id: "f3", type: "text", label: "Emergency Contact *", required: true },
    ],
  },
  {
    id: "library-card-membership",
    title: "Public Library Membership Application",
    category: "Membership",
    description: "Issue digital or physical borrowing library cards.",
    fields: [
      { id: "f1", type: "text", label: "Full Legal Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Residential Address *",
        required: true,
      },
      { id: "f3", type: "email", label: "Email *", required: true },
    ],
  },
  {
    id: "professional-association",
    title: "Professional Association Membership",
    category: "Membership",
    description: "Apply for accreditation in professional trade societies.",
    fields: [
      { id: "f1", type: "text", label: "Applicant Name *", required: true },
      {
        id: "f2",
        type: "text",
        label: "Professional Certification / License # *",
        required: true,
      },
      { id: "f3", type: "email", label: "Contact Email *", required: true },
    ],
  },
  {
    id: "co-working-space-membership",
    title: "Co-Working Space Desk Membership",
    category: "Membership",
    description: "Reserve hot desks or private office memberships.",
    fields: [
      {
        id: "f1",
        type: "text",
        label: "Member / Company Name *",
        required: true,
      },
      {
        id: "f2",
        type: "select",
        label: "Plan Selection *",
        options: [
          "Hot Desk (Part-time)",
          "Dedicated Desk",
          "Private Office Suite",
        ],
      },
      { id: "f3", type: "email", label: "Billing Email *", required: true },
    ],
  },
];
