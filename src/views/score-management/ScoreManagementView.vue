<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useScoreStore } from '@/stores/score'
import { useStudentStore } from '@/stores/student'
import type { ScoreRecord, Gender, StudentType, SubjectAttr, EvaluationLevel } from '@/types'
import { SUBJECTS, DICTIONARIES, calcEvaluation, calcScoreRate } from '@/utils/constants'

const scoreStore = useScoreStore()
const studentStore = useStudentStore()

// ===== 考试选择 =====
const currentExam = ref(scoreStore.exams[0]?.name ?? '')

// ===== Tab 切换 =====
const activeTab = ref('entry')

// ===== 成绩录入表（宽表模式）=====
interface ScoreRow {
  studentId: number
  name: string
  gender: string
  type: string
  scores: Record<string, number | ''>
}

const scoreRows = computed<ScoreRow[]>(() => {
  return studentStore.students.map((s) => {
    const existing: Record<string, number | ''> = {}
    for (const subj of SUBJECTS) {
      const record = scoreStore.scores.find(
        (r) => r.examName === currentExam.value && r.studentId === s.id && r.subject === subj.name,
      )
      existing[subj.name] = record ? record.score : ''
    }
    return {
      studentId: s.id,
      name: s.name,
      gender: s.gender,
      type: s.type,
      scores: existing,
    }
  })
})

// 手动编辑成绩
function onScoreChange(row: ScoreRow, subject: string) {
  const val = row.scores[subject]
  if (val === '' || val === null || val === undefined) return

  const subjConfig = SUBJECTS.find((s) => s.name === subject)
  if (!subjConfig) return

  const score = Number(val)
  if (isNaN(score) || score < 0 || score > subjConfig.fullScore) {
    ElMessage.warning(`${subject}分数应在 0~${subjConfig.fullScore} 之间`)
    return
  }

  // 查找已有记录
  const existingIdx = scoreStore.scores.findIndex(
    (r) => r.examName === currentExam.value && r.studentId === row.studentId && r.subject === subject,
  )

  const rate = calcScoreRate(score, subjConfig.fullScore)
  const evaluation = calcEvaluation(rate) as EvaluationLevel

  if (existingIdx !== -1) {
    // 更新
    const existing = scoreStore.scores[existingIdx]
    if (existing) {
      existing.score = score
      existing.evaluation = evaluation
    }
  } else {
    // 新增
    const exam = scoreStore.exams.find((e) => e.name === currentExam.value)
    const maxId = Math.max(...scoreStore.scores.map((r) => r.id), 0)
    const newRecord: ScoreRecord = {
      id: maxId + 1,
      examId: exam?.id ?? 0,
      examName: currentExam.value,
      studentId: row.studentId,
      studentName: row.name,
      gender: row.gender as Gender,
      studentType: row.type as StudentType,
      subject,
      subjectAttr: subjConfig.attr as SubjectAttr,
      fullScore: subjConfig.fullScore,
      score,
      evaluation,
      gradeAvg: 0,
      classAvg: 0,
    }
    scoreStore.scores.push(newRecord)
  }
}

