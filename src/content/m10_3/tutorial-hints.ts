import type { TutorialHintEntry } from '~/shared'

export const TUTORIAL_HINTS: readonly TutorialHintEntry[] = [
  {
    stepId: 'panel-tour',
    titleZH: '先看军政外交',
    bodyZH: '左侧势力面板显示人口、粮食与政令；左下角军队面板管理兵力；右侧外交面板查看各国关系。',
  },
  {
    stepId: 'diplomacy-ju',
    titleZH: '外交先于刀兵',
    bodyZH: '苴国请秦出兵援助，是入蜀的外交契机。先在外交面板查看苴的详情，再决定是否结盟。',
    codexEntryId: 'history-zongheng',
  },
  {
    stepId: 'declare-march',
    titleZH: '宣战并行军',
    bodyZH: '对蜀宣战后，派出一支军队向葭萌推进。葭萌位于秦蜀边界，是入蜀的前线要地。',
    codexEntryId: 'mechanic-armies',
  },
  {
    stepId: 'siege-capture',
    titleZH: '攻城为下',
    bodyZH: '围攻城邑需要足够兵力与时间。葭萌或成都任一落入秦手，即可视为突破口。',
    codexEntryId: 'mechanic-sieges',
  },
  {
    stepId: 'peace-annex',
    titleZH: '灭国与吞并',
    bodyZH: '与蜀议和后，接受其全部城邑，蜀国从此不复存在。此教学即宣告完成。',
    codexEntryId: 'mechanic-diplomacy',
  },
] as const
