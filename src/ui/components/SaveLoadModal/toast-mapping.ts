import type { SaveLoadError } from '@/shared/types/save-dto'

export function toastMessageForError(error: SaveLoadError): string {
  switch (error.kind) {
    case 'incompatible_version':
      return `存档版本不兼容 (需要 v${error.expected}, 实际 v${error.got})`
    case 'parse_error':
      if (error.message === 'invalid JSON') return '导入失败：invalid JSON'
      if (error.message === 'missing scenarioVersion' || error.message === 'invalid structure') {
        return '存档结构异常'
      }
      return `导入失败：${error.message}`
    case 'corrupted':
      return '存档已损坏，已隔离'
    case 'missing_data':
      return '存档不存在'
    case 'quota_exceeded':
      return '存储空间已满'
    case 'newer_version':
      return `存档版本过新 (需要 v${error.expected}, 实际 v${error.got})`
  }
}