// 计算当前行总分
function rowTotal(row: ScoreRow): number {
  return Object.values(row.scores).reduce<number>((sum, v) => {
    const n = Number(v)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
}

// 计算当前行平均得分率
function rowAvgRate(row: ScoreRow): number {
  let totalRate = 0
  let count = 0
  for (const subj of SUBJECTS) {
    const val = row.scores[subj.name]
    if (val !== '' && val !== null && val !== undefined) {
      totalRate += calcScoreRate(Number(val), subj.fullScore)
      count++
    }
  }
  return count > 0 ? Math.round((totalRate / count) * 10000) / 100 : 0
}

// ===== 新增考试 =====
const newExamDialogVisible = ref(false)
const newExamName = ref('')

function addExam() {
  if (!newExamName.value.trim()) {
    ElMessage.warning('请输入考试名称')
    return
  }
  const exists = scoreStore.exams.some((e) => e.name === newExamName.value.trim())
  if (exists) {
    ElMessage.warning('该考试名称已存在')
    return
  }
  const maxId = Math.max(...scoreStore.exams.map((e) => e.id), 0)
  scoreStore.exams.push({ id: maxId + 1, name: newExamName.value.trim() })
  currentExam.value = newExamName.value.trim()
  newExamName.value = ''
  newExamDialogVisible.value = false
  ElMessage.success('考试已添加')
}

// ===== 删除考试 =====
function deleteExam() {
  if (!currentExam.value) return
  ElMessageBox.confirm(
    `确定要删除「${currentExam.value}」及其全部成绩数据吗？此操作不可撤销。`,
    '确认删除',
    { type: 'warning' },
  ).then(() => {
    scoreStore.deleteExam(currentExam.value)
    currentExam.value = scoreStore.exams[0]?.name ?? ''
    ElMessage.success('考试已删除')
  }).catch(() => {})
}

// ===== 清空全部成绩 =====
function clearAll() {
  ElMessageBox.confirm(
    '确定要清空全部考试成绩数据吗？此操作不可撤销。',
    '确认清空',
    { type: 'error' },
  ).then(() => {
    scoreStore.clearAllScores()
    ElMessage.success('成绩已全部清空')
  }).catch(() => {})
}

// ===== 批量导入 =====
const importDialogVisible = ref(false)
const importExamName = ref('')
const importText = ref('')
const importPreview = ref<{ name: string; gender: string; type: string; scores: Record<string, number> }[]>([])
const importStep = ref(0) // 0=input, 1=preview

const importColumns = ['姓名', '性别', '类型', ...SUBJECTS.map((s) => s.name)]

function parseImport() {
  const lines = importText.value.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) {
    ElMessage.warning('请输入表头和数据行（至少2行）')
    return
  }

  const headers = (lines[0] ?? '').split('\t').map((h) => h.trim())
  const preview: typeof importPreview.value = []

  for (let i = 1; i < lines.length; i++) {
    const cols = (lines[i] ?? '').split('\t').map((c) => c.trim())
    const name = cols[headers.indexOf('姓名')] ?? ''
    if (!name) continue

    const gender = cols[headers.indexOf('性别')] ?? '男'
    const type = cols[headers.indexOf('类型')] ?? '普高生'
    const scores: Record<string, number> = {}

    for (const subj of SUBJECTS) {
      const idx = headers.indexOf(subj.name)
      if (idx !== -1 && cols[idx]) {
        const val = Number(cols[idx])
        if (!isNaN(val)) scores[subj.name] = val
      }
    }

    preview.push({ name, gender, type, scores })
  }

  if (preview.length === 0) {
    ElMessage.warning('未解析到有效数据行')
    return
  }

  importPreview.value = preview
  importStep.value = 1
}

function confirmImport() {
  if (!importExamName.value.trim()) {
    ElMessage.warning('请输入考试名称')
    return
  }
  const count = scoreStore.importScores(importExamName.value.trim(), importPreview.value)
  currentExam.value = importExamName.value.trim()
  importDialogVisible.value = false
  importStep.value = 0
  importText.value = ''
  importPreview.value = []
  importExamName.value = ''
  ElMessage.success(`成功导入 ${count} 条成绩记录`)
}

function openImport() {
  importDialogVisible.value = true
  importStep.value = 0
  importText.value = ''
  importPreview.value = []
  importExamName.value = ''
}

// ===== 明细数据库 =====
const dbSearchName = ref('')
const dbFilterSubject = ref('')

const dbFiltered = computed(() => {
  return scoreStore.scores.filter((r) => {
    if (r.examName !== currentExam.value) return false
    if (dbSearchName.value.trim() && !r.studentName.includes(dbSearchName.value.trim())) return false
    if (dbFilterSubject.value && r.subject !== dbFilterSubject.value) return false
    return true
  })
})

function evalTagType(level: string): 'success' | 'warning' | 'info' | 'danger' {
  if (level === '优秀') return 'success'
  if (level === '良好') return 'warning'
  if (level === '及格') return 'info'
  return 'danger'
}
</script>

<template>
  <div class="score-management">
    <!-- 考试选择栏 -->
    <div class="exam-bar card">
      <div class="exam-left">
        <span class="exam-label">当前考试：</span>
        <el-select v-model="currentExam" placeholder="选择考试" style="width: 160px">
          <el-option v-for="e in scoreStore.exams" :key="e.id" :label="e.name" :value="e.name" />
        </el-select>
        <el-button type="primary" size="small" @click="newExamDialogVisible = true">
          <el-icon><Plus /></el-icon> 新增考试
        </el-button>
        <el-button type="danger" size="small" plain @click="deleteExam" :disabled="!currentExam">
          删除该卷
        </el-button>
        <el-button type="danger" size="small" @click="clearAll">
          清空全部
        </el-button>
      </div>
      <div class="exam-right">
        <el-button type="primary" @click="openImport">
          <el-icon><Upload /></el-icon> 批量导入
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ scoreStore.exams.length }}</div>
        <div class="stat-label">考试卷数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ scoreStore.scores.filter(r => r.examName === currentExam).length }}</div>
        <div class="stat-label">当前卷成绩条数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ scoreStore.scores.length }}</div>
        <div class="stat-label">总成绩条数</div>
      </div>
    </div>

    <!-- Tab 区 -->
    <el-tabs v-model="activeTab" class="content-tabs">
      <!-- 成绩录入 -->
      <el-tab-pane label="成绩录入（宽表）" name="entry">
        <div class="table-wrap card">
          <el-table
            :data="scoreRows"
            stripe
            border
            style="width: 100%"
            :header-cell-style="{ background: 'var(--primary-bg)', fontWeight: 600 }"
            max-height="600"
          >
            <el-table-column prop="name" label="姓名" width="90" fixed />
            <el-table-column prop="gender" label="性别" width="55" align="center" />
            <el-table-column prop="type" label="类型" width="70" align="center" />
            <el-table-column
              v-for="subj in SUBJECTS"
              :key="subj.name"
              :label="subj.name"
              :width="subj.fullScore === 150 ? 80 : 70"
              align="center"
            >
              <template #header>
                <div class="subj-header">
                  <span>{{ subj.name }}</span>
                  <span class="full-score">/{{ subj.fullScore }}</span>
                </div>
              </template>
              <template #default="{ row }: { row: any }">
                <el-input
                  v-model="row.scores[subj.name]"
                  :placeholder="'0-' + subj.fullScore"
                  size="small"
                  type="number"
                  style="width: 100%"
                  @change="onScoreChange(row as ScoreRow, subj.name)"
                />
              </template>
            </el-table-column>
            <el-table-column label="总分" width="80" align="center" fixed="right">
              <template #default="{ row }: { row: any }">
                <span class="total-score">{{ rowTotal(row as ScoreRow) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="平均得分率" width="100" align="center" fixed="right">
              <template #default="{ row }: { row: any }">
                <span :class="['rate-badge', rowAvgRate(row as ScoreRow) >= 60 ? 'pass' : 'fail']">
                  {{ rowAvgRate(row as ScoreRow) }}%
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 明细数据库 -->
      <el-tab-pane label="明细数据库" name="database">
        <div class="db-toolbar card">
          <el-input v-model="dbSearchName" placeholder="搜索学生姓名" clearable style="width: 200px" />
          <el-select v-model="dbFilterSubject" placeholder="筛选科目" clearable style="width: 140px">
            <el-option v-for="s in SUBJECTS" :key="s.name" :label="s.name" :value="s.name" />
          </el-select>
          <span class="db-count">共 {{ dbFiltered.length }} 条记录</span>
        </div>
        <div class="table-wrap card">
          <el-table
            :data="dbFiltered"
            stripe
            style="width: 100%"
            :header-cell-style="{ background: 'var(--primary-bg)', fontWeight: 600 }"
            max-height="600"
          >
            <el-table-column prop="studentName" label="姓名" width="90" />
            <el-table-column prop="gender" label="性别" width="55" align="center" />
            <el-table-column prop="subject" label="科目" width="70" align="center" />
            <el-table-column prop="subjectAttr" label="属性" width="60" align="center" />
            <el-table-column prop="fullScore" label="满分" width="60" align="center" />
            <el-table-column prop="score" label="得分" width="60" align="center">
              <template #default="{ row }">
                <span class="score-value">{{ row.score }}</span>
              </template>
            </el-table-column>
            <el-table-column label="得分率" width="80" align="center">
              <template #default="{ row }">
                {{ Math.round(calcScoreRate(row.score, row.fullScore) * 100) }}%
              </template>
            </el-table-column>
            <el-table-column label="评价" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="evalTagType(row.evaluation)" size="small">{{ row.evaluation }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="classAvg" label="班级均分" width="80" align="center" />
            <el-table-column prop="gradeAvg" label="年级均分" width="80" align="center" />
          </el-table>
          <el-empty v-if="!dbFiltered.length" description="暂无成绩数据" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增考试对话框 -->
    <el-dialog v-model="newExamDialogVisible" title="新增考试" width="400px">
      <el-form label-width="80px">
        <el-form-item label="考试名称">
          <el-input v-model="newExamName" placeholder="如：第4卷 / 期中考试" @keyup.enter="addExam" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newExamDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addExam">添加</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="importDialogVisible" title="批量导入成绩" width="760px" :close-on-click-modal="false">
      <div v-show="importStep === 0" class="import-step">
        <el-form label-width="90px">
          <el-form-item label="考试名称">
            <el-input v-model="importExamName" placeholder="如：期中考试" style="width: 220px" />
          </el-form-item>
        </el-form>
        <div class="import-hint">
          <p>请从 Excel 复制数据（含表头），格式为 Tab 分隔：</p>
          <code>姓名\t性别\t类型\t语文\t数学\t外语\t物理\t化学\t生物\t历史\t地理\t政治</code>
          <p>第一行为表头，后续行为数据。缺失的科目留空即可。</p>
        </div>
        <el-input
          v-model="importText"
          type="textarea"
          :rows="10"
          placeholder="在此粘贴 Excel 数据..."
          style="font-family: monospace; margin-top: 12px"
        />
        <div class="import-actions">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="parseImport">解析预览</el-button>
        </div>
      </div>

      <div v-show="importStep === 1" class="import-preview">
        <p class="preview-tip">解析到 {{ importPreview.length }} 条数据，请确认后导入：</p>
        <el-table :data="importPreview" stripe max-height="400" size="small" style="width: 100%">
          <el-table-column prop="name" label="姓名" width="80" />
          <el-table-column prop="gender" label="性别" width="50" />
          <el-table-column prop="type" label="类型" width="70" />
          <el-table-column
            v-for="subj in SUBJECTS"
            :key="subj.name"
            :label="subj.name"
            width="60"
            align="center"
          >
            <template #default="{ row }">
              {{ row.scores[subj.name] ?? '—' }}
            </template>
          </el-table-column>
        </el-table>
        <div class="import-actions">
          <el-button @click="importStep = 0">返回修改</el-button>
          <el-button type="primary" @click="confirmImport">确认导入</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.score-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exam-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;

  .exam-left {
    display: flex;
    align-items: center;
    gap: 10px;

    .exam-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.stat-cards {
  display: flex;
  gap: 14px;

  .stat-card {
    flex: 1;
    background: var(--bg-card);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
    padding: 16px 20px;
    text-align: center;

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--primary-color);
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
  }
}

.content-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
}

.table-wrap {
  padding: 0;
  overflow: hidden;

  .subj-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.3;

    .full-score {
      font-size: 11px;
      color: var(--text-secondary);
      font-weight: 400;
    }
  }

  .total-score {
    font-weight: 600;
    color: var(--primary-color);
  }

  .rate-badge {
    font-size: 13px;
    font-weight: 600;

    &.pass {
      color: var(--success-color);
    }
    &.fail {
      color: var(--danger-color);
    }
  }

  .score-value {
    font-weight: 600;
  }
}

.db-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;

  .db-count {
    font-size: 13px;
    color: var(--text-secondary);
    margin-left: auto;
  }
}

.import-step {
  .import-hint {
    background: var(--primary-bg);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    margin-top: 12px;

    p {
      font-size: 13px;
      color: var(--text-regular);
      line-height: 1.8;
    }

    code {
      display: block;
      font-family: monospace;
      font-size: 12px;
      color: var(--primary-color);
      margin: 4px 0;
    }
  }

  .import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
}

.import-preview {
  .preview-tip {
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
  }
}
</style>
