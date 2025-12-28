/**
 * Navigation component for consistent header across all pages
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/projects') {
      return pathname === '/projects' || pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/projects" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">
              Business Flow
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex space-x-8">
            <Link
              href="/projects"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/projects')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              プロジェクト
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}