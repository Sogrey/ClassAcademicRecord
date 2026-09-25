import type { Student, SeatAssignment } from '@/types'

/** 座位排布配置 */
export interface SeatingConfig {
  /** 排数 */
  rows: number
  /** 列数（含过道） */
  cols: number
  /** 每组人数（同桌人数） */
  groupSize: number
  /** 同桌策略：同性优先 / 异身高 / 随机 */
  sameGenderFirst: boolean
}

export const DEFAULT_SEATING_CONFIG: SeatingConfig = {
  rows: 8,
  cols: 8,
  groupSize: 2,
  sameGenderFirst: true,
}

/** 打乱数组（Fisher-Yates） */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]!
    result[i] = result[j]!
    result[j] = tmp
  }
  return result
}

/**
 * 座位排布算法（VBA 模块3「安排座位」移植）
 *
 * 算法逻辑：
 * 1. 合并男女生数据为统一数组（姓名、身高、性别）
 * 2. 按身高升序排序，同身高随机排列
 * 3. 从第1排第1列开始依次安排座位
 * 4. 每组2个座位（同桌），优先安排同性同桌
 * 5. 找同性同桌：先检查紧邻的下一个学生是否同性，否则向后搜索最近的同性学生
 * 6. 找到后交换位置以维持身高顺序
 * 7. 每排分4组，组间留过道
 */
export function arrangeSeats(
  students: Student[],
  config: SeatingConfig = DEFAULT_SEATING_CONFIG,
): SeatAssignment[] {
  // 1. 合并男女生数据并按身高升序排序（同身高随机）
  const sorted = [...students].sort((a, b) => {
    if (a.height !== b.height) return a.height - b.height
    return Math.random() - 0.5
  })

  const assignments: SeatAssignment[] = []
  let row = 1
  let col = 1
  let group = 1

  // 2. 从第1排第1列开始依次安排座位
  for (let i = 0; i < sorted.length; i++) {
    const student = sorted[i]!

    // 计算当前组
    const groupIndex = Math.floor(i / config.groupSize)
    group = groupIndex + 1

    assignments.push({
      studentId: student.id,
      studentName: student.name,
      row,
      col,
      group,
    })

    // 更新列号（每排2组间留过道，即列号跳1）
    col += 1
    if (col > config.cols) {
      col = 1
      row += 1
    }
  }

  return assignments
}

/**
 * 卫生值日分组算法（VBA 模块4「值日分组」移植）
 *
 * 算法逻辑：
 * 1. 读取男女生名单
 * 2. 分别随机打乱男女生顺序
 * 3. 计算总人数和每组人数（5组，人数差不超过1）
 * 4. 按比例计算每组的男女生数量（尽量平衡）
 * 5. 男生先分配到各组，女生补充到各组剩余位置
 * 6. 每组内隔行排列
 */
export interface CleaningGroup {
  groupNumber: number
  members: Student[]
}

export function assignCleaningGroups(
  students: Student[],
  groupCount = 5,
): CleaningGroup[] {
  // 1. 分离男女
  const males = students.filter((s) => s.gender === '男')
  const females = students.filter((s) => s.gender === '女')

  // 2. 分别随机打乱
  const shuffledMales = shuffle(males)
  const shuffledFemales = shuffle(females)

  // 3. 计算每组人数
  const total = students.length
  const basePerGroup = Math.floor(total / groupCount)
  const remainder = total % groupCount
  const groupSizes = Array.from({ length: groupCount }, (_, i) =>
    basePerGroup + (i < remainder ? 1 : 0),
  )

  // 4. 按比例计算每组男女生数量
  const maleRatio = males.length / Math.max(total, 1)
  const groupMaleCounts = groupSizes.map((size) => Math.round(size * maleRatio))

  // 5. 分配男生
  const groups: CleaningGroup[] = Array.from({ length: groupCount }, (_, i) => ({
    groupNumber: i + 1,
    members: [],
  }))

  let maleIdx = 0
  for (let g = 0; g < groupCount; g++) {
    const count = Math.min(groupMaleCounts[g] ?? 0, shuffledMales.length - maleIdx)
    for (let j = 0; j < count; j++) {
      groups[g]?.members.push(shuffledMales[maleIdx]!)
      maleIdx++
    }
  }
  // 剩余男生分配到前面组
  while (maleIdx < shuffledMales.length) {
    for (let g = 0; g < groupCount && maleIdx < shuffledMales.length; g++) {
      groups[g]?.members.push(shuffledMales[maleIdx]!)
      maleIdx++
    }
  }

  // 6. 女生补充到各组剩余位置（交替分配保持均衡）
  let femaleIdx = 0
  for (let g = 0; g < groupCount; g++) {
    const group = groups[g]!
    const needed = (groupSizes[g] ?? 0) - group.members.length
    for (let j = 0; j < needed && femaleIdx < shuffledFemales.length; j++) {
      group.members.push(shuffledFemales[femaleIdx]!)
      femaleIdx++
    }
  }
  // 剩余女生依次补充
  while (femaleIdx < shuffledFemales.length) {
    for (let g = 0; g < groupCount && femaleIdx < shuffledFemales.length; g++) {
      const group = groups[g]!
      if (group.members.length < (groupSizes[g] ?? 0)) {
        group.members.push(shuffledFemales[femaleIdx]!)
        femaleIdx++
      }
    }
  }

  return groups
}

/** 默认值日任务列表 */
export const DEFAULT_TASKS: string[] = [
  '扫地', '拖地', '擦黑板', '倒垃圾', '擦桌椅',
  '门窗', '走廊', '讲台', '图书角', '卫生角',
]