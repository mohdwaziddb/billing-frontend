import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, CheckCircle2, CircleDollarSign, FileText, LineChart, Mail, Menu, Phone, ReceiptText, Settings, Sparkles, UsersRound, WalletCards, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ContactUsSection } from "../components/ContactUsSection";
import { Modal } from "../components/Modal";
import { ProductExperienceSection } from "../components/ProductExperienceSection";
import { CONTACT } from "../config/contact";

type Tile = { icon: LucideIcon; title: string; copy: string; tone?: string };

const features: Tile[] = [
  { icon: LineChart, title: "Sales Tracking", copy: "Track your sales and analyze business performance.", tone: "bg-blue-50 text-blue-700" },
  { icon: UsersRound, title: "Customer Management", copy: "Store customer details and transaction history.", tone: "bg-emerald-50 text-emerald-700" },
  { icon: ReceiptText, title: "Invoices", copy: "Create and manage invoices with payment status.", tone: "bg-violet-50 text-violet-700" },
  { icon: WalletCards, title: "Collection Tracking", copy: "Record payments and track collection performance.", tone: "bg-orange-50 text-orange-700" },
  { icon: CircleDollarSign, title: "Outstanding", copy: "Know which payments are pending and follow up.", tone: "bg-rose-50 text-rose-700" },
  { icon: BarChart3, title: "Business Dashboard", copy: "View important business numbers at a glance.", tone: "bg-blue-50 text-blue-700" },
  { icon: Boxes, title: "Products", copy: "Manage your products and their information.", tone: "bg-emerald-50 text-emerald-700" },
  { icon: FileText, title: "Reports & Export", copy: "Generate reports and export data as needed.", tone: "bg-violet-50 text-violet-700" }
];

const navigation = [["#product", "Product"], ["#features", "Features"], ["#about", "About Us"], ["#contact", "Contact"]] as const;
const money = "₹";

