import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Student, BehaviorRecord, RecordType } from '@/types'
import { mockStudents } from '@/utils/mock-students'

export const useStudentStore = defineStore('student', () => {
  // ===== State =====
  const students = ref<Student[]>([...mockStudents])
  const selectedId = ref<number | null>(null)

  // ===== Getters =====
  const totalCount = computed(() => students.value.length)

  const maleCount = computed(() =>
    students.value.filter((s) => s.gender === '男').length,
  )

  const femaleCount = computed(() =>
    students.value.filter((s) => s.gender === '女').length,
  )

  const selectedStudent = computed(() =>
    students.value.find((s) => s.id === selectedId.value) ?? null,
  )

  const studentNames = computed(() => students.value.map((s) => s.name))

  /** 按类型分组统计 */
  const typeCount = computed(() => {
    const map = new Map<string, number>()
    for (const s of students.value) {
      map.set(s.type, (map.get(s.type) ?? 0) + 1)
    }
    return map
  })

  /** 搜索学生 */
  function search(keyword: string): Student[] {
    if (!keyword.trim()) return students.value
    const kw = keyword.trim()
    return students.value.filter(
      (s) => s.name.includes(kw) || s.type.includes(kw),
    )
  }

  /** 获取学生行为记录统计 */
  function getRecordStats(studentId: number) {
    const student = students.value.find((s) => s.id === studentId)
    if (!student) return { positive: 0, negative: 0, leave: 0, total: 0 }
    const positive = student.records.filter((r) => r.type === '正向').length
    const negative = student.records.filter((r) => r.type === '负向').length
    const leave = student.records.filter((r) => r.type === '请假').length
    return { positive, negative, leave, total: positive + negative + leave }
  }

  // ===== Actions =====
  function selectStudent(id: number) {
    selectedId.value = id
  }

  function getStudentById(id: number): Student | undefined {
    return students.value.find((s) => s.id === id)
  }

  function addStudent(data: Omit<Student, 'id' | 'studentNo'>) {
    const maxId = Math.max(...students.value.map((s) => s.id), 0)
    const newStudent = {
      ...data,
      id: maxId + 1,
      studentNo: maxId + 1,
    } as Student
    students.value.push(newStudent)
    return newStudent
  }

  function updateStudent(id: number, data: Partial<Student>) {
    const idx = students.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      students.value[idx] = { ...students.value[idx], ...data } as Student
    }
  }

  function deleteStudent(id: number) {
    const idx = students.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      students.value.splice(idx, 1)
      if (selectedId.value === id) selectedId.value = null
    }
  }

  function addRecord(studentId: number, type: RecordType, date: string, content: string) {
    const student = students.value.find((s) => s.id === studentId)
    if (student) {
      const maxRid = Math.max(...student.records.map((r) => r.id), 0)
      const record: BehaviorRecord = {
        id: maxRid + 1,
        type,
        date,
        content,
      }
      student.records.push(record)
    }
  }

  function deleteRecord(studentId: number, recordId: number) {
    const student = students.value.find((s) => s.id === studentId)
    if (student) {
      const idx = student.records.findIndex((r) => r.id === recordId)
      if (idx !== -1) student.records.splice(idx, 1)
    }
  }

  return {
    // state
    students,
    selectedId,
    // getters
    totalCount,
    maleCount,
    femaleCount,
    selectedStudent,
    studentNames,
    typeCount,
    // methods
    search,
    getRecordStats,
    selectStudent,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    addRecord,
    deleteRecord,
  }
})
