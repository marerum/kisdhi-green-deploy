/**
 * Project list component with card-based layout
 */

'use client';

import { useState, useEffect } from 'react';
import { ProjectResponse } from '@/types/api';
import { api } from '@/lib/api';
import ProjectCard from './ProjectCard';
import CreateProject from './CreateProject';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const projectsData = await api.projects.getProjects();
        
        if (isMounted && !abortController.signal.aborted) {
          setProjects(projectsData);
        }
      } catch (error: any) {
        console.error('Failed to load projects:', error);
        if (isMounted && !abortController.signal.aborted && error?.code !== 'CANCELLED') {
          setError('プロジェクトの読み込みに失敗しました。再度お試しください。');
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    loadProjects();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);
  
  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const projectsData = await api.projects.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError('プロジェクトの読み込みに失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (newProject: ProjectResponse) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleProjectUpdated = (updatedProject: ProjectResponse) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  };

  const handleProjectDeleted = (projectId: number) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">プロジェクトを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">{error}</p>
          </div>
          <button
            onClick={loadProjects}
            className="btn btn-primary"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ビジネスプロセス プロジェクト
          </h1>
          <p className="text-gray-600">
            ヒアリング内容を整理し、構造化されたビジネスフロー図を作成します
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create new project card */}
        <CreateProject onProjectCreated={handleProjectCreated} />
        
        {/* Existing project cards */}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onUpdate={handleProjectUpdated}
            onDelete={handleProjectDeleted}
          />
        ))}
      </div>
      
      {projects.length === 0 && (
        <div className="text-center py-12 col-span-full">
          <div className="text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">プロジェクトがありません</h3>
            <p className="text-gray-600 mb-4">
              最初のビジネスプロセス プロジェクトを作成して開始しましょう
            </p>
          </div>
        </div>
      )}
    </div>
  );
}