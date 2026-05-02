import React from 'react'
import type { ReformDefinition, ReformState } from '~/shared/types'

interface Props {
  reform: ReformDefinition
  state: ReformState
  onChoose: (choiceId: string) => void
}

export function ReformProgressView({ reform, state, onChoose }: Props) {
  const currentStageIndex = reform.stages.findIndex(s => s.id === state.currentStageId)
  const currentStage = reform.stages[currentStageIndex]
  
  return (
    <div data-testid="reform-progress-modal" className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{reform.displayNameZh}</h2>
        <p className="text-sm text-gray-500">
          第 {currentStageIndex + 1} / {reform.stages.length} 阶段
        </p>
      </div>
      
      <div data-testid="reform-stage-text" className="p-4 bg-gray-50 rounded-md text-gray-800">
        {currentStage?.textZh}
      </div>
      
      {state.choiceHistory.length > 0 && (
        <div className="text-sm text-gray-600">
          <h3 className="font-semibold mb-2">历史抉择</h3>
          <div data-testid="reform-history-list" className="flex flex-col gap-1">
            {state.choiceHistory.map((h, i) => {
              const stage = reform.stages.find(s => s.id === h.stageId)
              const choice = stage?.choices.find(c => c.id === h.choiceId)
              return (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-400">[{stage?.id ?? h.stageId}]</span>
                  <span>{choice?.labelZh ?? h.choiceId}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-2 mt-4">
        {currentStage?.choices.map(choice => (
          <button
            key={choice.id}
            data-testid={`reform-choice-${choice.id}`}
            onClick={() => onChoose(choice.id)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-left transition-colors"
          >
            {choice.labelZh}
          </button>
        ))}
      </div>
    </div>
  )
}
