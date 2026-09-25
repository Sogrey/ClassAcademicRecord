import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ScoreRecord, Exam, ClassFilter, EvaluationLevel, Gender, StudentType } from '@/types'
import { mockScores, mockExams } from '@/utils/mock-scores'
import { SUBJECTS, calcEvaluation, calcScoreRate } from '@/utils/constants'

export const useScoreStore = defineStore('score', () => {
  // ===== State =====
  const scores = ref<ScoreRecord[]>([...mockScores])
  const exams = ref<Exam[]>([...mockExams])

  // 筛选器
  const filter = ref<ClassFilter>({
    exam: '第1卷',
    evaluations: [] as EvaluationLevel[],
    genders: [] as Gender[],
    studentTypes: [] as StudentType[],
    subjects: [] as string[],
  })

  // ===== Getters =====

  /** 当前筛选条件下的成绩记录 */
  const filteredScores = computed(() => {
    return scores.value.filter((r) => {
      if (r.examName !== filter.value.exam) return false
      if (filter.value.evaluations.length && !filter.value.evaluations.includes(r.evaluation))
        return false
      if (filter.value.genders.length && !filter.value.genders.includes(r.gender))
        return false
      if (filter.value.studentTypes.length && !filter.value.studentTypes.includes(r.studentType))
        return false
      if (filter.value.subjects.length && !filter.value.subjects.includes(r.subject))
        return false
      return true
    })
  })

  /** 当前筛选下的学生人数 */
  const filteredStudentCount = computed(() => {
    const names = new Set(filteredScores.value.map((r) => r.studentName))
    return names.size
  })

  /** 当前考试的科目列表 */
  const examSubjects = computed(() => {
    const subs = new Set(
      scores.value
        .filter((r) => r.examName === filter.value.exam)
        .map((r) => r.subject),
    )
    return Array.from(subs)
  })

  /** 班级均分（按科目） */
  const classAvgBySubject = computed(() => {
    const map = new Map<string, number>()
    for (const subject of examSubjects.value) {
      const records = filteredScores.value.filter((r) => r.subject === subject)
      if (records.length) {
        const avg = records.reduce((sum, r) => sum + r.score, 0) / records.length
        map.set(subject, Math.round(avg * 100) / 100)
      }
    }
    return map
  })

  /** 年级均分（按科目） */
  const gradeAvgBySubject = computed(() => {
    const map = new Map<string, number>()
    for (const subject of examSubjects.value) {
      const records = filteredScores.value.filter((r) => r.subject === subject)
      if (records.length) {
        const avg = records.reduce((sum, r) => sum + r.gradeAvg, 0) / records.length
        map.set(subject, Math.round(avg * 100) / 100)
      }
    }
    return map
  })

  /** 得分率（按科目） */
  const scoreRateBySubject = computed(() => {
    const map = new Map<string, number>()
    for (const subject of examSubjects.value) {
      const records = filteredScores.value.filter((r) => r.subject === subject)
      if (records.length) {
        const totalRate = records.reduce(
          (sum, r) => sum + calcScoreRate(r.score, r.fullScore),
          0,
        )
        map.set(subject, Math.round((totalRate / records.length) * 10000) / 100)
      }
    }
    return map
  })

  /** 评价分布统计 */
  const evaluationDistribution = computed(() => {
    const map = new Map<string, number>()
    for (const r of filteredScores.value) {
      map.set(r.evaluation, (map.get(r.evaluation) ?? 0) + 1)
    }
    return map
  })

  /** 性别得分率对比 */
  const genderScoreRate = computed(() => {
    const result: { male: number; female: number } = { male: 0, female: 0 }
    const maleRecords = filteredScores.value.filter((r) => r.gender === '男')
    const femaleRecords = filteredScores.value.filter((r) => r.gender === '女')
    if (maleRecords.length) {
      result.male =
        Math.round(
          (maleRecords.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / maleRecords.length) * 10000,
        ) / 100
    }
    if (femaleRecords.length) {
      result.female =
        Math.round(
          (femaleRecords.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / femaleRecords.length) * 10000,
        ) / 100
    }
    return result
  })

  // ===== Actions =====

  function setExam(examName: string) {
    filter.value.exam = examName
  }

  function toggleEvaluation(level: EvaluationLevel) {
    const idx = filter.value.evaluations.indexOf(level)
    if (idx === -1) filter.value.evaluations.push(level)
    else filter.value.evaluations.splice(idx, 1)
  }

  function toggleGender(gender: Gender) {
    const idx = filter.value.genders.indexOf(gender)
    if (idx === -1) filter.value.genders.push(gender)
    else filter.value.genders.splice(idx, 1)
  }

  function toggleStudentType(type: StudentType) {
    const idx = filter.value.studentTypes.indexOf(type)
    if (idx === -1) filter.value.studentTypes.push(type)
    else filter.value.studentTypes.splice(idx, 1)
  }

  function toggleSubject(subject: string) {
    const idx = filter.value.subjects.indexOf(subject)
    if (idx === -1) filter.value.subjects.push(subject)
    else filter.value.subjects.splice(idx, 1)
  }

  function resetFilter() {
    filter.value = {
      exam: exams.value[0]?.name ?? '',
      evaluations: [],
      genders: [],
      studentTypes: [],
      subjects: [],
    }
  }

  /** 删除指定考试的全部成绩 */
  function deleteExam(examName: string) {
    scores.value = scores.value.filter((r) => r.examName !== examName)
    const idx = exams.value.findIndex((e) => e.name === examName)
    if (idx !== -1) exams.value.splice(idx, 1)
  }

  /** 清空全部成绩 */
  function clearAllScores() {
    scores.value = []
  }

  /** 批量导入成绩（宽表格式） */
  function importScores(
    examName: string,
    data: { name: string; gender: string; type: string; scores: Record<string, number> }[],
  ) {
    let eid = exams.value.find((e) => e.name === examName)?.id
    if (!eid) {
      eid = Math.max(...exams.value.map((e) => e.id), 0) + 1
      exams.value.push({ id: eid, name: examName })
    }

    const newRecords: ScoreRecord[] = []
    let rid = Math.max(...scores.value.map((r) => r.id), 0)

    for (const row of data) {
      for (const subj of SUBJECTS) {
        const score = row.scores[subj.name]
        if (score === undefined || score === null) continue

        const rate = calcScoreRate(score, subj.fullScore)
        const evaluation = calcEvaluation(rate) as EvaluationLevel

        newRecords.push({
          id: ++rid,
          examId: eid,
          examName,
          studentId: 0, // 待关联
          studentName: row.name,
          gender: row.gender as Gender,
          studentType: row.type as StudentType,
          subject: subj.name,
          subjectAttr: subj.attr,
          fullScore: subj.fullScore,
          score,
          evaluation,
          gradeAvg: 0,
          classAvg: 0,
        })
      }
    }

    scores.value.push(...newRecords)
    return newRecords.length
  }

  return {
    // state
    scores,
    exams,
    filter,
    // getters
    filteredScores,
    filteredStudentCount,
    examSubjects,
    classAvgBySubject,
    gradeAvgBySubject,
    scoreRateBySubject,
    evaluationDistribution,
    genderScoreRate,
    // actions
    setExam,
    toggleEvaluation,
    toggleGender,
    toggleStudentType,
    toggleSubject,
    resetFilter,
    deleteExam,
    clearAllScores,
    importScores,
  }
})
