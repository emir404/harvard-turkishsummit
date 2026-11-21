import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import summitLogo from "@/assets/summit-logo.png";
import { RegistrationForm, type Ticket } from "@/components/registration/registration-form";
import { event, links } from "@/content/summit";
import { cn } from "@/lib/cn";
import { back, pageTransition, ticketSwitch } from "@/lib/page-transition";

const pages = {
  summit: {
    title: "Summit registration",
    meta: `${event.dateLabel} · ${event.summitHours} · ${event.venue}`,
  },
  gala: {
    title: "Gala registration",
    meta: `${event.dateLabel} · ${event.galaHours} · Venue to be announced`,
  },
} as const;

const ticketOptions = [
  { ticket: "summit", label: "Summit Pass", href: links.registerSummit },
  { ticket: "gala", label: "Gala", href: links.registerGala },
] as const;

const markerClass = "flex size-6 shrink-0 items-center justify-center rounded-xs text-sm";

function Steps() {
  return (
    <ol className="hidden items-center justify-center gap-4 text-sm sm:flex lg:col-span-6">
      <li className="flex items-center gap-2.5 text-fg-secondary">
        <span className={cn(markerClass, "border border-field text-fg")}>
          <FiCheck aria-hidden="true" className="size-3.5" />
        </span>
        Ticket
        <span className="sr-only">(completed)</span>
      </li>
      <li aria-hidden="true" className="h-px w-10 bg-field" />
      <li aria-current="step" className="flex items-center gap-2.5 font-medium text-fg">
        <span className={cn(markerClass, "bg-accent")}>2</span>
        Your details
      </li>
      <li aria-hidden="true" className="h-px w-10 bg-field" />
      <li className="flex items-center gap-2.5 text-fg-tertiary">
        <span className={cn(markerClass, "border border-field")}>3</span>
        Payment
      </li>
    </ol>
  );
}

export function RegistrationPage({ ticket }: { ticket: Ticket }) {
  const page = pages[ticket];

  return (
    <ViewTransition {...pageTransition}>
      <div className="mx-auto max-w-page">
        {/* Switching tickets keeps the header still while the form crossfades; otherwise it moves with the page. */}
        <ViewTransition
          name="registration-header"
          share={{ "ticket-switch": "page-anchor", default: "none" }}
          default="none"
        >
          <header className="grid h-22 grid-cols-2 items-center gap-x-5 border-b border-rule px-5 sm:grid-cols-3 md:px-10 lg:grid-cols-12">
            <Link href="/" transitionTypes={back} className="w-fit lg:col-span-3">
              <Image src={summitLogo} alt={`${event.name} 2027`} priority className="h-12.5 w-auto" />
            </Link>
            <Steps />
            <Link
              href="/"
              transitionTypes={back}
              className="flex items-center gap-2 justify-self-end text-sm text-fg underline-offset-4 hover:underline lg:col-span-3"
            >
              <FiArrowLeft aria-hidden="true" className="size-4" />
              Back to site
            </Link>
          </header>
        </ViewTransition>

        <main className="px-5 pt-16 pb-20 md:px-10 lg:pb-30">
          <RegistrationForm
            ticket={ticket}
            intro={
              <>
                <nav aria-label="Ticket" className="flex gap-2">
                  {ticketOptions.map((option) => (
                    <Link
                      key={option.ticket}
                      href={option.href}
                      transitionTypes={ticketSwitch}
                      aria-current={option.ticket === ticket ? "page" : undefined}
                      className={cn(
                        "inline-flex h-11 items-center rounded-xs border px-4 text-sm",
                        option.ticket === ticket
                          ? "border-fg bg-fg font-medium text-ground"
                          : "border-field text-fg hover:border-fg",
                      )}
                    >
                      {option.label}
                    </Link>
                  ))}
                </nav>
                <h1 className="mt-10 text-5xl font-medium tracking-tight text-fg lg:text-6xl">{page.title}</h1>
                <p className="mt-3 text-lg text-pretty text-fg-secondary tabular-nums">{page.meta}</p>
              </>
            }
          />
        </main>
      </div>
    </ViewTransition>
  );
}
