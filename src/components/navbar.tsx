'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from './ui/button'

interface NavLink {
  label: string
  href: string
}

interface NavbarProps {
  companyName: string
  links: NavLink[]
  profileButtonLabel?: string
  onProfileClick?: () => void
}

export default function Navbar({
  companyName,
  links,
  profileButtonLabel = 'Profile',
  onProfileClick,
}: NavbarProps) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md dark:bg-slate-900">
      {/* Company Name */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {companyName}
        </h1>
      </div>

      {/* Center Links */}
      <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-medium transition-colors duration-200"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Profile Button */}
      <div className="flex-shrink-0">
        {onProfileClick ? (
          <Button variant="outline" onClick={onProfileClick}>
            {profileButtonLabel}
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/profile">{profileButtonLabel}</Link>
          </Button>
        )}
      </div>
    </nav>
  )
}
