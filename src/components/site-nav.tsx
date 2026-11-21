import Image from "next/image";
import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import summitLogo from "@/assets/summit-logo.png";
import { event, navigation } from "@/content/summit";

export function SiteNav() {
  return (
    // A plain row until xl, where the links line up with the middle column like the rest of the page.
    <header className="flex h-24 items-center justify-between gap-x-5 px-5 md:px-10 xl:grid xl:grid-cols-12">
      <Link href="/" className="w-fit xl:col-span-6">
        <Image src={summitLogo} alt={`${event.name} 2027`} priority className="h-12.5 w-auto" />
      </Link>
      <nav
        aria-label="Sections"
        className="hidden items-center gap-6 lg:mr-3 lg:ml-auto lg:flex xl:col-span-5 xl:m-0 xl:gap-8"
      >
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="text-base text-fg underline-offset-4 hover:underline">
            {item.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/#tickets"
        className="flex items-center gap-1.5 text-base font-medium text-fg underline-offset-4 hover:underline xl:col-span-1 xl:justify-self-end"
      >
        Tickets
        <FiArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </header>
  );
}
