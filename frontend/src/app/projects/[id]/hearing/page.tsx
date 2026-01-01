/**
 * Hearing Input Page (Screen ②)
 * Allows users to input and manage hearing content from business process interviews
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HearingInput, HearingHistory } from '@/components/hearing';
import { hearingApi, flowApi } from '@/lib/api';
import { HearingLogResponse } from '@/types/api';

interface HearingPageProps {
  params: {
    id: string;
  };
}

export default function HearingPage({ params }: HearingPageProps) {
  const projectId = parseInt(params.id);
  const router = useRouter();
  const [hearingLogs, setHearingLogs] = useState<HearingLogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<HearingLogResponse | null>(null);

  // Load hearing logs on component mount
  useEffect(() => {
    const loadHearingLogs = async () => {
      try {
        setIsLoading(true);
        const logs = await hearingApi.getHearingLogs(projectId);
        setHearingLogs(logs);
      } catch (err) {
        console.error('Failed to load hearing logs:', err);
        setError('ヒアリングログの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadHearingLogs();
    }
  }, [projectId]);

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
    setEditingLog(null); // Clear editing state
  };

  const handleHearingLogDeleted = (deletedLogId: number) => {
    setHearingLogs(prev => prev.filter(log => log.id !== deletedLogId));
    // Clear editing state if the deleted log was being edited
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

  const handleGenerateFlow = async () => {
    if (hearingLogs.length === 0) {
      setError('フロー図を生成する前に、ヒアリング内容を追加してください');
      return;
    }

    try {
      setIsGenerating(true);
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
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ヒアリング入力
          </h1>
          <p className="text-gray-600">
            ビジネスプロセスのインタビューから情報を収集します。正確性を気にせず、
            重要なポイントを記録してください。AIが後で整理をお手伝いします。
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <HearingInput 
              projectId={projectId}
              onHearingLogAdded={handleHearingLogAdded}
              onHearingLogUpdated={handleHearingLogUpdated}
              editingLog={editingLog}
              onCancelEdit={handleCancelEdit}
            />
            
            <div className="flex justify-end">
              <button
                onClick={handleGenerateFlow}
                disabled={isGenerating || hearingLogs.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    フロー生成中...
                  </span>
                ) : (
                  'フロー図を生成'
                )}
              </button>
            </div>
          </div>

          {/* History Section */}
          <div>
            <HearingHistory 
              hearingLogs={hearingLogs}
              isLoading={isLoading}
              onHearingLogDeleted={handleHearingLogDeleted}
              onHearingLogEdit={handleHearingLogEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}