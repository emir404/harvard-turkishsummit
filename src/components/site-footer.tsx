import Image from "next/image";
import { FiInstagram, FiLinkedin, FiMail } from "react-icons/fi";
import summitLogo from "@/assets/summit-logo.png";
import { ActionLink } from "@/components/ui/action-link";
import { event, footer, links } from "@/content/summit";
import { forward } from "@/lib/page-transition";

const linkClass = "w-fit text-base text-fg underline-offset-4 hover:underline";
const columnTitleClass = "pb-1 text-sm text-fg-tertiary";

export function SiteFooter() {
  const firstContact = footer.contacts[0];

  return (
    <footer className="mx-auto max-w-page px-5 pt-18 pb-10 md:px-10 xl:px-16">
      <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-12">
        <div className="col-span-2 flex flex-col lg:col-span-3">
          <Image src={summitLogo} alt={`${event.name} 2027`} className="h-16 w-auto self-start" />
          <p className="mt-6 max-w-72 text-base text-pretty text-fg-secondary">{footer.tagline}</p>
          <div className="mt-6 flex gap-5 text-fg">
            <ActionLink href={links.instagram} aria-label="Instagram">
              <FiInstagram aria-hidden="true" className="size-5" />
            </ActionLink>
            <ActionLink href={links.linkedin} aria-label="LinkedIn">
              <FiLinkedin aria-hidden="true" className="size-5" />
            </ActionLink>
            <ActionLink href={firstContact ? `mailto:${firstContact.email}` : undefined} aria-label="Email the organizers">
              <FiMail aria-hidden="true" className="size-5" />
            </ActionLink>
          </div>
        </div>

        {footer.columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3 lg:col-span-2">
            <h2 className={columnTitleClass}>{column.title}</h2>
            {column.links.map((link) => (
              <ActionLink
                key={link.label}
                href={link.href}
                // The footer is on the home page: a link to another page is one into registration.
                transitionTypes={link.href?.startsWith("/register") ? forward : undefined}
                className={linkClass}
              >
                {link.label}
              </ActionLink>
            ))}
          </nav>
        ))}

        <div id="contact" className="col-span-2 flex scroll-mt-24 flex-col gap-3 sm:col-span-1 lg:col-span-3">
          <h2 className={columnTitleClass}>Contact</h2>
          {footer.contacts.map((contact) => (
            <p key={contact.email} className="flex flex-col pb-2">
              <span className="text-base text-fg">{contact.name}</span>
              <a
                href={`mailto:${contact.email}`}
                className="w-fit text-sm break-all text-fg-secondary underline-offset-4 hover:underline"
              >
                {contact.email}
              </a>
            </p>
          ))}
        </div>

        <nav aria-label="Legal" className="flex flex-col gap-3 lg:col-span-2">
          <h2 className={columnTitleClass}>Legal</h2>
          {footer.legal.map((link) => (
            <ActionLink key={link.label} href={link.href} className={linkClass}>
              {link.label}
            </ActionLink>
          ))}
        </nav>
      </div>

      <div className="mt-18 flex flex-wrap justify-between gap-x-5 gap-y-2 border-t border-rule pt-6 text-sm text-fg-tertiary">
        <p>{footer.copyright}</p>
        <p>{footer.locations}</p>
      </div>
    </footer>
  );
}
