'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from './ui/button'
import { User, LogOut, ChevronDown, Settings, Layers } from 'lucide-react'
import { signOut } from '@/actions/auth/auth'
import { ThemeToggle } from './theme-toggle'

interface NavLink {
  label: string
  href: string
}

interface NavbarProps {
  companyName: string
  links: NavLink[]
  profileButtonLabel?: string
  userEmail?: string
  onProfileClick?: () => void
  isLoggedIn?: boolean
}

export default function Navbar({
  companyName,
  links,
  profileButtonLabel = 'Profile',
  userEmail,
  isLoggedIn = false,
}: NavbarProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className=" fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 flex justify-center">
      <nav className="w-full max-w-7xl flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm rounded-full border border-gray-200 dark:border-slate-800">
        {/* Company Name */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="p-1.5 rounded-lg text-blue-600 dark:text-blue-500">
            <Layers className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {companyName}
          </h1>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {/* Profile Dropdown */}
              <div className="flex-shrink-0 relative" ref={menuRef}>
                <Button
                  variant="outline"
                  onClick={() => setOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full px-4"
                >
                  <User size={16} />
                  {profileButtonLabel}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </Button>


                {open && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700 mb-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {profileButtonLabel}
                      </p>
                      {userEmail && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {userEmail}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings size={15} className="text-gray-400" />
                      Settings
                    </Link>
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                    <button
                      onClick={() => {
                        setOpen(false)
                        signOut()
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>

                )}
              </div>
              <ThemeToggle />
            </>
          ) : (
            <div className="flex items-center gap-4 pl-2">
              
              <Link href="/auth/login">
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-sm hidden sm:flex">
                  Log in
                </Button>
              </Link>
              <div className="border-l border-slate-200 dark:border-slate-700 h-6 mx-1"></div>
              <ThemeToggle />
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
