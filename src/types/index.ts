// ========== 基础枚举 ==========

export type Gender = '男' | '女'

export type StudentType = '普高生' | '艺术生' | '体育生'

export type SubjectAttr = '主科' | '副科'

export type EvaluationLevel = '优秀' | '良好' | '及格' | '待补'

export type StudentStatus = '在读' | '转校' | '寄读' | '休学'

export type RecordType = '正向' | '负向' | '请假'

export type CommPreference = '微信' | '电话' | '视频' | '面谈'

// ========== 配置类型 ==========

export interface SubjectConfig {
  /** 学科名称 */
  name: string
  /** 属性 */
  attr: SubjectAttr
  /** 满分 */
  fullScore: number
}

export interface EvaluationConfig {
  /** 等级编号 */
  id: string
  /** 等级名称 */
  name: EvaluationLevel
  /** 分界线系数 */
  threshold: number | null
  /** 分界线标识 */
  label: string | null
}

export interface PsychologyConfig {
  /** 情绪调节能力 */
  emotionTypes: string[]
  /** 社交互动模式 */
  socialTypes: string[]
  /** 学习心理倾向 */
  learningTypes: string[]
}

export interface HealthEvaluation {
  /** 评价名称 */
  name: string
  /** 说明 */
  description: string
}

// ========== 学生档案 ==========

export interface Guardian {
  /** 家长姓名 */
  name: string
  /** 关系 */
  relationship: string
  /** 职业 */
  occupation: string
  /** 联系电话 */
  phone: string
  /** 沟通偏好 */
  preference: CommPreference
}

export interface BehaviorRecord {
  /** 记录ID */
  id: number
  /** 记录类型 */
  type: RecordType
  /** 日期 */
  date: string
  /** 内容/事由 */
  content: string
}

export interface Student {
  /** 学生ID */
  id: number
  /** 学号 */
  studentNo: number
  // --- 基本信息 ---
  /** 姓名 */
  name: string
  /** 性别 */
  gender: Gender
  /** 民族 */
  ethnicity: string
  /** 出生年月 */
  birthDate: string
  /** 联系电话 */
  phone: string
  /** 身份证号 */
  idCard: string
  /** 头像URL */
  avatar: string
  // --- 学籍信息 ---
  /** 入学时间 */
  enrollmentDate: string
  /** 入学成绩 */
  entranceScore: number
  /** 学籍状态 */
  status: StudentStatus
  /** 毕业学校 */
  graduatedSchool: string
  /** 学生类型 */
  type: StudentType
  // --- 家庭信息 ---
  /** 家庭结构 */
  familyStructure: string
  /** 居住地址 */
  address: string
  /** 家长信息 */
  guardians: Guardian[]
  // --- 身体与心理 ---
  /** 身高 */
  height: number
  /** 体重 */
  weight: number
  /** 身体评价 */
  healthEvaluation: string
  /** 疾病史 */
  diseaseHistory: string
  /** 情绪调节能力 */
  emotionType: string
  /** 社交互动模式 */
  socialType: string
  /** 学习心理倾向 */
  learningPsychology: string
  // --- 发展信息 ---
  /** 特长 */
  specialty: string
  /** 爱好 */
  hobby: string
  /** 梦想 */
  dream: string
  /** 短期目标 */
  shortTermGoal: string
  /** 中期目标 */
  midTermGoal: string
  /** 长期目标 */
  longTermGoal: string
  // --- 社交信息 ---
  /** 良好关系名单 */
  goodRelations: string[]
  /** 矛盾关系名单 */
  conflictRelations: string[]
  // --- 行为记录 ---
  /** 行为记录列表 */
  records: BehaviorRecord[]
}

// ========== 成绩数据 ==========

export interface Exam {
  /** 考试ID */
  id: number
  /** 考试名称 */
  name: string
}

export interface ScoreRecord {
  /** 记录ID */
  id: number
  /** 考试ID */
  examId: number
  /** 考试名称 */
  examName: string
  /** 学生ID */
  studentId: number
  /** 学生姓名 */
  studentName: string
  /** 性别 */
  gender: Gender
  /** 学生类型 */
  studentType: StudentType
  /** 科目 */
  subject: string
  /** 科目属性 */
  subjectAttr: SubjectAttr
  /** 满分 */
  fullScore: number
  /** 得分 */
  score: number
  /** 评价等级 */
  evaluation: EvaluationLevel
  /** 年级均分 */
  gradeAvg: number
  /** 班级均分 */
  classAvg: number
}

// ========== 座位 ==========

export interface SeatAssignment {
  /** 学生ID */
  studentId: number
  /** 学生姓名 */
  studentName: string
  /** 排号 (1-8) */
  row: number
  /** 列号 (1-8) */
  col: number
  /** 组号 (每排4组，每组2人) */
  group: number
}

// ========== 卫生值日 ==========

export interface CleaningAssignment {
  /** 组号 (1-5) */
  groupNumber: number
  /** 任务编号 */
  taskNumber: number
  /** 任务名称 */
  taskName: string
  /** 学生ID */
  studentId: number
  /** 学生姓名 */
  studentName: string
}

// ========== 课程表 ==========

export interface ScheduleItem {
  /** 节次 */
  period: string
  /** 时间段 */
  timeRange: string
  /** 星期几 (1-5) */
  weekday: number
  /** 课程名称 */
  subject: string
  /** 时段类型 */
  timeSlot: '早读' | '上午' | '午休' | '下午' | '晚自习'
}

// ========== 筛选器 ==========

export interface ClassFilter {
  /** 考试 */
  exam: string
  /** 评价 */
  evaluations: EvaluationLevel[]
  /** 性别 */
  genders: Gender[]
  /** 学生类型 */
  studentTypes: StudentType[]
  /** 科目 */
  subjects: string[]
}

// ========== 班委会 ==========

export interface CommitteeRole {
  /** 职务名称 */
  role: string
  /** 学生ID */
  studentId: number | null
  /** 学生姓名 */
  studentName: string | null
}

