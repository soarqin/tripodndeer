import type { TutorialStepEntry } from '~/shared/types'

export const TUTORIAL_STEPS: readonly TutorialStepEntry[] = [
  {
    id: 'panel-tour',
    titleZH: '先观势力面板',
    descriptionZH: '打开势力、军队、外交三个面板，了解界面布局。',
    completionPredicateId: 'panel-tour',
    orderIndex: 1,
  },
  {
    id: 'diplomacy-ju',
    titleZH: '外交接触苴侯',
    descriptionZH: '在外交面板查看苴国（realm_ju_tutorial），了解外交关系。',
    completionPredicateId: 'diplomacy-ju',
    orderIndex: 2,
  },
  {
    id: 'declare-march',
    titleZH: '宣战并进军蜀境',
    descriptionZH: '对蜀国宣战，并派遣军队进入葭萌或蜀境。',
    completionPredicateId: 'declare-march',
    orderIndex: 3,
  },
  {
    id: 'siege-capture',
    titleZH: '攻取葭萌或成都',
    descriptionZH: '占领葭萌或成都任一城邑。',
    completionPredicateId: 'siege-capture',
    orderIndex: 4,
  },
  {
    id: 'peace-annex',
    titleZH: '议和并吞并蜀国',
    descriptionZH: '与蜀议和，接受全部邑，完成灭蜀。',
    completionPredicateId: 'peace-annex',
    orderIndex: 5,
  },
] as const
