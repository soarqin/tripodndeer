import { describe, it, expect } from 'vitest'
import huFuQiShe from '../reforms/hu-fu-qi-she.json'
import chuWuQiLegacy from '../reforms/chu-wu-qi-legacy.json'
import qiJixiaDebate from '../reforms/qi-jixia-debate.json'
import hanShenBuhai from '../reforms/han-shen-buhai-restart.json'

const reforms = [huFuQiShe, chuWuQiLegacy, qiJixiaDebate, hanShenBuhai]
const modernWords = ['就是', '可是', '所以', '比如说', '因为', '但是', '然后', '这样']

describe('Reform text style', () => {
  reforms.forEach(reform => {
    describe(reform.displayNameZh, () => {
      it('has no modern words in stage texts', () => {
        for (const stage of reform.stages) {
          for (const word of modernWords) {
            expect(stage.textZh).not.toContain(word)
          }
        }
      })
      
      it('has no modern words in choice labels', () => {
        for (const stage of reform.stages) {
          for (const choice of stage.choices) {
            for (const word of modernWords) {
              expect(choice.labelZh).not.toContain(word)
            }
          }
        }
      })
    })
  })
})
