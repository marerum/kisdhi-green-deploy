/**
 * Individual project card component with hover states and navigation
 */

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ProjectResponse } from '@/types/api';
import { api } from '@/lib/api';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useToast } from '@/providers/ToastProvider';

interface ProjectCardProps {
  project: ProjectResponse;
  onUpdate: (updatedProject: ProjectResponse) => void;
  onDelete: (projectId: number) => void;
}

export default function ProjectCard({ project, onUpdate, onDelete }: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSuccess, showError } = useToast();

  // Auto-save functionality for project name changes
  const { save: saveProjectName, isLoading: isSaving } = useAutoSave({
    saveFunction: async (name: string) => {
      if (name.trim() === project.name || !name.trim()) {
        return;
      }
      const updatedProject = await api.projects.updateProject(project.id, {
        name: name.trim(),
      });
      onUpdate(updatedProject);
    },
    delay: 800, // 800ms delay for name changes
    onSuccess: () => {
      showSuccess('プロジェクト名を更新しました', 2000);
    },
    onError: (error) => {
      showError('プロジェクト名の更新に失敗しました');
      setEditName(project.name); // Reset to original name on error
    },
  });

  // Update local state when project prop changes
  useEffect(() => {
    setEditName(project.name);
  }, [project.name]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'たった今';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
    
    return date.toLocaleDateString('ja-JP');
  };

  const handleNameChange = (newName: string) => {
    setEditName(newName);
    saveProjectName(newName);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(project.name);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このプロジェクトを削除してもよろしいですか？この操作は元に戻せません。')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.projects.deleteProject(project.id);
      onDelete(project.id);
      showSuccess('プロジェクトを削除しました');
    } catch (error) {
      console.error('Failed to delete project:', error);
      showError('プロジェクトの削除に失敗しました');
      setIsDeleting(false);
    }
  };

  const isLoading = isSaving || isDeleting;

  return (
    <div className="card card-hover relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <div className="flex items-center space-x-2">
            <div className="spinner w-5 h-5" />
            <span className="text-sm text-gray-600">
              {isSaving ? '保存中...' : '削除中...'}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyPress}
            className="form-input text-lg font-semibold text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full"
            autoFocus
            disabled={isLoading}
          />
        ) : (
          <h3
            className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors flex-1"
            onClick={() => setIsEditing(true)}
            title="クリックしてプロジェクト名を編集"
          >
            {project.name}
          </h3>
        )}
        
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize ml-2">
          {project.status}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">
        更新日時: {formatRelativeTime(project.updated_at)}
      </p>
      
      <div className="flex justify-between items-center">
        <Link
          href={`/projects/${project.id}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          続行 →
        </Link>
        
        <button
          onClick={handleDelete}
          className="text-gray-500 hover:text-red-600 text-sm font-medium transition-colors"
          disabled={isLoading}
        >
          削除
        </button>
      </div>
    </div>
  );
}