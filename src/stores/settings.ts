import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  SubjectConfig,
  EvaluationConfig,
  PsychologyConfig,
  HealthEvaluation,
} from '@/types'
import {
  SUBJECTS,
  EVALUATIONS,
  PSYCHOLOGY,
  HEALTH_EVALUATIONS,
  DICTIONARIES,
  ETHNICITIES,
} from '@/utils/constants'

/** localStorage 存储键 */
const STORAGE_KEY = 'class-system-settings-v1'

interface SettingsState {
  subjects: SubjectConfig[]
  evaluations: EvaluationConfig[]
  psychology: PsychologyConfig
  healthEvaluations: HealthEvaluation[]
  dictionaries: Record<string, string[]>
  ethnicities: string[]
}

/** 默认配置（从 constants 深拷贝） */
function defaultState(): SettingsState {
  return {
    subjects: SUBJECTS.map((s) => ({ ...s })),
    evaluations: EVALUATIONS.map((e) => ({ ...e })),
    psychology: {
      emotionTypes: [...PSYCHOLOGY.emotionTypes],
      socialTypes: [...PSYCHOLOGY.socialTypes],
      learningTypes: [...PSYCHOLOGY.learningTypes],
    },
    healthEvaluations: HEALTH_EVALUATIONS.map((h) => ({ ...h })),
    dictionaries: {
      familyStructure: [...DICTIONARIES.familyStructure],
      commPreference: [...DICTIONARIES.commPreference],
      studentStatus: [...DICTIONARIES.studentStatus],
      studentType: [...DICTIONARIES.studentType],
      gender: [...DICTIONARIES.gender],
    },
    ethnicities: [...ETHNICITIES],
  }
}

/** 从 localStorage 读取（容错） */
function loadState(): SettingsState {
  const base = defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    return {
      ...base,
      ...parsed,
      subjects: parsed.subjects?.length ? parsed.subjects : base.subjects,
      evaluations: parsed.evaluations?.length ? parsed.evaluations : base.evaluations,
      psychology: { ...base.psychology, ...parsed.psychology },
      healthEvaluations: parsed.healthEvaluations?.length
        ? parsed.healthEvaluations
        : base.healthEvaluations,
      dictionaries: { ...base.dictionaries, ...parsed.dictionaries },
      ethnicities: parsed.ethnicities?.length ? parsed.ethnicities : base.ethnicities,
    }
  } catch {
    return base
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // ===== State =====
  const subjects = ref<SubjectConfig[]>(loadState().subjects)
  const evaluations = ref<EvaluationConfig[]>(loadState().evaluations)
  const psychology = ref<PsychologyConfig>(loadState().psychology)
  const healthEvaluations = ref<HealthEvaluation[]>(loadState().healthEvaluations)
  const dictionaries = ref<Record<string, string[]>>(loadState().dictionaries)
  const ethnicities = ref<string[]>(loadState().ethnicities)

  // ===== 持久化 =====
  function persist() {
    const state: SettingsState = {
      subjects: subjects.value,
      evaluations: evaluations.value,
      psychology: psychology.value,
      healthEvaluations: healthEvaluations.value,
      dictionaries: dictionaries.value,
      ethnicities: ethnicities.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  // ===== 学科 =====
  function addSubject(data: SubjectConfig) {
    subjects.value.push({ ...data })
    persist()
  }

  function updateSubject(index: number, data: Partial<SubjectConfig>) {
    if (subjects.value[index]) {
      subjects.value[index] = { ...subjects.value[index]!, ...data }
      persist()
    }
  }

  function removeSubject(index: number) {
    subjects.value.splice(index, 1)
    persist()
  }

  // ===== 评价等级（固定4个，只可改名/改系数）=====
  function updateEvaluation(index: number, data: Partial<EvaluationConfig>) {
    if (evaluations.value[index]) {
      evaluations.value[index] = { ...evaluations.value[index]!, ...data }
      persist()
    }
  }

  // ===== 心理预设 =====
  function updatePsychologyType(
    dim: keyof PsychologyConfig,
    index: number,
    value: string,
  ) {
    const arr = psychology.value[dim] as string[]
    if (arr[index] !== undefined) {
      arr[index] = value
      persist()
    }
  }

  function addPsychologyType(dim: keyof PsychologyConfig, value: string) {
    ;(psychology.value[dim] as string[]).push(value)
    persist()
  }

  function removePsychologyType(dim: keyof PsychologyConfig, index: number) {
    ;(psychology.value[dim] as string[]).splice(index, 1)
    persist()
  }

  // ===== 健康评价 =====
  function updateHealth(index: number, data: Partial<HealthEvaluation>) {
    if (healthEvaluations.value[index]) {
      healthEvaluations.value[index] = { ...healthEvaluations.value[index]!, ...data }
      persist()
    }
  }

  function addHealth(name: string, description: string) {
    healthEvaluations.value.push({ name, description })
    persist()
  }

  function removeHealth(index: number) {
    healthEvaluations.value.splice(index, 1)
    persist()
  }

  // ===== 基础词典 =====
  function updateDictionary(key: string, index: number, value: string) {
    const arr = dictionaries.value[key] as string[]
    if (arr[index] !== undefined) {
      arr[index] = value
      persist()
    }
  }

  function addDictionaryItem(key: string, value: string) {
    ;(dictionaries.value[key] as string[]).push(value)
    persist()
  }

  function removeDictionaryItem(key: string, index: number) {
    ;(dictionaries.value[key] as string[]).splice(index, 1)
    persist()
  }

  // ===== 民族 =====
  function addEthnicity(value: string) {
    ethnicities.value.push(value)
    persist()
  }

  function removeEthnicity(index: number) {
    ethnicities.value.splice(index, 1)
    persist()
  }

  /** 恢复默认 */
  function resetAll() {
    const base = defaultState()
    subjects.value = base.subjects
    evaluations.value = base.evaluations
    psychology.value = base.psychology
    healthEvaluations.value = base.healthEvaluations
    dictionaries.value = base.dictionaries
    ethnicities.value = base.ethnicities
    persist()
  }

  return {
    // state
    subjects,
    evaluations,
    psychology,
    healthEvaluations,
    dictionaries,
    ethnicities,
    // actions
    addSubject,
    updateSubject,
    removeSubject,
    updateEvaluation,
    addPsychologyType,
    removePsychologyType,
    updatePsychologyType,
    updateHealth,
    addHealth,
    removeHealth,
    updateDictionary,
    addDictionaryItem,
    removeDictionaryItem,
    addEthnicity,
    removeEthnicity,
    resetAll,
  }
})