/**
 * Create project component with inline name editing
 */

'use client';

import { useState } from 'react';
import { ProjectResponse } from '@/types/api';
import { api } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';

interface CreateProjectProps {
  onProjectCreated: (project: ProjectResponse) => void;
}

export default function CreateProject({ onProjectCreated }: CreateProjectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const newProject = await api.projects.createProject({
        name: projectName.trim(),
      });
      onProjectCreated(newProject);
      setProjectName('');
      setIsCreating(false);
      showSuccess('プロジェクトを作成しました');
    } catch (error) {
      console.error('Failed to create project:', error);
      showError('プロジェクトの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProject();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setProjectName('');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setProjectName('');
  };

  if (isCreating) {
    return (
      <div className="card border-2 border-dashed border-blue-300 bg-blue-50">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="プロジェクト名を入力..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={handleKeyPress}
            className="form-input w-full text-lg font-semibold"
            autoFocus
            disabled={isLoading}
          />
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              onClick={handleCreateProject}
              className="btn btn-primary"
              disabled={isLoading || !projectName.trim()}
            >
              {isLoading ? (
                <>
                  <div className="spinner w-4 h-4 mr-2" />
                  作成中...
                </>
              ) : (
                'プロジェクト作成'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsCreating(true)}
      className="card border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center group"
    >
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-12 h-12 bg-gray-200 group-hover:bg-blue-200 rounded-full flex items-center justify-center mb-4 transition-colors">
          <svg
            className="w-6 h-6 text-gray-500 group-hover:text-blue-600 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
          新しいビジネスプロセスを追加
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          ビジネスプロセスを分析する新しいプロジェクトを開始
        </p>
      </div>
    </button>
  );
}