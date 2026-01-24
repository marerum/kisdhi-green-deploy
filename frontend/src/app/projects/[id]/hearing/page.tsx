/**
 * Hearing Input Page (Screen ②)
 * Allows users to input and manage hearing content from business process interviews
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HearingInput, HearingHistory } from '@/components/hearing';
import { FlowPreview } from '@/components/flow/FlowPreview';
import FlowEditor from '@/components/FlowEditor';
import ComponentPalette from '@/components/flow/ComponentPalette';
import { hearingApi, api } from '@/lib/api';
import { HearingLogResponse } from '@/types/api';
import { FlowData } from '@/utils/flowConverter';

interface HearingPageProps {
  params: {
    id: string;
  };
}

export default function HearingPage({ params }: HearingPageProps) {
  const projectId = parseInt(params.id);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [hearingLogs, setHearingLogs] = useState<HearingLogResponse[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<HearingLogResponse | null>(null);
  const [currentFlow, setCurrentFlow] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [isHearingCollapsed, setIsHearingCollapsed] = useState(false);
  const [isComponentCollapsed, setIsComponentCollapsed] = useState(false);

  // Authentication guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load hearing logs and saved flow on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        // Load hearing logs
        const logs = await hearingApi.getHearingLogs(projectId);
        setHearingLogs(logs);
        
        // Load saved flow if exists
        try {
          const completeFlow = await api.flow.getCompleteFlow(projectId);
          
          if (completeFlow.flow_nodes && completeFlow.flow_nodes.length > 0) {
            // Convert to FlowData format
            const flowData: FlowData = {
              actors: [], // Will be populated from flow_nodes
              steps: [],
              flow_nodes: completeFlow.flow_nodes.map(node => ({
                text: node.text,
                order: node.order,
                actor: node.actor || '',
                step: node.step || '',
                position_x: node.position_x,
                position_y: node.position_y,
              })),
              edges: completeFlow.edges || []
            };
            
            // Extract unique actors from flow nodes
            const actorSet = new Set<string>();
            completeFlow.flow_nodes.forEach(node => {
              if (node.actor) actorSet.add(node.actor);
            });
            flowData.actors = Array.from(actorSet).map(name => ({ name, role: '' }));
            
            setCurrentFlow(flowData);
          }
        } catch (flowErr) {
          console.log('No saved flow found or error loading:', flowErr);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('データの読み込みに失敗しました');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (projectId && isAuthenticated) {
      loadData();
    }
  }, [projectId, isAuthenticated]);

  // Debug: Track hearing logs changes
  useEffect(() => {
    console.log('=== Hearing logs state changed ===');
    console.log('New hearing logs count:', hearingLogs.length);
    console.log('Hearing logs:', hearingLogs.map(log => ({ 
      id: log.id, 
      content: log.content.substring(0, 50) + '...',
      created_at: log.created_at 
    })));
  }, [hearingLogs]);

  const handleHearingLogAdded = (newLog: HearingLogResponse) => {
    console.log('=== Parent: handleHearingLogAdded called ===');
    console.log('New log received:', newLog);
    console.log('Current hearing logs count:', hearingLogs.length);
    
    setHearingLogs(prev => {
      console.log('Previous logs:', prev.map(log => ({ id: log.id, content: log.content.substring(0, 50) + '...' })));
      
      // Check if log already exists (for updates)
      const existingIndex = prev.findIndex(log => log.id === newLog.id);
      console.log('Existing log index:', existingIndex);
      
      if (existingIndex >= 0) {
        // Update existing log
        const updated = [...prev];
        updated[existingIndex] = newLog;
        console.log('Updated existing log at index:', existingIndex);
        console.log('New logs after update:', updated.map(log => ({ id: log.id, content: log.content.substring(0, 50) + '...' })));
        return updated;
      } else {
        // Add new log
        const newLogs = [...prev, newLog];
        console.log('Added new log, total count:', newLogs.length);
        console.log('New logs after add:', newLogs.map(log => ({ id: log.id, content: log.content.substring(0, 50) + '...' })));
        return newLogs;
      }
    });
  };

  const handleHearingLogUpdated = (updatedLog: HearingLogResponse) => {
    console.log('=== Parent: handleHearingLogUpdated called ===');
    console.log('Updated log received:', updatedLog);
    console.log('Current hearing logs count:', hearingLogs.length);
    
    setHearingLogs(prev => {
      console.log('Previous logs:', prev.map(log => ({ id: log.id, content: log.content.substring(0, 50) + '...' })));
      
      const updated = [...prev];
      const index = updated.findIndex(log => log.id === updatedLog.id);
      console.log('Found log to update at index:', index);
      
      if (index >= 0) {
        updated[index] = updatedLog;
        console.log('Updated log at index:', index);
        console.log('New logs after update:', updated.map(log => ({ id: log.id, content: log.content.substring(0, 50) + '...' })));
      } else {
        console.log('Warning: Could not find log to update with ID:', updatedLog.id);
      }
      
      return updated;
    });
    setEditingLog(null);
  };

  const handleHearingLogDeleted = (deletedLogId: number) => {
    setHearingLogs(prev => prev.filter(log => log.id !== deletedLogId));
    if (editingLog?.id === deletedLogId) {
      setEditingLog(null);
    }
  };

  const handleHearingLogEdit = (log: HearingLogResponse) => {
    setEditingLog(log);
  };

  const handleCancelEdit = () => {
    setEditingLog(null);
  };

  const handleFlowSave = async (flowData: FlowData) => {
    console.log('=== handleFlowSave called ===');
    console.log('Flow data to save:', flowData);
    try {
      setIsSavingFlow(true);
      
      // ノードを保存
      if (flowData.flow_nodes && flowData.flow_nodes.length > 0) {
        await api.flow.saveFlowNodes(projectId, flowData.flow_nodes);
        console.log('Saved', flowData.flow_nodes.length, 'nodes');
      }
      
      // エッジが存在する場合は保存
      if (flowData.edges && flowData.edges.length > 0) {
        await api.flow.saveFlow(projectId, flowData.edges);
        console.log('Saved', flowData.edges.length, 'edges');
      }
      
      setCurrentFlow(flowData);
      alert('フローを保存しました');
    } catch (err) {
      console.error('Failed to save flow:', err);
      alert('フローの保存に失敗しました');
    } finally {
      setIsSavingFlow(false);
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/projects')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="プロジェクト一覧に戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ヒアリング & フロー編集
              </h1>
              <p className="text-sm text-gray-600">
                音声入力でビジネスプロセスを記録し、フロー図を編集できます
              </p>
            </div>
          </div>
          
          {currentFlow && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowEditor(!showEditor)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showEditor
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {showEditor ? 'プレビュー表示' : 'フロー編集'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Hearing Input (Collapsible) */}
        <div 
          className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out ${
            isHearingCollapsed ? 'w-12' : 'w-80'
          } flex flex-col`}
        >
          {/* Collapse Toggle */}
          <button
            onClick={() => setIsHearingCollapsed(!isHearingCollapsed)}
            className="p-3 hover:bg-gray-200 transition-colors border-b border-gray-200 flex items-center justify-center"
            title={isHearingCollapsed ? 'ヒアリング入力を開く' : 'ヒアリング入力を閉じる'}
          >
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform ${isHearingCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {!isHearingCollapsed && (
              <span className="ml-2 text-sm font-medium text-gray-700">閉じる</span>
            )}
          </button>

          {/* Sidebar Content */}
          {!isHearingCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <HearingInput 
                projectId={projectId}
                onHearingLogAdded={handleHearingLogAdded}
                onHearingLogUpdated={handleHearingLogUpdated}
                onFlowUpdated={setCurrentFlow}
                editingLog={editingLog}
                onCancelEdit={handleCancelEdit}
              />

              <div className="border-t border-gray-300 pt-4">
                <HearingHistory 
                  hearingLogs={hearingLogs}
                  isLoading={isLoadingData}
                  onHearingLogDeleted={handleHearingLogDeleted}
                  onHearingLogEdit={handleHearingLogEdit}
                />
              </div>
            </div>
          )}
        </div>

        {/* Middle Sidebar - Component Palette (Collapsible, only visible in edit mode) */}
        {showEditor && <ComponentPalette />}

        {/* Right Content - Flow Editor/Preview */}
        <div className="flex-1 bg-white overflow-hidden">
          {showEditor ? (
            <div className="h-full p-4">
              <FlowEditor 
                flowData={currentFlow}
                onSave={handleFlowSave}
                readOnly={isSavingFlow}
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-8">
              <FlowPreview flow={currentFlow} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}