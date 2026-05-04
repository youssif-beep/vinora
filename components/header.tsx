"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border/60">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group/logo">
          <span className="size-6 rounded-md bg-foreground text-background grid place-items-center text-[12px] font-semibold serif">H</span>
          <span className="serif text-[17px] tracking-tight">Heute<span className="text-amber">.</span></span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/" active={pathname === "/"}>Heute</NavLink>
          <NavLink href="/history" active={pathname?.startsWith("/history") || pathname?.startsWith("/entry")}>Verlauf</NavLink>
          <NavLink href="/insights" active={pathname?.startsWith("/insights")}>Reflexion</NavLink>
        </nav>
      </div>
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-3 h-8 inline-flex items-center rounded-full transition",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  )
}
