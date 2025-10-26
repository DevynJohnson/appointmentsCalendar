import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Navigation Links */}
          <div className="flex gap-6 flex-wrap items-center justify-center text-sm text-gray-600">
            <Link
              className="hover:text-gray-900 hover:underline hover:underline-offset-4 transition-colors"
              href="/about"
            >
              About
            </Link>
            <Link
              className="hover:text-gray-900 hover:underline hover:underline-offset-4 transition-colors"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            <Link
              className="hover:text-gray-900 hover:underline hover:underline-offset-4 transition-colors"
              href="/terms"
            >
              Terms of Service
            </Link>
            <Link
              className="hover:text-gray-900 hover:underline hover:underline-offset-4 transition-colors"
              href="/provider/login"
            >
              Provider Login
            </Link>
            <Link
              className="hover:text-gray-900 hover:underline hover:underline-offset-4 transition-colors"
              href="/client/search"
            >
              Find Providers
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-gray-500">
            <p>© {currentYear} Devyn Johnson Digital Solutions, LLC. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}