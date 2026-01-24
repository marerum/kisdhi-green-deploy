/**
 * Project Dashboard Page
 * Main dashboard for individual projects with navigation to hearing and flow sections
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectResponse, HearingLogResponse } from '@/types/api';
import { api, hearingApi, flowApi } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ProjectDashboardProps {
  params: {
    id: string;
  };
}

export default function ProjectDashboard({ params }: ProjectDashboardProps) {
  const projectId = parseInt(params.id);
  const router = useRouter();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [hearingLogs, setHearingLogs] = useState<HearingLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load project details and hearing logs in parallel
        const [projectData, hearingData] = await Promise.all([
          api.projects.getProject(projectId),
          hearingApi.getHearingLogs(projectId).catch(() => []) // Don't fail if no hearing logs
        ]);
        
        setProject(projectData);
        setHearingLogs(hearingData);
      } catch (err) {
        console.error('Failed to load project data:', err);
        setError('プロジェクトデータの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const handleGenerateFlow = async () => {
    if (hearingLogs.length === 0) {
      setError('フロー図を生成する前に、ヒアリング内容を追加してください');
      return;
    }

    try {
      setIsGeneratingFlow(true);
      setError(null);
      const flowResponse = await flowApi.generateFlow(projectId);
      
      // Check if we have valid data
      if (flowResponse && flowResponse.flow_nodes && flowResponse.flow_nodes.length > 0) {
        // Store the complete generated data in sessionStorage to pass to the flow page
        const flowData = {
          components: null, // Will be converted in the flow page
          connections: null, // Will be converted in the flow page
          actors: flowResponse.actors || [],
          steps: flowResponse.steps || [],
          flow_nodes: flowResponse.flow_nodes,
          timestamp: Date.now() // To ensure fresh data
        };
        sessionStorage.setItem(`flow-generated-${projectId}`, JSON.stringify(flowData));
        
        // Navigate to flow page - it will pick up the generated data
        router.push(`/projects/${projectId}/flow`);
      } else {
        setError('フロー図の生成に成功しましたが、データが空でした。再度お試しください。');
      }
    } catch (err) {
      console.error('Failed to generate flow:', err);
      setError('フロー図の生成に失敗しました。再度お試しください。');
    } finally {
      setIsGeneratingFlow(false);
    }
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

  if (error && !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">{error}</p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            プロジェクト一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {project.name}
              </h1>
              <p className="text-gray-600 text-lg">
                {project.department ? `部署: ${project.department}` : 'ビジネスプロセス分析プロジェクト'}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Hearing Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    ヒアリング入力
                  </h3>
                  <p className="text-gray-600 text-sm">
                    ビジネスプロセスの情報を収集
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <span className="font-medium">ヒアリングログ:</span>
                <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {hearingLogs.length}件
                </span>
              </div>
              {hearingLogs.length > 0 && (
                <div className="text-xs text-gray-500">
                  最終更新: {new Date(Math.max(...hearingLogs.map(log => new Date(log.created_at).getTime()))).toLocaleDateString('ja-JP')}
                </div>
              )}
            </div>

            <Link
              href={`/projects/${projectId}/hearing`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ヒアリング入力画面へ
            </Link>
          </div>

          {/* Flow Section - Commented out 2026/01/22: Functionality now available in Hearing Input screen
              Kept for future restoration if needed
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    フロー図編集（詳細）
                  </h3>
                  <p className="text-gray-600 text-sm">
                    コンポーネントベースの高度な編集
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">機能:</span>
                <span className="ml-2 text-xs text-gray-500">
                  独立したフロー編集画面
                </span>
              </div>
              <div className="text-xs text-gray-500">
                ※ 通常のフロー編集はヒアリング入力画面で行えます
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={`/projects/${projectId}/flow`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-full justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                フロー図編集画面へ
              </Link>
              
              {hearingLogs.length > 0 && (
                <button
                  onClick={handleGenerateFlow}
                  disabled={isGeneratingFlow}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingFlow ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      フロー生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      新しいフローを生成
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          */}
        </div>

        {/* Recent Activity */}
        {hearingLogs.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              最近のヒアリングログ
            </h3>
            <div className="space-y-3">
              {hearingLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3 flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {log.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleDateString('ja-JP')} {new Date(log.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {hearingLogs.length > 3 && (
                <div className="text-center pt-2">
                  <Link
                    href={`/projects/${projectId}/hearing`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    すべてのヒアリングログを見る ({hearingLogs.length}件)
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {hearingLogs.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              プロジェクトを開始しましょう
            </h3>
            <p className="text-gray-600 mb-6">
              まずはヒアリング内容を入力して、ビジネスプロセスの情報を収集しましょう
            </p>
            <Link
              href={`/projects/${projectId}/hearing`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ヒアリング入力を開始
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}