import Image from "next/image";
import Link from "next/link";
import summitWordmark from "@/assets/summit-wordmark.png";
import { event, hero, navigation } from "@/content/summit";

export function SiteNav() {
  return (
    // Two halves around a hairline at the centre: the edition note ends short
    // of it on the left, the section links start past it on the right.
    <header className="relative z-20 flex h-22 items-center px-5 md:px-10 xl:px-16">
      <div className="flex flex-1 items-center justify-between lg:pr-12 xl:pr-17.5">
        <Link href="/" className="w-fit">
          <Image src={summitWordmark} alt={`${event.name} 2027`} priority className="h-12 w-auto" />
        </Link>
        <p className="hidden text-[0.8125rem] leading-5 text-white/82 xl:block">( {hero.edition} )</p>
      </div>
      <div aria-hidden="true" className="hidden h-14 w-px bg-white/35 lg:block" />
      <div className="flex flex-1 items-center justify-end lg:justify-between lg:pl-12 xl:pl-16">
        <nav aria-label="Sections" className="hidden items-center gap-8.5 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm leading-5 text-white underline-offset-4 transition-opacity hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={hero.cta.href}
          className="flex h-10 items-center rounded-full border border-white/70 px-4.5 text-sm leading-5 text-white transition-colors hover:border-white hover:bg-white hover:text-ground"
        >
          {hero.cta.label}
        </Link>
      </div>
    </header>
  );
}
