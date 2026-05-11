// CONTRACT: 6 of 10 codexEntryIds reference existing M10.1 entries; 4 NEW entries created by T1.2.5
// See .sisyphus/plans/m10-2.md § Locked Decisions for architectural contract.
import type { HintEntry } from '@/ui/components/HintModal/hint-types'

export const HINTS: readonly HintEntry[] = [
  {
    id: 'hint_academy',
    title: '学宫',
    body: '稷下学宫与西河学派是战国时期最重要的学术中心，汇聚百家学者。\n\n学宫每隔数旬产出一位人才，可供势力招募。文化辐射还能提升周边地区的意识形态影响力。',
    codexEntryId: 'history-jixia-academy',
  },
  {
    id: 'hint_alliance',
    title: '合纵连横',
    body: '合纵是弱国联合抗强的外交策略，连横是强国分化弱国的手段。\n\n通过外交面板可向其他势力提出结盟或连横提案。联盟关系影响战争宣告与情报共享。',
    codexEntryId: 'history-zongheng',
  },
  {
    id: 'hint_disaster',
    title: '天灾救济',
    body: '旱涝蝗疫等天灾会随机降临，影响粮食产出与民心。\n\n灾害发生时将弹出救济决策窗口，选择赈灾方式将影响民心与财政。及时救济可减少人口流失。',
    codexEntryId: 'mechanic-disaster',
  },
  {
    id: 'hint_espionage',
    title: '谍报',
    body: '间者可执行侦察、散播流言、制造不和、反谍四类行动，提升对目标势力的情报覆盖度。\n\n情报覆盖度分三档（30/60/90），决定敌方军队的可见性。覆盖度越高，战场信息越完整。',
    codexEntryId: 'mechanic-espionage',
  },
  {
    id: 'hint_pass',
    title: '关隘',
    body: '函谷关、武关等战略要道控制着势力间的军事通道。\n\n军队通过关隘时消耗额外行动力，守方享有地形加成。控制关隘是防御纵深的关键。',
    codexEntryId: 'mechanic-passes',
  },
  {
    id: 'hint_peace',
    title: '议和',
    body: '战争期间可通过议和面板向交战方提出停战提案，或接受对方的议和请求。\n\n议和条件包括割地、赔款或释放俘虏。双方接受后战争结束，进入和平期。',
    codexEntryId: 'mechanic-diplomacy',
  },
  {
    id: 'hint_recruitment',
    title: '召募人才',
    body: '人才面板展示可招募的将领与谋士，涵盖统帅、武将、谋士等 9 类专长。\n\n招募需消耗金钱，人才忠诚度影响其效能。学宫产出的人才可直接加入人才池。',
    codexEntryId: 'mechanic-recruitment',
  },
  {
    id: 'hint_reform',
    title: '变法',
    body: '变法是通过多阶段决策改变势力特质的机制，需要特定人才推动。\n\n每个变法阶段提供若干选择，决策影响最终获得的特质加成。变法完成后，势力获得永久性 buff。',
    codexEntryId: 'mechanic-reforms',
  },
  {
    id: 'hint_succession',
    title: '继承危机',
    body: '君主薨逝时将触发继承流程，可选择嫡长继承、择贤继承或兄终弟及。\n\n继承人选择不当可能引发势力分裂。合法性低的继承人会面临更大的内部压力。',
    codexEntryId: 'mechanic-succession',
  },
  {
    id: 'hint_war_received',
    title: '受到宣战',
    body: '其他势力以战争借口（casus belli）向己方宣战时，将显示宣战通知。\n\n战争目标决定胜利条件，可通过议和提前结束战争。军队调度与关隘防守是应对入侵的关键。',
    codexEntryId: 'mechanic-armies',
  },
]
