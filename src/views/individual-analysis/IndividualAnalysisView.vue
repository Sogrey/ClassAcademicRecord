<script setup lang="ts">
import { computed, ref } from 'vue'
import { useScoreStore } from '@/stores/score'
import { useStudentStore } from '@/stores/student'
import type { EvaluationLevel, ScoreRecord } from '@/types'
import { SUBJECTS, EVALUATIONS, calcScoreRate, calcEvaluation } from '@/utils/constants'
import type { EChartsOption } from 'echarts'
import ChartContainer from '@/components/charts/ChartContainer.vue'

const scoreStore = useScoreStore()
const studentStore = useStudentStore()

// ===== 筛选器 =====
const selectedStudentId = ref<number | null>(studentStore.students[0]?.id ?? null)
const selectedExams = ref<string[]>(scoreStore.exams.map((e) => e.name))
const selectedSubjects = ref<string[]>(SUBJECTS.map((s) => s.name))

const selectedStudent = computed(() => {
  if (selectedStudentId.value === null) return null
  return studentStore.getStudentById(selectedStudentId.value) ?? null
})

// 选中学生的所有成绩记录
const studentScores = computed(() => {
  if (selectedStudentId.value === null) return []
  return scoreStore.scores.filter((r) => {
    if (r.studentId !== selectedStudentId.value) return false
    if (selectedExams.value.length && !selectedExams.value.includes(r.examName)) return false
    if (selectedSubjects.value.length && !selectedSubjects.value.includes(r.subject)) return false
    return true
  })
})

// ===== 三大名单计算 =====

/** 所有学生按平均得分率排名 */
const studentRanking = computed(() => {
  const examNames = selectedExams.value.length ? selectedExams.value : scoreStore.exams.map((e) => e.name)
  const subjNames = selectedSubjects.value.length ? selectedSubjects.value : SUBJECTS.map((s) => s.name)

  const studentMap = new Map<number, { id: number; name: string; rates: number[]; scoresByExam: Map<string, number[]> }>()

  for (const s of studentStore.students) {
    studentMap.set(s.id, { id: s.id, name: s.name, rates: [], scoresByExam: new Map() })
  }

  for (const r of scoreStore.scores) {
    if (!examNames.includes(r.examName)) continue
    if (!subjNames.includes(r.subject)) continue
    const entry = studentMap.get(r.studentId)
    if (!entry) continue
    entry.rates.push(calcScoreRate(r.score, r.fullScore))
    if (!entry.scoresByExam.has(r.examName)) entry.scoresByExam.set(r.examName, [])
    entry.scoresByExam.get(r.examName)!.push(r.score)
  }

  const ranking = Array.from(studentMap.values()).map((e) => {
    const avgRate = e.rates.length ? e.rates.reduce((s, v) => s + v, 0) / e.rates.length : 0

    // 计算波动（各考试平均分的标准差）
    const examAvgs: number[] = []
    for (const [, scores] of e.scoresByExam) {
      if (scores.length) examAvgs.push(scores.reduce((s, v) => s + v, 0) / scores.length)
    }
    const volatility = computeStdDev(examAvgs)

    return { ...e, avgRate: Math.round(avgRate * 10000) / 100, volatility: Math.round(volatility * 100) / 100 }
  })

  return ranking
})

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

const excellentList = computed(() =>
  [...studentRanking.value].sort((a, b) => b.avgRate - a.avgRate).slice(0, 10),
)
const remedialList = computed(() =>
  [...studentRanking.value].sort((a, b) => a.avgRate - b.avgRate).slice(0, 10),
)
const volatileList = computed(() =>
  [...studentRanking.value].sort((a, b) => b.volatility - a.volatility).slice(0, 10),
)

// ===== 图表数据计算 =====
const examNames = computed(() => {
  const names = new Set(studentScores.value.map((r) => r.examName))
  return Array.from(names)
})

const subjectNames = computed(() => {
  const names = new Set(studentScores.value.map((r) => r.subject))
  return Array.from(names)
})

