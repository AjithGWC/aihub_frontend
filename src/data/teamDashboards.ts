/* ------------------------------------------------------------------ */
/*  Per-team dashboard sample data.                                     */
/*                                                                      */
/*  Shape matches the agreed schema: title, description, kpiSection[],  */
/*  charts[], tables[]. This is SAMPLE data — swap any team's entry     */
/*  for the real feed once it's available; TeamDashboard.tsx renders    */
/*  whatever it's given, so nothing else needs to change.               */
/* ------------------------------------------------------------------ */

export interface KpiItem {
  title: string;
  value: string;
  unit: string;
  change: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartItem {
  title: string;
  type: "line" | "bar" | "donut";
  description: string;
  xAxis?: string;
  yAxis?: string;
  data: ChartPoint[];
}

export interface TableRow {
  [column: string]: string;
}

export interface TableItem {
  title: string;
  description: string;
  columns: string[];
  rows: TableRow[];
}

export interface TeamDashboardData {
  key: string;
  title: string;
  description: {
    heading: string;
    content: string;
  };
  kpiSection: KpiItem[];
  charts: ChartItem[];
  tables: TableItem[];
}

export const TEAM_DASHBOARDS: TeamDashboardData[] = [
  {
    key: "finance",
    title: "Credit & Underwriting",
    description: {
      heading: "Agent Suite — credit decisioning workspace",
      content:
        "Automates document intake, risk scoring and approval routing so underwriters spend their time on the exceptions, not the paperwork.",
    },
    kpiSection: [
      { title: "Applications Processed", value: "1,284", unit: "apps/mo", change: "+8.4%" },
      { title: "Approval Rate", value: "68.2", unit: "%", change: "+2.1%" },
      { title: "Avg Decision Time", value: "4.6", unit: "hrs", change: "-11.3%" },
      { title: "Auto-Approval Rate", value: "41.5", unit: "%", change: "+5.7%" },
      { title: "Portfolio at Risk", value: "3.2", unit: "%", change: "-0.4%" },
      { title: "Avg Loan Size", value: "₹4.8L", unit: "per app", change: "+1.6%" },
    ],
    charts: [
      {
        title: "Applications & Approvals",
        type: "line",
        description: "Monthly application volume against approvals granted.",
        xAxis: "Month",
        yAxis: "Applications",
        data: [
          { label: "Mar", value: 980 },
          { label: "Apr", value: 1050 },
          { label: "May", value: 1120 },
          { label: "Jun", value: 1190 },
          { label: "Jul", value: 1230 },
          { label: "Aug", value: 1284 },
        ],
      },
      {
        title: "Approval Rate by Product",
        type: "bar",
        description: "Share of applications approved, broken down by loan product.",
        xAxis: "Product",
        yAxis: "Approval rate (%)",
        data: [
          { label: "Personal", value: 71 },
          { label: "Auto", value: 74 },
          { label: "Business", value: 58 },
          { label: "Mortgage", value: 63 },
        ],
      },
      {
        title: "Application Status",
        type: "donut",
        description: "Current state of applications in the pipeline.",
        data: [
          { label: "Approved", value: 68 },
          { label: "Pending review", value: 21 },
          { label: "Declined", value: 11 },
        ],
      },
    ],
    tables: [
      {
        title: "Underwriting Queue",
        description: "Applications currently awaiting an underwriting decision.",
        columns: ["Applicant ID", "Product", "Amount", "Risk Band", "Status"],
        rows: [
          { "Applicant ID": "APP-10234", "Product": "Personal", "Amount": "₹3.2L", "Risk Band": "Low", "Status": "Pending review" },
          { "Applicant ID": "APP-10241", "Product": "Mortgage", "Amount": "₹58L", "Risk Band": "Medium", "Status": "Docs requested" },
          { "Applicant ID": "APP-10247", "Product": "Business", "Amount": "₹12.4L", "Risk Band": "High", "Status": "Escalated" },
          { "Applicant ID": "APP-10253", "Product": "Auto", "Amount": "₹6.1L", "Risk Band": "Low", "Status": "Pending review" },
        ],
      },
    ],
  },
  {
  key: "sales",
  title: "Collections & Recovery",

  description: {
    heading: "Multilingual Collections Outreach & Promise-to-Pay",
    content:
      "Automates overdue borrower outreach across WhatsApp, IVR and SMS, identifies customers willing to pay, books Promise-to-Pay commitments, and routes disputes or hardship cases to human collection agents.",
  },

  kpiSection: [
    {
      title: "Overdue Accounts",
      value: "428",
      unit: "accounts",
      change: "-8.4%",
    },
    {
      title: "PTP Booking Rate",
      value: "64.8",
      unit: "%",
      change: "+7.2%",
    },
    {
      title: "PTP Kept Rate",
      value: "72.4",
      unit: "%",
      change: "+4.8%",
    },
    {
      title: "Human Escalation Rate",
      value: "13.6",
      unit: "%",
      change: "-3.1%",
    },
  ],

  charts: [
    {
      title: "PTP Status Distribution",
      type: "donut",
      description:
        "Distribution of Promise-to-Pay commitments across booked, kept, broken and pending states.",
      data: [
        {
          label: "Kept",
          value: 186,
        },
        {
          label: "Pending",
          value: 72,
        },
        {
          label: "Broken",
          value: 61,
        },
        {
          label: "Booked",
          value: 109,
        },
      ],
    },

    {
      title: "Recovery by Outreach Channel",
      type: "bar",
      description:
        "Recovered amount attributed to each borrower communication channel.",
      xAxis: "Channel",
      yAxis: "Recovered Amount (INR)",
      data: [
        {
          label: "WhatsApp",
          value: 1240000,
        },
        {
          label: "IVR",
          value: 890000,
        },
        {
          label: "SMS",
          value: 420000,
        },
        {
          label: "Human Call",
          value: 1130000,
        },
      ],
    },

    {
      title: "Collections Recovery Trend",
      type: "line",
      description:
        "Monthly amount recovered from accounts contacted through the collections agent.",
      xAxis: "Month",
      yAxis: "Recovered Amount (INR)",
      data: [
        {
          label: "Jun 2026",
          value: 820000,
        },
        {
          label: "Jul 2026",
          value: 1030000,
        },
        {
          label: "Aug 2026",
          value: 1210000,
        },
      ],
    },
  ],

  tables: [
    {
      title: "Accounts Requiring Review",
      description:
        "Overdue accounts where the AI agent identified disputes, hardship or repeated failed outreach.",

      columns: [
        "Loan",
        "Borrower",
        "DPD",
        "Outstanding",
        "PTP Status",
        "Channel",
        "Escalation",
      ],

      rows: [
        {
          "Loan": "GL-2026-10482",
          "Borrower": "R. Kumar",
          "DPD": "67",
          "Outstanding": "₹1.28L",
          "PTP Status": "Broken",
          "Channel": "WhatsApp",
          "Escalation": "Human Agent",
        },
        {
          "Loan": "GL-2026-10837",
          "Borrower": "S. Priya",
          "DPD": "42",
          "Outstanding": "₹86K",
          "PTP Status": "Pending",
          "Channel": "IVR",
          "Escalation": "Follow-up Required",
        },
        {
          "Loan": "GL-2026-11264",
          "Borrower": "M. Rajesh",
          "DPD": "91",
          "Outstanding": "₹2.14L",
          "PTP Status": "Broken",
          "Channel": "Human Call",
          "Escalation": "High Priority",
        },
        {
          "Loan": "GL-2026-11529",
          "Borrower": "A. Devi",
          "DPD": "35",
          "Outstanding": "₹54K",
          "PTP Status": "Booked",
          "Channel": "SMS",
          "Escalation": "Monitoring",
        },
        {
          "Loan": "GL-2026-11903",
          "Borrower": "V. Anand",
          "DPD": "76",
          "Outstanding": "₹1.67L",
          "PTP Status": "Pending",
          "Channel": "WhatsApp",
          "Escalation": "Human Agent",
        },
        {
          "Loan": "GL-2026-12147",
          "Borrower": "K. Meena",
          "DPD": "58",
          "Outstanding": "₹92K",
          "PTP Status": "Broken",
          "Channel": "IVR",
          "Escalation": "Dispute Review",
        },
        {
          "Loan": "GL-2026-12418",
          "Borrower": "P. Suresh",
          "DPD": "83",
          "Outstanding": "₹1.94L",
          "PTP Status": "Pending",
          "Channel": "Human Call",
          "Escalation": "Hardship Review",
        },
        {
          "Loan": "GL-2026-12756",
          "Borrower": "N. Lakshmi",
          "DPD": "29",
          "Outstanding": "₹47K",
          "PTP Status": "Booked",
          "Channel": "WhatsApp",
          "Escalation": "Monitoring",
        },
      ],
    },
  ],
},
  {
    key: "mfg",
    title: "Risk & Compliance",
    description: {
      heading: "Risk and Compliance — Atlas Hub",
      content:
        "Tracks policy exceptions, audit findings and regulatory filings in one place, with alerts before anything breaches threshold.",
    },
    kpiSection: [
      { title: "Open Findings", value: "27", unit: "findings", change: "-9.5%" },
      { title: "Compliance Score", value: "91.4", unit: "/100", change: "+1.2%" },
      { title: "Overdue Remediations", value: "5", unit: "items", change: "+2 items" },
      { title: "Filings This Quarter", value: "14", unit: "filed", change: "0%" },
      { title: "High-Risk Exceptions", value: "6", unit: "open", change: "-2 items" },
      { title: "Avg Remediation Time", value: "12.5", unit: "days", change: "-3.1%" },
    ],
    charts: [
      {
        title: "Findings Opened vs Closed",
        type: "line",
        description: "Monthly finding intake against closure rate.",
        xAxis: "Month",
        yAxis: "Findings",
        data: [
          { label: "Mar", value: 34 },
          { label: "Apr", value: 29 },
          { label: "May", value: 31 },
          { label: "Jun", value: 25 },
          { label: "Jul", value: 22 },
          { label: "Aug", value: 27 },
        ],
      },
      {
        title: "Findings by Category",
        type: "bar",
        description: "Open findings grouped by control category.",
        xAxis: "Category",
        yAxis: "Open findings",
        data: [
          { label: "Data privacy", value: 9 },
          { label: "AML/KYC", value: 7 },
          { label: "Reporting", value: 6 },
          { label: "Access control", value: 5 },
        ],
      },
      {
        title: "Finding Severity",
        type: "donut",
        description: "Severity mix of currently open findings.",
        data: [
          { label: "High", value: 22 },
          { label: "Medium", value: 48 },
          { label: "Low", value: 30 },
        ],
      },
    ],
    tables: [
      {
        title: "Open Findings Register",
        description: "Active findings with an assigned owner and due date.",
        columns: ["Finding ID", "Category", "Severity", "Owner", "Due Date"],
        rows: [
          { "Finding ID": "RC-0142", "Category": "AML/KYC", "Severity": "High", "Owner": "P. Sharma", "Due Date": "2026-08-18" },
          { "Finding ID": "RC-0147", "Category": "Data privacy", "Severity": "Medium", "Owner": "N. Rao", "Due Date": "2026-08-25" },
          { "Finding ID": "RC-0151", "Category": "Reporting", "Severity": "Low", "Owner": "J. Thomas", "Due Date": "2026-09-02" },
          { "Finding ID": "RC-0153", "Category": "Access control", "Severity": "High", "Owner": "P. Sharma", "Due Date": "2026-08-14" },
        ],
      },
    ],
  },
  {
    key: "supply",
    title: "Sales & Branch Distribution",
    description: {
      heading: "Branch distribution workspace",
      content:
        "Rolls up daily branch numbers against target, flags underperforming territories, and keeps the distribution network visible end to end.",
    },
    kpiSection: [
      { title: "Total Branch Sales", value: "₹8.6Cr", unit: "this mo", change: "+6.3%" },
      { title: "Sales Growth", value: "6.3", unit: "% MoM", change: "+1.8%" },
      { title: "Active Branches", value: "142", unit: "branches", change: "+3 branches" },
      { title: "Avg Basket Size", value: "₹3,420", unit: "per txn", change: "+2.4%" },
      { title: "Footfall Conversion", value: "24.8", unit: "%", change: "-0.6%" },
      { title: "Top Branch Growth", value: "18.1", unit: "% MoM", change: "+18.1%" },
    ],
    charts: [
      {
        title: "Monthly Sales Trend",
        type: "line",
        description: "Total distribution sales across all branches by month.",
        xAxis: "Month",
        yAxis: "Sales (₹Cr)",
        data: [
          { label: "Mar", value: 6.9 },
          { label: "Apr", value: 7.2 },
          { label: "May", value: 7.6 },
          { label: "Jun", value: 7.9 },
          { label: "Jul", value: 8.1 },
          { label: "Aug", value: 8.6 },
        ],
      },
      {
        title: "Sales by Region",
        type: "bar",
        description: "Branch sales rolled up by region.",
        xAxis: "Region",
        yAxis: "Sales (₹Cr)",
        data: [
          { label: "North", value: 2.4 },
          { label: "South", value: 2.9 },
          { label: "East", value: 1.6 },
          { label: "West", value: 1.7 },
        ],
      },
      {
        title: "Sales Channel Mix",
        type: "donut",
        description: "Share of sales by channel.",
        data: [
          { label: "In-branch", value: 58 },
          { label: "Online", value: 27 },
          { label: "Partner", value: 15 },
        ],
      },
    ],
    tables: [
      {
        title: "Branch Performance",
        description: "Branches furthest above or below target this month.",
        columns: ["Branch", "Region", "Sales", "Target", "Status"],
        rows: [
          { "Branch": "Andheri West", "Region": "West", "Sales": "₹42.1L", "Target": "₹36L", "Status": "Ahead" },
          { "Branch": "Koramangala", "Region": "South", "Sales": "₹51.8L", "Target": "₹40L", "Status": "Ahead" },
          { "Branch": "Salt Lake", "Region": "East", "Sales": "₹19.4L", "Target": "₹28L", "Status": "Behind" },
          { "Branch": "Sector 62 Noida", "Region": "North", "Sales": "₹24.0L", "Target": "₹30L", "Status": "Behind" },
        ],
      },
    ],
  },
  {
    key: "people",
    title: "Finance & Treasury",
    description: {
      heading: "Treasury operations workspace",
      content:
        "Watches liquidity across accounts, reconciles cash movement daily, and gives finance leadership a single view before it's time to close the books.",
    },
    kpiSection: [
      { title: "Cash Position", value: "₹64.2Cr", unit: "today", change: "+2.9%" },
      { title: "Liquidity Ratio", value: "1.84", unit: "x", change: "+0.06x" },
      { title: "Net Cash Flow", value: "₹3.1Cr", unit: "this mo", change: "-1.2%" },
      { title: "Covenant Headroom", value: "22.5", unit: "%", change: "-1.8%" },
      { title: "Forecast Accuracy", value: "96.1", unit: "%", change: "+0.9%" },
      { title: "Upcoming Settlements", value: "9", unit: "next 7d", change: "+2 items" },
    ],
    charts: [
      {
        title: "Cash Position Trend",
        type: "line",
        description: "Consolidated cash position across all treasury accounts.",
        xAxis: "Month",
        yAxis: "Cash (₹Cr)",
        data: [
          { label: "Mar", value: 58.4 },
          { label: "Apr", value: 60.1 },
          { label: "May", value: 59.3 },
          { label: "Jun", value: 61.8 },
          { label: "Jul", value: 62.4 },
          { label: "Aug", value: 64.2 },
        ],
      },
      {
        title: "Cash by Entity",
        type: "bar",
        description: "Cash balance broken down by legal entity.",
        xAxis: "Entity",
        yAxis: "Cash (₹Cr)",
        data: [
          { label: "HoldCo", value: 24.6 },
          { label: "OpCo India", value: 19.2 },
          { label: "OpCo APAC", value: 11.8 },
          { label: "Reserve", value: 8.6 },
        ],
      },
      {
        title: "Liquidity Allocation",
        type: "donut",
        description: "How current liquidity is allocated.",
        data: [
          { label: "Operating", value: 54 },
          { label: "Reserve", value: 31 },
          { label: "Investment", value: 15 },
        ],
      },
    ],
    tables: [
      {
        title: "Upcoming Settlements",
        description: "Settlements due in the next 7 days.",
        columns: ["Reference", "Counterparty", "Amount", "Due Date", "Status"],
        rows: [
          { "Reference": "STL-7741", "Counterparty": "Vendor Consortium Ltd", "Amount": "₹1.2Cr", "Due Date": "2026-08-12", "Status": "Scheduled" },
          { "Reference": "STL-7745", "Counterparty": "APAC Treasury Pool", "Amount": "₹64L", "Due Date": "2026-08-13", "Status": "Scheduled" },
          { "Reference": "STL-7752", "Counterparty": "Bond Trustee", "Amount": "₹3.4Cr", "Due Date": "2026-08-15", "Status": "Pending approval" },
          { "Reference": "STL-7760", "Counterparty": "Intercompany — OpCo APAC", "Amount": "₹88L", "Due Date": "2026-08-17", "Status": "Scheduled" },
        ],
      },
    ],
  },
{
  key: "service",
  title: "Customer service and operation",

  description: {
    heading: "AI-powered banking customer service workspace",
    content:
      "Provides AI-powered customer support across banking queries, complaints, and onboarding/KYC operations. Routes conversations to specialist agents, automates complaint triage and resolution workflows, monitors SLA performance, and identifies onboarding drop-off risks for proactive customer engagement.",
  },

  kpiSection: [
    {
      title: "Total Conversations",
      value: "1,248",
      unit: "conversations",
      change: "+12.5% vs yesterday",
    },
    {
      title: "Resolved First Call",
      value: "892",
      unit: "conversations",
      change: "71.5% resolution rate",
    },
    {
      title: "Escalated to Staff",
      value: "156",
      unit: "conversations",
      change: "12.5% escalation rate",
    },
    {
      title: "Total Complaints",
      value: "142",
      unit: "complaints",
      change: "18 currently open",
    },
    {
      title: "Resolved Within SLA",
      value: "94.2",
      unit: "%",
      change: "against department SLA targets",
    },
    {
      title: "Onboarding Completion",
      value: "27.6",
      unit: "%",
      change: "8 of 29 sessions completed",
    },
  ],

  charts: [
    {
      title: "24-Hour Inquiry & Resolution Trend",
      type: "line",
      description:
        "Incoming customer queries across the banking support service during a typical operating day.",
      xAxis: "Time of Day",
      yAxis: "Number of Queries",
      data: [
        { label: "08:00", value: 45 },
        { label: "10:00", value: 120 },
        { label: "12:00", value: 185 },
        { label: "14:00", value: 210 },
        { label: "16:00", value: 165 },
        { label: "18:00", value: 130 },
        { label: "20:00", value: 75 },
      ],
    },

    {
      title: "Query Volume by Domain Agent",
      type: "bar",
      description:
        "Customer query volume routed to each specialist banking support agent.",
      xAxis: "Domain Agent",
      yAxis: "Queries Handled",
      data: [
        { label: "Fraud & Dispute", value: 412 },
        { label: "Loans Specialist", value: 328 },
        { label: "Cards & Billing", value: 245 },
        { label: "KYC Compliance", value: 164 },
        { label: "General Banking", value: 99 },
      ],
    },

    {
      title: "Conversation Status Breakdown",
      type: "donut",
      description:
        "Distribution of customer conversations by their current or final status.",
      data: [
        { label: "Resolved (First Call)", value: 892 },
        { label: "Open / In Progress", value: 200 },
        { label: "Escalated", value: 156 },
      ],
    },

    {
      title: "Complaints by Category",
      type: "bar",
      description:
        "Volume of recent customer complaints grouped by their AI-triaged banking category.",
      xAxis: "Category",
      yAxis: "Complaint Count",
      data: [
        { label: "Fraud & Dispute", value: 42 },
        { label: "ATM / Cash", value: 38 },
        { label: "Credit Card", value: 29 },
        { label: "Loans", value: 20 },
        { label: "General", value: 13 },
      ],
    },

    {
      title: "Complaints by Urgency",
      type: "donut",
      description:
        "Distribution of customer complaints based on urgency assigned during AI triage.",
      data: [
        { label: "High", value: 8 },
        { label: "Medium", value: 18 },
        { label: "Low", value: 116 },
      ],
    },

    {
      title: "SLA Turnaround Target by Department",
      type: "bar",
      description:
        "Configured complaint resolution turnaround targets across major banking departments.",
      xAxis: "Department",
      yAxis: "TAT Target (hours)",
      data: [
        { label: "Fraud & Unauthorized Txns", value: 24 },
        { label: "ATM", value: 24 },
        { label: "Digital Banking", value: 24 },
        { label: "Cards", value: 48 },
        { label: "KYC & Compliance", value: 72 },
        { label: "Loans & Advances", value: 120 },
      ],
    },

    {
      title: "Sessions by Current Stage",
      type: "bar",
      description:
        "Current distribution of account-opening and KYC sessions across the onboarding funnel.",
      xAxis: "Stage",
      yAxis: "Sessions",
      data: [
        { label: "Account Type", value: 3 },
        { label: "Personal Details", value: 4 },
        { label: "Document Upload", value: 5 },
        { label: "OCR Verification", value: 3 },
        { label: "Video KYC", value: 2 },
        { label: "Terms & Consent", value: 2 },
        { label: "Review & Submit", value: 2 },
        { label: "Completed", value: 8 },
      ],
    },

    {
      title: "Session Status Breakdown",
      type: "donut",
      description:
        "Current status distribution across all account-opening and KYC onboarding sessions.",
      data: [
        { label: "Completed", value: 8 },
        { label: "Abandoned", value: 11 },
        { label: "In Progress", value: 10 },
      ],
    },

    {
      title: "In-Progress Sessions by Risk Tier",
      type: "bar",
      description:
        "Drop-off risk distribution across currently active onboarding sessions.",
      xAxis: "Risk Tier",
      yAxis: "Sessions",
      data: [
        { label: "High", value: 3 },
        { label: "Medium", value: 2 },
        { label: "Low", value: 5 },
      ],
    },
  ],

  tables: [
    {
      title: "Domain Agent Performance",
      description:
        "Query volume, first-contact-resolution rate, latency, and SLA compliance for each specialist banking agent.",
      columns: [
        "Agent",
        "Queries Handled",
        "FCR Rate",
        "Avg. Latency",
        "SLA Compliance",
        "Status",
      ],
      rows: [
        {
          Agent: "Fraud & Dispute Agent",
          "Queries Handled": "412",
          "FCR Rate": "91.2%",
          "Avg. Latency": "1.84s",
          "SLA Compliance": "99.1%",
          Status: "Optimal",
        },
        {
          Agent: "Loans Specialist Agent",
          "Queries Handled": "328",
          "FCR Rate": "88.4%",
          "Avg. Latency": "2.10s",
          "SLA Compliance": "98.5%",
          Status: "Optimal",
        },
        {
          Agent: "Cards & Billing Agent",
          "Queries Handled": "245",
          "FCR Rate": "96.1%",
          "Avg. Latency": "1.42s",
          "SLA Compliance": "99.8%",
          Status: "High Perf",
        },
        {
          Agent: "KYC Compliance Agent",
          "Queries Handled": "164",
          "FCR Rate": "89.5%",
          "Avg. Latency": "2.89s",
          "SLA Compliance": "97.2%",
          Status: "Optimal",
        },
        {
          Agent: "General Banking Agent",
          "Queries Handled": "99",
          "FCR Rate": "84.2%",
          "Avg. Latency": "1.21s",
          "SLA Compliance": "99.4%",
          Status: "High Speed",
        },
      ],
    },

    {
      title: "Recent Supervisor Escalations",
      description:
        "Customer conversations escalated from AI support to human branch staff for manual intervention.",
      columns: [
        "Customer",
        "Topic",
        "Escalation Reason",
        "Session ID",
        "Escalated At",
      ],
      rows: [
        {
          Customer: "Rahul Sharma",
          Topic: "Fraud & Dispute",
          "Escalation Reason":
            "Unauthorized transaction dispute requires manual review",
          "Session ID": "SESS-20493",
          "Escalated At": "2026-08-11 10:31 AM",
        },
        {
          Customer: "Priya Patel",
          Topic: "Loans",
          "Escalation Reason":
            "Pre-approved limit exceeded, needs credit officer sign-off",
          "Session ID": "SESS-20487",
          "Escalated At": "2026-08-11 10:12 AM",
        },
        {
          Customer: "Sneha Nair",
          Topic: "KYC",
          "Escalation Reason":
            "Document mismatch on re-KYC submission",
          "Session ID": "SESS-20475",
          "Escalated At": "2026-08-11 09:54 AM",
        },
        {
          Customer: "Amit Kumar",
          Topic: "Cards",
          "Escalation Reason":
            "Customer explicitly requested a human agent",
          "Session ID": "SESS-20461",
          "Escalated At": "2026-08-11 09:30 AM",
        },
      ],
    },

    {
      title: "Sample Complaint Queue",
      description:
        "Representative customer complaints covering different urgency levels, categories, and workflow statuses.",
      columns: [
        "Complaint ID",
        "Customer",
        "Subject",
        "Category",
        "Urgency",
        "Status",
        "Assigned Agent",
      ],
      rows: [
        {
          "Complaint ID": "CMP-2025-8841",
          Customer: "Vikramaditya Sharma",
          Subject:
            "Unauthorized ₹18,500 EMI debit from Salary Account",
          Category: "Fraud & Dispute",
          Urgency: "High",
          Status: "In Progress",
          "Assigned Agent": "Fraud & Dispute Agent",
        },
        {
          "Complaint ID": "CMP-2025-7712",
          Customer: "Sunita Reddy",
          Subject:
            "ATM cash dispense failure — ₹5,000 debited but cash not dispensed",
          Category: "ATM / Cash",
          Urgency: "High",
          Status: "New",
          "Assigned Agent": "Branch Contact Center Agent",
        },
        {
          "Complaint ID": "CMP-2025-6109",
          Customer: "Anand Kulkarni",
          Subject:
            "Credit card annual fee charged despite lifetime-free offer",
          Category: "Credit Card",
          Urgency: "Medium",
          Status: "Resolved",
          "Assigned Agent": "Cards & Billing Agent",
        },
      ],
    },

    {
      title: "Department SLA Policy",
      description:
        "Resolution and escalation thresholds used to route and monitor banking complaints.",
      columns: [
        "Department",
        "Typical Complaint Types",
        "TAT (Hours)",
        "Escalation Threshold (Hours)",
        "Regulatory Reportable",
      ],
      rows: [
        {
          Department: "Fraud & Unauthorized Transactions",
          "Typical Complaint Types":
            "Account takeover, fraudulent transactions, phishing",
          "TAT (Hours)": "24",
          "Escalation Threshold (Hours)": "12",
          "Regulatory Reportable": "Yes",
        },
        {
          Department: "ATM",
          "Typical Complaint Types":
            "Cash not dispensed, partial cash, card retained",
          "TAT (Hours)": "24",
          "Escalation Threshold (Hours)": "12",
          "Regulatory Reportable": "Yes",
        },
        {
          Department: "Cards",
          "Typical Complaint Types":
            "Card blocked, not received, unauthorized card transaction",
          "TAT (Hours)": "48",
          "Escalation Threshold (Hours)": "24",
          "Regulatory Reportable": "Yes",
        },
        {
          Department: "KYC & Compliance",
          "Typical Complaint Types":
            "KYC update, document verification, PAN issues",
          "TAT (Hours)": "72",
          "Escalation Threshold (Hours)": "48",
          "Regulatory Reportable": "Yes",
        },
        {
          Department: "Loans & Advances",
          "Typical Complaint Types":
            "Loan application, approval, rejection, EMI, repayment",
          "TAT (Hours)": "120",
          "Escalation Threshold (Hours)": "96",
          "Regulatory Reportable": "No",
        },
        {
          Department: "Customer Service / Grievance Redressal",
          "Typical Complaint Types":
            "General complaints, unresolved service requests",
          "TAT (Hours)": "96",
          "Escalation Threshold (Hours)": "48",
          "Regulatory Reportable": "No",
        },
      ],
    },

    {
      title: "At-Risk Onboarding Sessions",
      description:
        "Account-opening and KYC sessions flagged by the drop-off risk scorer for proactive customer follow-up.",
      columns: [
        "Customer",
        "Current Stage",
        "Risk Tier",
        "Signal",
      ],
      rows: [
        {
          Customer: "Aarav Sharma",
          "Current Stage": "Document Upload",
          "Risk Tier": "High",
          Signal: "Idle 14.0 min on document_upload",
        },
        {
          Customer: "Priya Patel",
          "Current Stage": "Personal Details",
          "Risk Tier": "High",
          Signal:
            "Repeated back-navigation (3x on personal_details)",
        },
        {
          Customer: "Liam Nguyen",
          "Current Stage": "OCR Verification",
          "Risk Tier": "High",
          Signal:
            "≥2 failed OCR attempts; idle 7.0 min on ocr_verification",
        },
        {
          Customer: "Emma Garcia",
          "Current Stage": "Document Upload",
          "Risk Tier": "Medium",
          Signal:
            "Prior abandonment at same stage (document_upload)",
        },
        {
          Customer: "Noah Smith",
          "Current Stage": "Video KYC",
          "Risk Tier": "Medium",
          Signal:
            "Long dwell on video_kyc_liveness (~25 min)",
        },
      ],
    },

    {
      title: "Staff Access Snapshot",
      description:
        "Current support staff roles and access levels for the customer service operation.",
      columns: [
        "Role",
        "Total Count",
        "Example Login",
      ],
      rows: [
        {
          Role: "Support Agent",
          "Total Count": "250",
          "Example Login": "priya.desai@bank.example",
        },
        {
          Role: "Supervisor",
          "Total Count": "90",
          "Example Login": "arjun.kapoor@bank.example",
        },
      ],
    },
  ],
},
];

export const getTeamDashboard = (key: string): TeamDashboardData | undefined =>
  TEAM_DASHBOARDS.find((d) => d.key === key);
