/**
 * Breadcrumb component for navigation context
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';


interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb() {
  const pathname = usePathname();
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0 || segments[0] === 'projects') {
      if (segments.length === 1) {
        return [{ label: 'プロジェクト' }];
      }
      
      const projectId = segments[1];
      const breadcrumbs: BreadcrumbItem[] = [
        { label: 'プロジェクト', href: '/projects' },
        { label: `プロジェクト ${projectId}`, href: `/projects/${projectId}` },
      ];
      
      if (segments[2] === 'hearing') {
        breadcrumbs.push({ label: 'ヒアリング入力' });
      } else if (segments[2] === 'flow') {
        breadcrumbs.push({ label: 'フロー図' });
      }
      
      return breadcrumbs;
    }
    
    return [{ label: 'ホーム' }];
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="text-gray-400 mx-2">›</span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}