import { ArrowRight, Mail, Phone } from "lucide-react";
import { CONTACT } from "../config/contact";

const CONTACT_CARDS = [
  {
    label: "Call Us",
    value: CONTACT.phoneDisplay,
    href: CONTACT.phoneTel,
    cta: "Call Now",
    icon: Phone,
    tone: "bg-blue-50 text-[#2453d8]"
  },
  {
    label: "Email Us",
    value: CONTACT.email,
    href: CONTACT.emailHref,
    cta: "Send Email",
    icon: Mail,
    tone: "bg-emerald-50 text-emerald-600"
  }
];

export const ContactUsSection = () => (
  <section id="contact" className="scroll-mt-24 bg-[#f8faff] py-6 sm:py-8" aria-labelledby="contact-heading">
    <div className="mx-auto max-w-[1040px] px-4 text-center sm:px-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#2453d8]">Contact Us</p>
      <h2 id="contact-heading" className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 sm:text-[32px]">
        Let&apos;s talk about your business
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-[12px] leading-6 text-slate-500 sm:text-[13px]">
        Have a question about Bizio or want to know how it can help you track your sales, collections and
        outstanding payments? Get in touch with us.
      </p>

      <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
        {CONTACT_CARDS.map(({ label, value, href, cta, icon: Icon, tone }) => (
          <a
            key={label}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#2453d8]/30 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-sm font-extrabold text-slate-950">{value}</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-[#2453d8] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                {cta}
                <ArrowRight size={12} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
);