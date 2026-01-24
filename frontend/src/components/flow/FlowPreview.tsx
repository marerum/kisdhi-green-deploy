/**
 * FlowPreview Component
 * Simple preview display for real-time generated flow
 * 2026/01/20更新: Claude APIのレスポンス形式に対応
 */

'use client';

import React from 'react';

interface FlowNode {
  id: string;
  type: string;
  label: string;
  actor?: string;
  position?: { x: number; y: number };
}

interface FlowStep {
  stepNumber: number;
  description: string;
  actor?: string;
  details?: string;
  name?: string; // Claude APIからの形式
}

// 2026/01/20追加: Claude APIからのアクター形式
interface Actor {
  name: string;
  role: string;
}

interface FlowPreviewProps {
  flow: {
    nodes?: FlowNode[];
    actors?: (string | Actor)[]; // 文字列配列またはActorオブジェクト配列
    steps?: FlowStep[];
    flow_nodes?: any[]; // Claude APIからのフローノード
  } | null;
  className?: string;
}

export function FlowPreview({ flow, className = '' }: FlowPreviewProps) {
  if (!flow) {
    return (
      <div className={`bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center ${className}`}>
        <div className="text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">フローはまだ生成されていません</p>
          <p className="text-xs mt-2">音声入力後「フローを生成」ボタンを押してください</p>
        </div>
      </div>
    );
  }

  const steps = flow.steps || [];
  const nodes = flow.nodes || [];
  const flowNodes = flow.flow_nodes || []; // 2026/01/20追加: Claude APIからのフローノード
  const actors = flow.actors || [];
  
  // 2026/01/20追加: アクターを文字列配列に正規化
  const normalizedActors = actors.map(actor => {
    if (typeof actor === 'string') {
      return actor;
    } else if (actor && typeof actor === 'object' && 'name' in actor) {
      // Claude APIからの {name, role} 形式
      return `${actor.name}（${actor.role}）`;
    }
    return String(actor);
  });
  
  if (steps.length === 0 && nodes.length === 0 && normalizedActors.length === 0 && flowNodes.length === 0) {
    return (
      <div className={`bg-blue-50 rounded-lg border border-blue-200 p-6 ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-blue-800">フロー生成が完了しました</p>
            <p className="text-xs text-blue-700 mt-1">現在の実装ではダミーデータを返しています。実際のフロー生成機能は今後実装されます。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          生成されたフロー
        </h3>
      </div>

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {normalizedActors.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">アクター</h4>
            <div className="flex flex-wrap gap-2">
              {normalizedActors.map((actor, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-medium rounded-full"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  {actor}
                </div>
              ))}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">フローステップ</h4>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.stepNumber || index}
                  className="relative"
                >
                  <div className="flex items-start group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                      {step.stepNumber}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 group-hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{step.description}</p>
                            {step.actor && (
                              <p className="text-xs text-gray-500 mt-1">
                                担当: <span className="text-purple-600 font-medium">{step.actor}</span>
                              </p>
                            )}
                            {step.details && step.details !== step.description && (
                              <p className="text-xs text-gray-600 mt-1">{step.details}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-300"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {nodes.length > 0 && steps.length === 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">フローステップ</h4>
            <div className="space-y-2">
              {nodes.map((node, index) => (
                <div
                  key={node.id || index}
                  className="relative"
                >
                  <div className="flex items-start group">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 group-hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{node.label}</p>
                            {node.actor && (
                              <p className="text-xs text-gray-500 mt-1">
                                担当: <span className="text-purple-600 font-medium">{node.actor}</span>
                              </p>
                            )}
                          </div>
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {node.type === 'start' ? '開始' : node.type === 'end' ? '終了' : 'プロセス'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < nodes.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-300"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={() => {
            alert('完全なフローエディタへの遷移機能は今後実装されます');
          }}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          フローエディタで開く →
        </button>
      </div>
    </div>
  );
}