// 1. 总分与得分率动态对比（柱线组合）
const totalScoreRateChart = computed<EChartsOption>(() => {
  const exams = examNames.value
  const totals: number[] = []
  const rates: number[] = []
  for (const exam of exams) {
    const records = studentScores.value.filter((r) => r.examName === exam)
    const total = records.reduce((s, r) => s + r.score, 0)
    const rate = records.length
      ? Math.round(
          (records.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / records.length) * 10000,
        ) / 100
      : 0
    totals.push(total)
    rates.push(rate)
  }
  return {
    color: ['#6c5ce7', '#00b894'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['总分', '得分率'], bottom: 0 },
    grid: { left: '3%', right: '5%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: exams },
    yAxis: [
      { type: 'value', name: '总分', position: 'left' },
      { type: 'value', name: '得分率', position: 'right', axisLabel: { formatter: '{value}%' }, max: 100 },
    ],
    series: [
      {
        name: '总分',
        type: 'bar',
        data: totals,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '得分率',
        type: 'line',
        yAxisIndex: 1,
        data: rates,
        smooth: true,
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  }
})

// 2. 科目得分与得分率横向对比（柱线组合）
const subjectScoreRateChart = computed<EChartsOption>(() => {
  const subjects = subjectNames.value
  const scores: number[] = []
  const rates: number[] = []
  for (const subj of subjects) {
    const records = studentScores.value.filter((r) => r.subject === subj)
    const avgScore = records.length
      ? Math.round((records.reduce((s, r) => s + r.score, 0) / records.length) * 100) / 100
      : 0
    const avgRate = records.length
      ? Math.round(
          (records.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / records.length) * 10000,
        ) / 100
      : 0
    scores.push(avgScore)
    rates.push(avgRate)
  }
  return {
    color: ['#6c5ce7', '#fdcb6e'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['平均得分', '得分率'], bottom: 0 },
    grid: { left: '3%', right: '5%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: [
      { type: 'value', name: '得分' },
      { type: 'value', name: '得分率', position: 'right', axisLabel: { formatter: '{value}%' }, max: 100 },
    ],
    series: [
      { name: '平均得分', type: 'bar', data: scores, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '得分率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, symbol: 'circle', symbolSize: 8 },
    ],
  }
})

// 3. 科目得分率动态对比（多系列折线图）
const subjectTrendChart = computed<EChartsOption>(() => {
  const exams = examNames.value
  const subjects = subjectNames.value
  const series = subjects.map((subj) => ({
    name: subj,
    type: 'line' as const,
    smooth: true,
    data: exams.map((exam) => {
      const records = studentScores.value.filter((r) => r.subject === subj && r.examName === exam)
      return records.length
        ? Math.round(
            (records.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / records.length) * 10000,
          ) / 100
        : 0
    }),
  }))
  return {
    color: ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#e84393', '#0984e3', '#fd79a8', '#a29bfe'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: '3%', right: '4%', bottom: '18%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: exams },
    yAxis: { type: 'value', name: '得分率', axisLabel: { formatter: '{value}%' }, max: 100 },
    series,
  }
})

// 4. 偏科分析（雷达图）
const radarChart = computed<EChartsOption>(() => {
  const subjects = subjectNames.value
  const rates = subjects.map((subj) => {
    const records = studentScores.value.filter((r) => r.subject === subj)
    return records.length
      ? Math.round(
          (records.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / records.length) * 10000,
        ) / 100
      : 0
  })
  return {
    color: ['#6c5ce7'],
    tooltip: { trigger: 'item' },
    radar: {
      indicator: subjects.map((s) => ({ name: s, max: 100 })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: { fontSize: 11 },
    },
    series: [
      {
        type: 'radar',
        data: [{ value: rates, name: '得分率', areaStyle: { opacity: 0.3 } }],
      },
    ],
  }
})

// 5. 个人成绩与班/年级均分距离（柱线组合）
const compareAvgChart = computed<EChartsOption>(() => {
  const subjects = subjectNames.value
  const personalScores: number[] = []
  const classAvgs: number[] = []
  const gradeAvgs: number[] = []
  for (const subj of subjects) {
    const records = studentScores.value.filter((r) => r.subject === subj)
    personalScores.push(
      records.length ? Math.round((records.reduce((s, r) => s + r.score, 0) / records.length) * 100) / 100 : 0,
    )
    classAvgs.push(records.length ? Math.round((records.reduce((s, r) => s + r.classAvg, 0) / records.length) * 100) / 100 : 0)
    gradeAvgs.push(records.length ? Math.round((records.reduce((s, r) => s + r.gradeAvg, 0) / records.length) * 100) / 100 : 0)
  }
  return {
    color: ['#6c5ce7', '#00b894', '#e17055'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['个人均分', '班级均分', '年级均分'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value', name: '分数' },
    series: [
      { name: '个人均分', type: 'bar', data: personalScores, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '班级均分', type: 'line', data: classAvgs, smooth: true, symbol: 'circle', symbolSize: 6 },
      { name: '年级均分', type: 'line', data: gradeAvgs, smooth: true, symbol: 'circle', symbolSize: 6 },
    ],
  }
})

// 6. 与班/年级均分差值（分组柱形图）
const diffChart = computed<EChartsOption>(() => {
  const subjects = subjectNames.value
  const classDiffs: number[] = []
  const gradeDiffs: number[] = []
  for (const subj of subjects) {
    const records = studentScores.value.filter((r) => r.subject === subj)
    if (records.length) {
      const personalAvg = records.reduce((s, r) => s + r.score, 0) / records.length
      const classAvg = records.reduce((s, r) => s + r.classAvg, 0) / records.length
      const gradeAvg = records.reduce((s, r) => s + r.gradeAvg, 0) / records.length
      classDiffs.push(Math.round((personalAvg - classAvg) * 100) / 100)
      gradeDiffs.push(Math.round((personalAvg - gradeAvg) * 100) / 100)
    } else {
      classDiffs.push(0)
      gradeDiffs.push(0)
    }
  }
  return {
    color: ['#00b894', '#e17055'],
    tooltip: { trigger: 'axis', formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params]
      return items.map((p: any) => `${p.marker}${p.seriesName}: ${p.value > 0 ? '+' : ''}${p.value}`).join('<br/>')
    } },
    legend: { data: ['与班级均分差值', '与年级均分差值'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value', name: '差值' },
    series: [
      { name: '与班级均分差值', type: 'bar', data: classDiffs, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '与年级均分差值', type: 'bar', data: gradeDiffs, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
  }
})

// 7. 考试次数统计（柱形图）
const examCountChart = computed<EChartsOption>(() => {
  const subjects = subjectNames.value
  const counts = subjects.map((subj) => studentScores.value.filter((r) => r.subject === subj).length)
  return {
    color: ['#74b9ff'],
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value', name: '次数' },
    series: [
      {
        type: 'bar',
        data: counts,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#74b9ff' },
        label: { show: true, position: 'top', fontSize: 11 },
      },
    ],
  }
})

// 8. 科目方差稳定性对比（折线图）
const stabilityChart = computed<EChartsOption>(() => {
  const subjects = subjectNames.value
  const variances = subjects.map((subj) => {
    const records = studentScores.value.filter((r) => r.subject === subj)
    const scores = records.map((r) => r.score)
    const std = computeStdDev(scores)
    return Math.round(std * 100) / 100
  })
  return {
    color: ['#e17055'],
    tooltip: { trigger: 'axis', formatter: '{b}: 标准差 {c}' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value', name: '标准差' },
    series: [
      {
        type: 'line',
        data: variances,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.1 },
      },
    ],
  }
})

// 9. 各学科进退分值对比（分组柱形图）
const progressChart = computed<EChartsOption>(() => {
  const exams = examNames.value
  if (exams.length < 2) return { color: ['#6c5ce7'], tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [] }
  const subjects = subjectNames.value
  const diffsBySubject: Record<string, number> = {}

  for (const subj of subjects) {
    let totalDiff = 0
    let diffCount = 0
    for (let i = 1; i < exams.length; i++) {
      const prevRecord = studentScores.value.find((r) => r.subject === subj && r.examName === exams[i - 1])
      const currRecord = studentScores.value.find((r) => r.subject === subj && r.examName === exams[i])
      if (prevRecord && currRecord) {
        totalDiff += currRecord.score - prevRecord.score
        diffCount++
      }
    }
    diffsBySubject[subj] = diffCount > 0 ? Math.round((totalDiff / diffCount) * 100) / 100 : 0
  }

  return {
    color: ['#6c5ce7', '#e17055'],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params]
        return items.map((p: any) => `${p.marker}${p.name}: ${p.value > 0 ? '+' : ''}${p.value}`).join('<br/>')
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects },
    yAxis: { type: 'value', name: '分值变化' },
    series: [
      {
        type: 'bar',
        data: subjects.map((s) => diffsBySubject[s] ?? 0),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any): string => {
            const val = params.value as number
            return val >= 0 ? '#00b894' : '#e17055'
          },
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          formatter: (params: any) => (params.value > 0 ? `+${params.value}` : `${params.value}`),
        },
      },
    ],
  }
})
</script>

<template>
  <div class="individual-analysis">
    <!-- 筛选栏 -->
    <div class="filter-bar card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">学生：</span>
          <el-select
            v-model="selectedStudentId"
            filterable
            placeholder="选择学生"
            style="width: 200px"
            size="default"
          >
            <el-option
              v-for="s in studentStore.students"
              :key="s.id"
              :label="`${s.name}（${s.studentNo}）`"
              :value="s.id"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">考试：</span>
          <el-select
            v-model="selectedExams"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="全部考试"
            style="width: 220px"
          >
            <el-option v-for="e in scoreStore.exams" :key="e.id" :label="e.name" :value="e.name" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">科目：</span>
          <el-select
            v-model="selectedSubjects"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="全部科目"
            style="width: 280px"
          >
            <el-option v-for="s in SUBJECTS" :key="s.name" :label="s.name" :value="s.name" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 学生信息卡 -->
    <div v-if="selectedStudent" class="student-info-card card">
      <div class="info-left">
        <div class="avatar" :class="selectedStudent.gender">{{ selectedStudent.name.charAt(0) }}</div>
        <div class="info-text">
          <h2>{{ selectedStudent.name }}</h2>
          <div class="info-badges">
            <el-tag size="small">{{ selectedStudent.gender }}</el-tag>
            <el-tag size="small" type="info">{{ selectedStudent.ethnicity }}</el-tag>
            <el-tag size="small" :type="selectedStudent.status === '在读' ? 'success' : 'warning'">{{ selectedStudent.status }}</el-tag>
            <el-tag size="small" effect="plain">{{ selectedStudent.type }}</el-tag>
          </div>
          <div class="info-meta">
            <span>学号: {{ selectedStudent.studentNo }}</span>
            <span>入学成绩: {{ selectedStudent.entranceScore }}</span>
          </div>
        </div>
      </div>
      <div class="info-stats">
        <div class="istat">
          <span class="num">{{ examNames.length }}</span>
          <span class="lbl">参加考试</span>
        </div>
        <div class="istat">
          <span class="num">{{ subjectNames.length }}</span>
          <span class="lbl">涉及科目</span>
        </div>
        <div class="istat">
          <span class="num">{{ studentScores.length }}</span>
          <span class="lbl">成绩条数</span>
        </div>
      </div>
    </div>

    <!-- 三大名单 -->
    <div class="name-lists">
      <div class="name-list-card card">
        <div class="list-header excellent">
          <el-icon><Trophy /></el-icon>
          <span>优秀名单（得分率 Top 10）</span>
        </div>
        <div class="list-body">
          <div
            v-for="(item, idx) in excellentList"
            :key="item.id"
            class="name-item"
            :class="{ active: item.id === selectedStudentId }"
            @click="selectedStudentId = item.id"
          >
            <span class="rank">{{ idx + 1 }}</span>
            <span class="name">{{ item.name }}</span>
            <span class="rate">{{ item.avgRate }}%</span>
          </div>
        </div>
      </div>

      <div class="name-list-card card">
        <div class="list-header volatile">
          <el-icon><Warning /></el-icon>
          <span>波动名单（波动最大 10）</span>
        </div>
        <div class="list-body">
          <div
            v-for="(item, idx) in volatileList"
            :key="item.id"
            class="name-item"
            :class="{ active: item.id === selectedStudentId }"
            @click="selectedStudentId = item.id"
          >
            <span class="rank">{{ idx + 1 }}</span>
            <span class="name">{{ item.name }}</span>
            <span class="rate">σ{{ item.volatility }}</span>
          </div>
        </div>
      </div>

      <div class="name-list-card card">
        <div class="list-header remedial">
          <el-icon><WarningFilled /></el-icon>
          <span>补差名单（得分率后 10）</span>
        </div>
        <div class="list-body">
          <div
            v-for="(item, idx) in remedialList"
            :key="item.id"
            class="name-item"
            :class="{ active: item.id === selectedStudentId }"
            @click="selectedStudentId = item.id"
          >
            <span class="rank">{{ idx + 1 }}</span>
            <span class="name">{{ item.name }}</span>
            <span class="rate">{{ item.avgRate }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表网格 -->
    <div class="chart-grid">
      <div class="chart-card card">
        <div class="chart-title">总体得分与得分率动态对比</div>
        <ChartContainer :option="totalScoreRateChart" height="300px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">科目得分与得分率横向对比</div>
        <ChartContainer :option="subjectScoreRateChart" height="300px" />
      </div>
      <div class="chart-card card full">
        <div class="chart-title">科目得分率动态对比</div>
        <ChartContainer :option="subjectTrendChart" height="300px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">偏科分析（雷达图）</div>
        <ChartContainer :option="radarChart" height="300px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">个人成绩与班/年级均分距离</div>
        <ChartContainer :option="compareAvgChart" height="300px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">与班/年级均分差值</div>
        <ChartContainer :option="diffChart" height="300px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">考试次数统计</div>
        <ChartContainer :option="examCountChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">科目方差稳定性对比</div>
        <ChartContainer :option="stabilityChart" height="280px" />
      </div>
      <div class="chart-card card full">
        <div class="chart-title">各学科进退分值对比</div>
        <ChartContainer :option="progressChart" height="280px" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.individual-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-bar {
  padding: 14px 18px;

  .filter-row {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .filter-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
    }
  }
}

.student-info-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;

  .info-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-color);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
      flex-shrink: 0;

      &.女 { background: #e84393; }
    }

    .info-text {
      h2 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 6px;
      }

      .info-badges {
        display: flex;
        gap: 6px;
        margin-bottom: 6px;
      }

      .info-meta {
        display: flex;
        gap: 16px;
        font-size: 13px;
        color: var(--text-regular);
      }
    }
  }

  .info-stats {
    display: flex;
    gap: 20px;

    .istat {
      text-align: center;
      .num {
        display: block;
        font-size: 24px;
        font-weight: 700;
        color: var(--primary-color);
      }
      .lbl {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }
  }
}

.name-lists {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  .name-list-card {
    .list-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      border-bottom: 1px solid var(--border-color);

      &.excellent { color: #00b894; }
      &.volatile { color: #fdcb6e; }
      &.remedial { color: #e17055; }
    }

    .list-body {
      max-height: 280px;
      overflow-y: auto;
    }

    .name-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      transition: background 0.15s;
      font-size: 13px;

      &:hover { background: var(--primary-bg); }

      &.active {
        background: var(--primary-bg);
        font-weight: 600;
      }

      .rank {
        width: 24px;
        color: var(--text-secondary);
        font-weight: 600;
      }

      .name {
        flex: 1;
        color: var(--text-primary);
      }

      .rate {
        color: var(--primary-color);
        font-weight: 600;
      }
    }
  }
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  .chart-card {
    .chart-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
      padding-left: 4px;
    }

    &.full {
      grid-column: 1 / -1;
    }
  }
}

@media (max-width: 1200px) {
  .name-lists { grid-template-columns: 1fr; }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
