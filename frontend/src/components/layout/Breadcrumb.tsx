/**
 * Breadcrumb component for navigation context
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ProjectResponse } from '@/types/api';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Extract project ID from pathname
  const getProjectId = (): number | null => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] === 'projects' && segments[1]) {
      const id = parseInt(segments[1], 10);
      return isNaN(id) ? null : id;
    }
    return null;
  };

  // Fetch project name when project ID changes
  useEffect(() => {
    const projectId = getProjectId();
    
    // If project ID changed or we don't have a project name for this ID
    if (projectId && projectId !== currentProjectId) {
      setIsLoading(true);
      setCurrentProjectId(projectId);
      setProjectName(null); // Reset project name when switching projects
      
      // Use a flag to prevent setting state if component unmounts or project changes
      let isCurrent = true;
      
      api.projects.getProject(projectId)
        .then((project: ProjectResponse) => {
          if (isCurrent) {
            setProjectName(project.name);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch project:', error);
          if (isCurrent) {
            // Fallback to project ID if name fetch fails
            setProjectName(`プロジェクト ${projectId}`);
          }
        })
        .finally(() => {
          if (isCurrent) {
            setIsLoading(false);
          }
        });
      
      // Cleanup function to prevent state updates if project changes
      return () => {
        isCurrent = false;
      };
    } else if (!projectId) {
      // Reset state when not on a project page
      setCurrentProjectId(null);
      setProjectName(null);
      setIsLoading(false);
    }
  }, [pathname]); // Simplified dependency array - only depend on pathname
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return [];
    }
    
    if (segments[0] === 'projects') {
      if (segments.length === 1) {
        return [{ label: 'プロジェクト' }];
      }
      
      const projectId = segments[1];
      if (!projectId || isNaN(parseInt(projectId, 10))) {
        return [{ label: 'プロジェクト' }];
      }
      
      // Use project name if available, otherwise show loading or fallback
      let projectLabel: string;
      if (isLoading) {
        projectLabel = `プロジェクト ${projectId}`;
      } else {
        projectLabel = projectName || `プロジェクト ${projectId}`;
      }
      
      const breadcrumbs: BreadcrumbItem[] = [
        { label: 'プロジェクト', href: '/projects' },
        { label: projectLabel, href: `/projects/${projectId}` },
      ];
      
      if (segments[2] === 'hearing') {
        breadcrumbs.push({ label: 'ヒアリング入力' });
      } else if (segments[2] === 'flow') {
        breadcrumbs.push({ label: 'フロー図' });
      }
      
      return breadcrumbs;
    }
    
    return [];
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length === 0) {
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
                  {isLoading && index === 1 && (
                    <span className="ml-1 text-xs text-gray-500">読み込み中...</span>
                  )}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">
                  {item.label}
                  {isLoading && index === 1 && (
                    <span className="ml-1 text-xs text-gray-500">読み込み中...</span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}