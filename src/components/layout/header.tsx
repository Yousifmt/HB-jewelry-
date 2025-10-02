// src/components/layout/header.tsx
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-transparent bg-[hsl(var(--logo-dark))] text-[hsl(var(--logo-light))] shadow-sm">
      <div className="container mx-auto flex h-40 max-w-screen-2xl items-center justify-center py-4">
        <div className="flex flex-col items-center">
          <Image
            src="/favicon.ico"
            alt="HB favicon"
            width={90}
            height={90}
            className="h-18 w-18 md:h-18 md:w-18 rounded-full shadow-sm ring-2 ring-white/10"
            priority
          />
          {/* Light-blue text to match the logo accent */}
          <span className="mt-3 text-xl font-bold md:text-2xl text-[hsl(var(--logo-light))]">
            HB Jewelry Dashboard
          </span>
        </div>
      </div>
    </header>
  );
}
