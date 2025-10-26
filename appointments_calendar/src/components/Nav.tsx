'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';

interface NavProps {
  type?: 'provider' | 'customer' | 'public';
}

interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
}

export default function Nav({ type = 'public' }: NavProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Only providers have authentication tokens
        // Clients use magic links and don't need persistent auth
        if (type !== 'provider') {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem('providerToken');
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Verify provider auth token
        const response = await fetch('/api/provider/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.provider);
        } else {
          localStorage.removeItem('providerToken');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes (logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'providerToken' && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [type, pathname]);

  const handleLogout = async () => {
    try {
      // Only providers have logout functionality
      // Clients use magic links and don't need to logout
      if (type === 'provider') {
        localStorage.removeItem('providerToken');
        setUser(null);
        router.push('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path);

  // Provider Navigation Items
  const providerNavItems = [
    { href: '/provider/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/provider/calendar/connect', label: 'Calendars', icon: '📅' },
    { href: '/provider/location', label: 'Locations', icon: '📍' },
    { href: '/provider/bookings', label: 'Bookings', icon: '📝' },
    { href: '/provider/settings', label: 'Settings', icon: '⚙️' },
  ];

  // Customer Navigation Items
  const customerNavItems = [
    { href: '/client/booking', label: 'Book Appointment', icon: '📅' },
    { href: '/my-bookings', label: 'My Bookings', icon: '📝' },
    { href: '/locations', label: 'Locations', icon: '📍' },
  ];

  // Public Navigation Items
  const publicNavItems = [
    { href: '/', label: 'Home', icon: '' },
    { href: '/client/booking', label: 'Book Appointment', icon: '📅' },
    { href: '/about', label: 'About', icon: 'ℹ️' },
  ];

  const getNavItems = () => {
    switch (type) {
      case 'provider':
        return providerNavItems;
      case 'customer':
        return customerNavItems;
      default:
        return publicNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-36">
          {/* Logo/Brand */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={type === 'provider' ? '/provider/dashboard' : '/'} className="flex items-center">
                <Image 
                  src="/ZoneMeet_Logo.png" 
                  alt="Zone Meet Logo" 
                  width={250} 
                  height={250} 
                  className="hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-3 rounded-md text-lg font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {/* User Menu */}
            <div className="flex items-center space-x-4 ml-6 border-l border-gray-200 pl-6">
              {isLoading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {user.name || user.email}
                    </div>
                    {user.company && (
                      <div className="text-gray-500">{user.company}</div>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-100 text-red-700 px-4 py-3 rounded-md text-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  {type === 'provider' ? (
                    <>
                      <Link
                        href="/provider/login"
                        className="text-gray-700 hover:text-gray-900 px-4 py-3 rounded-md text-lg font-medium"
                      >
                        Login
                      </Link>
                      <Link
                        href="/provider/register"
                        className="bg-blue-600 text-white px-4 py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Register
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/provider/login"
                      className="text-gray-700 hover:text-gray-900 px-4 py-3 rounded-md text-lg font-medium"
                    >
                      Provider Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-3 pt-3 pb-4 space-y-2 sm:px-4 bg-gray-50 border-t border-gray-200">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-md text-lg font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {/* Mobile User Menu */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              {user ? (
                <div className="px-3 py-2">
                  <div className="text-base font-medium text-gray-900">
                    {user.name || user.email}
                  </div>
                  {user.company && (
                    <div className="text-sm text-gray-500">{user.company}</div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full bg-red-100 text-red-700 px-4 py-3 rounded-md text-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-3">
                  {type === 'provider' ? (
                    <>
                      <Link
                        href="/provider/login"
                        className="block w-full text-center bg-gray-100 text-gray-700 px-4 py-3 rounded-md text-lg font-medium hover:bg-gray-200 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        href="/provider/register"
                        className="block w-full text-center bg-blue-600 text-white px-4 py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Register
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/provider/login"
                      className="block w-full text-center bg-gray-100 text-gray-700 px-4 py-3 rounded-md text-lg font-medium hover:bg-gray-200 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Provider Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
