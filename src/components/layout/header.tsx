// src/components/layout/header.tsx
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-40 max-w-screen-2xl items-center justify-center py-4">
        <div className="flex flex-col items-center">
          <Image
            src="/favicon.ico"
            alt="HB favicon"
            width={90}   // increase width
            height={90}  // increase height
            className="h-20 w-20 md:h-30 md:w-30 rounded-full shadow-sm"
            priority
          />
          <span className="mt-3 text-xl font-bold text-primary md:text-2xl">
            HB Jewelry Dashboard
          </span>
        </div>
      </div>
    </header>
  );
}
