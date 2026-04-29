import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 占位入口 — T14 将替换为完整应用（顶栏 + Canvas + 时间控制条）
const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <div>Tripod and Deer · M0 (scaffolding)</div>
  </StrictMode>
)