function Label({ children }: { children: string }) { return <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#2453d8]">{children}</p>; }
function Metric({ name, value, change, tone = "text-slate-950" }: { name: string; value: string; change?: string; tone?: string }) { return <div className="rounded-lg border border-slate-100 bg-white p-2.5"><p className="text-[8px] font-bold text-slate-400">{name}</p><div className="mt-1 flex items-baseline justify-between gap-1"><b className={`text-sm ${tone}`}>{value}</b>{change && <span className="text-[8px] font-bold text-emerald-600">{change}</span>}</div></div>; }
function Chart() { return <div className="mt-3 flex h-[72px] items-end gap-1.5 border-b border-l border-slate-100 px-2 pb-1">{[22, 35, 48, 40, 58, 77, 59, 48, 65, 47, 61, 52, 68, 66, 84].map((height, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#2453d8] to-[#4f8dff]" style={{ height: `${height}%`, opacity: i === 14 ? 1 : .84 }} />)}</div>; }

function Dashboard({ analytics = false }: { analytics?: boolean }) {
  if (analytics) return <AnalyticsPreview/>;
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_20px_50px_rgba(36,83,216,.16)]">
    <div className={`grid min-w-0 overflow-hidden rounded-lg border border-slate-100 ${analytics ? "" : "lg:grid-cols-[78px_minmax(0,1fr)]"}`}>
      {!analytics && <aside className="hidden bg-[#071529] px-2 py-3 text-slate-300 lg:block"><b className="px-1 text-sm text-white">Bizio</b><div className="mt-5 space-y-1">{([[BarChart3,"Dashboard"],[UsersRound,"Customers"],[ReceiptText,"Invoices"],[LineChart,"Sales"],[WalletCards,"Collections"],[CircleDollarSign,"Outstanding"],[Boxes,"Products"],[FileText,"Reports"],[Settings,"Settings"]] as [LucideIcon, string][]).map(([Icon, text]) => <div className={`flex items-center gap-1.5 rounded px-1.5 py-1.5 text-[7px] ${text === "Dashboard" ? "bg-[#193257] text-white" : ""}`} key={text}><Icon size={9}/>{text}</div>)}</div></aside>}
      <div className="min-w-0 bg-[#f8fafc] p-2.5"><div className="flex items-center justify-between"><div><b className="text-[11px] text-slate-950">{analytics ? "Business analytics" : "Dashboard"}</b><p className="text-[7px] text-slate-400">Illustrative product preview</p></div><span className="rounded bg-white px-2 py-1 text-[7px] text-slate-400">This week</span></div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4"><Metric name="Total Sales" value={`${money}86,400`} change="+12.4%"/><Metric name="Collected" value={`${money}67,350`} change="+8.2%" tone="text-emerald-700"/><Metric name="Outstanding" value={`${money}19,050`} change="-5.4%" tone="text-orange-600"/><Metric name="Collection Rate" value="78%" change="" tone="text-violet-700"/></div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1.5fr_.9fr]"><div className="rounded-lg border border-slate-100 bg-white p-2"><div className="flex justify-between"><b className="text-[8px]">Sales Trend</b><span className="text-[7px] text-slate-400">This Week</span></div><Chart/><div className="mt-1 flex justify-between text-[6px] text-slate-400"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div><div className="rounded-lg border border-slate-100 bg-white p-2"><b className="text-[8px]">Collection Overview</b><div className="mx-auto mt-2 flex h-[73px] w-[73px] items-center justify-center rounded-full border-[9px] border-blue-100 border-t-[#2453d8] border-r-[#2453d8]"><div className="text-center"><b className="text-sm">78%</b><p className="text-[6px] text-slate-400">Collected</p></div></div><div className="mt-2 flex justify-between text-[7px]"><span className="text-slate-500">● Collected</span><b>{money}67,350</b></div><div className="mt-1 flex justify-between text-[7px]"><span className="text-slate-500">● Pending</span><b>{money}19,050</b></div></div></div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1.45fr]"><Metric name="Customers" value="512" change="+10 this month"/><Metric name="New Customers" value="34" change="+4 this month"/><Metric name="Overdue Invoices" value="21" tone="text-orange-600"/><div className="rounded-lg border border-slate-100 bg-white p-2"><div className="flex justify-between"><b className="text-[8px]">Recent Transactions</b><span className="text-[7px] text-blue-700">View all</span></div>{[["ABC Traders", `${money}12,600`],["Sharma Stores", `${money}6,450`],["Kumar Enterprises", `${money}2,500`]].map(([name, value]) => <div key={name} className="mt-1 flex justify-between text-[7px]"><span>{name}</span><b>{value}</b></div>)}</div></div>
      </div>
    </div>
  </div>;
}

function AnalyticsPreview() {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(36,83,216,.14)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold text-[#2453d8]">PERFORMANCE SUMMARY</p><h3 className="mt-1 text-base font-extrabold">Sales &amp; collection analytics</h3></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[9px] font-bold text-[#2453d8]">Demo data</span></div><div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 sm:grid-cols-4"><Metric name="Sales" value={`${money}86,400`} change="+12.4%"/><Metric name="Collected" value={`${money}67,350`} change="+8.2%" tone="text-emerald-700"/><Metric name="Outstanding" value={`${money}19,050`} tone="text-orange-600"/><Metric name="Collection rate" value="78%" tone="text-[#2453d8]"/></div><div className="grid gap-4 p-4 sm:grid-cols-[1.35fr_.9fr]"><div className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold">Weekly sales performance</p><p className="mt-1 text-[9px] text-slate-400">Illustrative sales activity</p></div><LineChart size={17} className="text-[#2453d8]"/></div><div className="mt-5 flex h-28 items-end gap-2">{[28,45,38,62,78,56,45,66,52,73,67,87].map((height,index)=><span key={index} className="flex-1 rounded-t bg-gradient-to-t from-[#2453d8] to-[#72a1ff]" style={{height:`${height}%`}}/>)}</div><div className="mt-2 flex justify-between text-[8px] text-slate-400"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div></div><div className="rounded-xl bg-[#f5f8ff] p-4"><p className="text-xs font-extrabold">Collection progress</p><div className="mt-4 flex items-center gap-4"><div className="flex h-[82px] w-[82px] shrink-0 items-center justify-center rounded-full border-[10px] border-blue-100 border-t-[#2453d8] border-r-[#2453d8]"><div className="text-center"><b className="text-lg">78%</b><p className="text-[7px] text-slate-400">collected</p></div></div><div className="space-y-2 text-[10px]"><p className="flex justify-between gap-3"><span className="text-slate-500">Received</span><b>{money}67,350</b></p><p className="flex justify-between gap-3"><span className="text-slate-500">Pending</span><b>{money}19,050</b></p></div></div><div className="mt-4 border-t border-blue-100 pt-3"><p className="text-[9px] text-slate-500">Outstanding payments are highlighted for follow-up.</p></div></div></div><div className="grid grid-cols-3 gap-3 border-t border-slate-100 bg-slate-50 p-4"><div><p className="text-[9px] text-slate-500">Customers</p><b className="text-sm">512</b></div><div><p className="text-[9px] text-slate-500">Invoices</p><b className="text-sm">156</b></div><div><p className="text-[9px] text-slate-500">Overdue</p><b className="text-sm text-orange-600">21</b></div></div></div>;
}

function TileCard({ tile }: { tile: Tile }) { const Icon = tile.icon; return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tile.tone}`}><Icon size={18}/></div><h3 className="mt-3 text-xs font-extrabold text-slate-950">{tile.title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{tile.copy}</p></article>; }

export const LandingPage = () => {
  const [open, setOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactErrors, setContactErrors] = useState<Partial<Record<"name" | "email" | "message", string>>>({});

  const resetContactForm = () => {
    setContactForm({ name: "", email: "", message: "" });
    setContactErrors({});
  };

  const validateContactForm = () => {
    const nextErrors: Partial<Record<"name" | "email" | "message", string>> = {};

    if (!contactForm.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!contactForm.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!contactForm.message.trim()) {
      nextErrors.message = "Message is required.";
    }

    return nextErrors;
  };

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateContactForm();
    setContactErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const subject = `Business inquiry from ${contactForm.name.trim()}`;
    const body = [
      `Name: ${contactForm.name.trim()}`,
      `Email: ${contactForm.email.trim()}`,
      "",
      contactForm.message.trim()
    ].join("\n");

    const mailtoLink = `${CONTACT.emailHref}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const gmailWindow = window.open(gmailLink, "_blank", "noopener,noreferrer");

    if (!gmailWindow) {
      window.location.href = mailtoLink;
    }

    resetContactForm();
    setContactModalOpen(false);
  };

  return <div className="bizio-home min-h-screen overflow-x-hidden bg-white text-slate-950" style={{ fontFamily: "Manrope, Inter, system-ui, sans-serif" }}>
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 sm:px-6">
        <a href="#home" className="inline-flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.04em]">
          <span className="text-[#2453d8]">Bizio</span>
          <span className="text-slate-900">Technologies</span>
        </a>

        <nav className="hidden items-center gap-7 text-[11px] font-semibold text-slate-700 md:flex">
          {navigation.map(([href, text]) => (
            <a key={href} href={href} className="transition hover:text-[#2453d8]">
              {text}
            </a>
          ))}
        </nav>

        <div className="hidden items-center md:flex">
          <Link to="/login" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
            Login
          </Link>
        </div>

        <button className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 md:hidden" aria-label="Open menu" onClick={()=>setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-100 bg-white p-3 md:hidden">
          <div className="space-y-1">
            {navigation.map(([href, text]) => (
              <a key={href} onClick={()=>setOpen(false)} href={href} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#2453d8]">
                {text}
              </a>
            ))}
          </div>
          <div className="mt-3">
            <Link to="/login" className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-700">
              Login
            </Link>
          </div>
        </nav>
      )}
    </header>
    <main>
      <section id="home" className="relative overflow-hidden bg-[radial-gradient(circle_at_80%_55%,rgba(104,123,255,.16),transparent_25%),linear-gradient(90deg,#fff,#f8faff)]"><div className="mx-auto grid max-w-[1180px] gap-7 px-4 py-9 sm:px-6 lg:grid-cols-[.78fr_1.22fr] lg:items-center lg:py-11"><div><span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[8px] font-extrabold text-[#2453d8]">SMART BUSINESS MANAGEMENT</span><h1 className="mt-4 max-w-lg text-[32px] font-extrabold leading-[1.12] tracking-tight sm:text-[42px]">Grow Your Business with Better <span className="text-[#2453d8]">Sales &amp; Collection</span> Tracking</h1><p className="mt-3 max-w-md text-[11px] leading-5 text-slate-600">Track your sales, customers, invoices and collections in one place — so you always know what is happening in your business and where your money is.</p><div className="mt-5 flex gap-2"><Link to="/login" className="rounded bg-[#2453d8] px-3 py-2 text-[9px] font-bold text-white shadow">Start Managing Your Business</Link><a href="#features" className="rounded border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold">Explore Features</a></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{features.slice(0,1).concat(features.slice(3,6)).map((tile)=><div key={tile.title} className="min-h-[72px] rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm"><tile.icon size={19} className={`mx-auto ${tile.tone?.split(" ")[1]}`}/><p className="mt-2 text-[9px] font-extrabold text-slate-700">{tile.title.replace("Business ", "")}</p></div>)}</div></div><Dashboard/></div></section>
      <section id="product" className="mx-auto max-w-[1040px] px-4 py-10 text-center sm:px-6"><Label>THE BUSINESS CHALLENGE</Label><h2 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">Know Where Your Business Stands</h2><p className="mx-auto mt-2 max-w-xl text-[10px] leading-4 text-slate-500">Running a business becomes difficult when sales, customers, invoices and collections are scattered across different places. Bizio brings the important numbers together so you can make better business decisions.</p><div className="mt-6 grid gap-3 md:grid-cols-3">{[{icon:LineChart,title:"Sales",copy:"How much did I sell?\nSee and analyze your sales performance.",tone:"bg-blue-50 text-blue-700"},{icon:WalletCards,title:"Collection",copy:"How much have I collected?\nTrack payments and collections from your customers.",tone:"bg-emerald-50 text-emerald-700"},{icon:CircleDollarSign,title:"Outstanding",copy:"How much money is still pending?\nIdentify and follow up on pending payments.",tone:"bg-orange-50 text-orange-700"}].map(tile => <article key={tile.title} className="flex gap-3 rounded-xl border border-slate-200 p-4 text-left shadow-sm"><div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tile.tone}`}><tile.icon size={20}/></div><div><p className="text-[11px] font-extrabold text-[#2453d8]">{tile.title}</p><p className="mt-1 whitespace-pre-line text-[10px] font-bold leading-4 text-slate-800">{tile.copy}</p></div></article>)}</div></section>
      <section id="features" className="bg-[#f8faff] py-9"><div className="mx-auto max-w-[1040px] px-4 sm:px-6"><div className="text-center"><Label>CORE FEATURES</Label><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Everything You Need to Track Your Business</h2></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{features.map(tile=><TileCard key={tile.title} tile={tile}/>)}</div></div></section>
      <section className="mx-auto grid max-w-[1040px] gap-8 px-4 py-11 sm:px-6 lg:grid-cols-[.74fr_1.26fr] lg:items-center"><div><Label>SALES &amp; COLLECTION INSIGHTS</Label><h2 className="mt-2 text-xl font-extrabold leading-tight sm:text-2xl">Turn Your Business Data Into Better Decisions</h2><ul className="mt-5 space-y-2">{["Sales tell you how much business you are doing.","Collections tell you how much money has actually come back.","Outstanding tells you what still needs attention.","Bizio brings these numbers together so you can understand your real business position."].map(item=><li key={item} className="flex gap-2 text-[10px] leading-4 text-slate-600"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#2453d8]"/>{item}</li>)}</ul></div><Dashboard analytics/></section>
      <section className="bg-gradient-to-r from-[#1746c9] to-[#2d57df] py-8 text-white"><div className="mx-auto max-w-[1040px] px-4 text-center sm:px-6"><p className="text-[9px] font-bold">BUSINESS GROWTH FLOW</p><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Track Today. Understand Tomorrow. Grow Your Business.</h2><div className="mt-6 grid gap-3 sm:grid-cols-5">{[{icon:LineChart,title:"Sales",copy:"Capture and track every sale"},{icon:WalletCards,title:"Collection",copy:"Record payments with ease"},{icon:CircleDollarSign,title:"Outstanding",copy:"Identify pending payments"},{icon:BarChart3,title:"Insights",copy:"Get clear business insights"},{icon:Sparkles,title:"Growth",copy:"Make better decisions and grow"}].map(({icon:Icon,title,copy})=><div key={title} className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm"><Icon className="mx-auto text-cyan-200" size={23}/><h3 className="mt-2 text-[11px] font-extrabold">{title}</h3><p className="mt-1 text-[8px] text-blue-100">{copy}</p></div>)}</div></div></section>
      <section id="about" className="mx-auto max-w-[1040px] px-4 py-10 sm:px-6"><div className="text-center"><Label>WHY CHOOSE BIZIO</Label><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Built for Business Owners Like You</h2></div><div className="mt-6 grid gap-3 md:grid-cols-4">{[{icon:Boxes,title:"Everything in One Place",copy:"Sales, customers, invoices and collections in one system."},{icon:BarChart3,title:"Clear Business Visibility",copy:"Understand important business numbers quickly."},{icon:FileText,title:"Less Manual Tracking",copy:"Reduce dependency on spreadsheets and manual work."},{icon:UsersRound,title:"Built for Business Owners",copy:"Focus on what matters with simple and powerful tools."}].map(tile=><TileCard key={tile.title} tile={{...tile,tone:"bg-blue-50 text-[#2453d8]"}}/>)}</div></section>
      <ProductExperienceSection />
      <ContactUsSection />
      <section id="contact-cta" className="bg-gradient-to-r from-[#1746c9] to-[#2d57df]"><div className="mx-auto flex max-w-[1040px] flex-col gap-4 px-4 py-6 text-white sm:px-6 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><div className="rounded-lg bg-white/15 p-2"><BarChart3 size={22}/></div><div><p className="text-lg font-extrabold">Know Your Numbers. Grow Your Business.</p><p className="mt-1 text-[10px] text-blue-100">Start tracking your sales, collections and outstanding payments with Bizio.</p></div></div><div className="flex gap-2"><Link to="/login" className="rounded bg-white px-6 py-2 text-[9px] font-extrabold text-[#2453d8]">Get Started</Link><button type="button" onClick={() => { resetContactForm(); setContactModalOpen(true); }} className="rounded border border-white/60 px-6 py-2 text-[9px] font-extrabold text-white">Contact Us</button></div></div></section>
    </main>
    <footer className="bg-[#06142b] text-white"><div className="mx-auto grid max-w-[1040px] gap-7 px-4 py-7 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr]"><div><b className="text-[15px] font-black tracking-[-0.04em]"><span className="text-[#2453d8]">Bizio</span> <span className="text-white">Technologies</span></b><p className="mt-2 max-w-xs text-[10px] leading-5 text-slate-400">Helping businesses track sales, collections and outstanding payments to grow with confidence.</p></div><div><p className="text-[10px] font-bold text-slate-300">Product</p><a href="#features" className="mt-2 block text-[10px] text-slate-400">Features</a><a href="#product" className="mt-2 block text-[10px] text-slate-400">Product</a></div><div><p className="text-[10px] font-bold text-slate-300">Contact</p><a href="#about" className="mt-2 block text-[10px] text-slate-400 hover:text-white">About Us</a><a href="#contact" className="mt-2 block text-[10px] text-slate-400 hover:text-white">Contact Us</a><Link to="/login" className="mt-2 block text-[10px] text-slate-400 hover:text-white">Login</Link></div></div><div className="border-t border-white/10 py-3 text-center text-[10px] text-slate-500">© 2026 Bizio Technologies. All rights reserved.</div></footer>
    <Modal open={contactModalOpen} title="Contact Bizio" eyebrow="Get in touch" onClose={() => { resetContactForm(); setContactModalOpen(false); }} maxWidthClass="max-w-xl">
      <form onSubmit={handleContactSubmit} className="space-y-4">
        <div>
          <label htmlFor="contact-modal-name" className="mb-1 block text-[11px] font-bold text-slate-700">Name <span className="text-rose-500">*</span></label>
          <input
            id="contact-modal-name"
            value={contactForm.name}
            onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 ${contactErrors.name ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-[#2453d8]"}`}
            placeholder="Your name"
          />
          {contactErrors.name ? <p className="mt-1 text-[11px] font-medium text-rose-500">{contactErrors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="contact-modal-email" className="mb-1 block text-[11px] font-bold text-slate-700">Email <span className="text-rose-500">*</span></label>
          <input
            id="contact-modal-email"
            type="email"
            value={contactForm.email}
            onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 ${contactErrors.email ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-[#2453d8]"}`}
            placeholder="you@example.com"
          />
          {contactErrors.email ? <p className="mt-1 text-[11px] font-medium text-rose-500">{contactErrors.email}</p> : null}
        </div>

        <div>
          <label htmlFor="contact-modal-message" className="mb-1 block text-[11px] font-bold text-slate-700">Message <span className="text-rose-500">*</span></label>
          <textarea
            id="contact-modal-message"
            rows={5}
            value={contactForm.message}
            onChange={(event) => setContactForm((current) => ({ ...current, message: event.target.value }))}
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 ${contactErrors.message ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-[#2453d8]"}`}
            placeholder="Tell us about your business and how we can help."
          />
          {contactErrors.message ? <p className="mt-1 text-[11px] font-medium text-rose-500">{contactErrors.message}</p> : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { resetContactForm(); setContactModalOpen(false); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-700">Cancel</button>
          <button type="submit" className="rounded-xl bg-[#2453d8] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#1d47bd]">Send Email</button>
        </div>
      </form>
    </Modal>
  </div>;
};
