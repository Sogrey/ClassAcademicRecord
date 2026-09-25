import type {
  SubjectConfig,
  EvaluationConfig,
  PsychologyConfig,
  HealthEvaluation,
} from '@/types'

/** 学科配置（9科，黄色区域可编辑） */
export const SUBJECTS: SubjectConfig[] = [
  { name: '语文', attr: '主科', fullScore: 150 },
  { name: '数学', attr: '主科', fullScore: 150 },
  { name: '外语', attr: '主科', fullScore: 150 },
  { name: '物理', attr: '副科', fullScore: 100 },
  { name: '化学', attr: '副科', fullScore: 100 },
  { name: '生物', attr: '副科', fullScore: 100 },
  { name: '历史', attr: '副科', fullScore: 100 },
  { name: '地理', attr: '副科', fullScore: 100 },
  { name: '政治', attr: '副科', fullScore: 100 },
]

/** 评价等级（固定4个，个数不可修改，名称和分界线系数可改） */
export const EVALUATIONS: EvaluationConfig[] = [
  { id: '评价等级1', name: '优秀', threshold: 0.9, label: '分界线1' },
  { id: '评价等级2', name: '良好', threshold: 0.7, label: '分界线2' },
  { id: '评价等级3', name: '及格', threshold: 0.6, label: '分界线3' },
  { id: '评价等级4', name: '待补', threshold: null, label: null },
]

/** 心理状态预设（3维度 × 3可选值） */
export const PSYCHOLOGY: PsychologyConfig = {
  emotionTypes: ['乐观积极型', '敏感多虑型', '易怒冲动型'],
  socialTypes: ['外向主动型', '内向内敛型', '社交回避型'],
  learningTypes: ['自主进取型', '被动依赖型', '畏难焦虑型'],
}

/** 健康评价标准（对照《国家学生体质健康标准》） */
export const HEALTH_EVALUATIONS: HealthEvaluation[] = [
  {
    name: '优秀',
    description:
      '对应学段《国家学生体质健康标准》（如身高体重、肺活量、耐力跑等），所有指标达标且部分优',
  },
  {
    name: '良好',
    description:
      '《国家学生体质健康标准》中核心指标达标（如耐力、力量），仅 1 项非核心指标略低于标准',
  },
  {
    name: '合格',
    description:
      '《国家学生体质健康标准》中 1 项核心指标不达标，或 2 项及以上非核心指标不达标',
  },
  {
    name: '待提升',
    description:
      '《国家学生体质健康标准》中 2 项及以上核心指标不达标，或存在影响正常学习的健康问题',
  },
]

/** 基础属性词典 */
export const DICTIONARIES = {
  familyStructure: ['核心家庭', '单亲家庭', '留守儿童', '重组家庭', '祖辈抚养'],
  commPreference: ['微信', '电话', '视频', '面谈'] as const,
  studentStatus: ['在读', '转校', '寄读', '休学'] as const,
  studentType: ['普高生', '艺术生', '体育生'] as const,
  gender: ['男', '女'] as const,
}

/** 民族列表（56个民族） */
export const ETHNICITIES: string[] = [
  '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族',
  '布依族', '朝鲜族', '满族', '侗族', '瑶族', '白族', '哈尼族', '哈萨克族',
  '黎族', '傣族', '畲族', '傈僳族', '仡佬族', '东乡族', '高山族', '拉祜族',
  '水族', '佤族', '纳西族', '羌族', '土族', '仫佬族', '锡伯族', '柯尔克孜族',
  '达斡尔族', '景颇族', '毛南族', '撒拉族', '塔吉克族', '阿昌族', '普米族',
  '鄂温克族', '怒族', '京族', '基诺族', '德昂族', '保安族', '俄罗斯族',
  '裕固族', '乌孜别克族', '门巴族', '鄂伦春族', '独龙族', '塔塔尔族',
  '赫哲族', '珞巴族', '布朗族', '塔塔尔族',
]

/** 根据得分率计算评价等级 */
export function calcEvaluation(
  scoreRate: number,
  evaluations: EvaluationConfig[] = EVALUATIONS,
): string {
  for (const e of evaluations) {
    if (e.threshold !== null && scoreRate >= e.threshold) {
      return e.name
    }
  }
  return '待补'
}

/** 计算得分率 */
export function calcScoreRate(score: number, fullScore: number): number {
  if (fullScore === 0) return 0
  return score / fullScore
}
