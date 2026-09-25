<script setup lang="ts">
import { computed, ref } from 'vue'
import { useScoreStore } from '@/stores/score'
import { useStudentStore } from '@/stores/student'
import type { EvaluationLevel, Gender, StudentType } from '@/types'
import { SUBJECTS, EVALUATIONS, calcScoreRate } from '@/utils/constants'
import type { EChartsOption } from 'echarts'
import ChartContainer from '@/components/charts/ChartContainer.vue'

const scoreStore = useScoreStore()
const studentStore = useStudentStore()

// ===== 筛选器 =====
const selectedExam = ref(scoreStore.exams[0]?.name ?? '')
const selectedEvaluations = ref<EvaluationLevel[]>([])
const selectedGenders = ref<Gender[]>([])
const selectedTypes = ref<StudentType[]>([])
const selectedSubjects = ref<string[]>([])

// 筛选后的成绩数据
const filteredScores = computed(() => {
  return scoreStore.scores.filter((r) => {
    if (r.examName !== selectedExam.value) return false
    if (selectedEvaluations.value.length && !selectedEvaluations.value.includes(r.evaluation)) return false
    if (selectedGenders.value.length && !selectedGenders.value.includes(r.gender)) return false
    if (selectedTypes.value.length && !selectedTypes.value.includes(r.studentType)) return false
    if (selectedSubjects.value.length && !selectedSubjects.value.includes(r.subject)) return false
    return true
  })
})

// 当前考试的科目列表
const examSubjects = computed(() => {
  const subs = new Set(
    scoreStore.scores.filter((r) => r.examName === selectedExam.value).map((r) => r.subject),
  )
  return Array.from(subs)
})

// 筛选后学生人数
const filteredStudentCount = computed(() => {
  const names = new Set(filteredScores.value.map((r) => r.studentName))
  return names.size
})

function resetFilter() {
  selectedEvaluations.value = []
  selectedGenders.value = []
  selectedTypes.value = []
  selectedSubjects.value = []
}

// ===== 统计数据 =====
const classAvgBySubject = computed(() => {
  const map = new Map<string, number>()
  for (const subject of examSubjects.value) {
    const records = filteredScores.value.filter((r) => r.subject === subject)
    if (records.length) {
      map.set(subject, Math.round((records.reduce((s, r) => s + r.score, 0) / records.length) * 100) / 100)
    }
  }
  return map
})

const gradeAvgBySubject = computed(() => {
  const map = new Map<string, number>()
  for (const subject of examSubjects.value) {
    const records = filteredScores.value.filter((r) => r.subject === subject)
    if (records.length) {
      map.set(subject, Math.round((records.reduce((s, r) => s + r.gradeAvg, 0) / records.length) * 100) / 100)
    }
  }
  return map
})

const scoreRateBySubject = computed(() => {
  const map = new Map<string, number>()
  for (const subject of examSubjects.value) {
    const records = filteredScores.value.filter((r) => r.subject === subject)
    if (records.length) {
      const totalRate = records.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0)
      map.set(subject, Math.round((totalRate / records.length) * 10000) / 100)
    }
  }
  return map
})

const evaluationDistribution = computed(() => {
  const counts: Record<string, number> = {}
  for (const e of EVALUATIONS) counts[e.name] = 0
  for (const r of filteredScores.value) {
    counts[r.evaluation] = (counts[r.evaluation] ?? 0) + 1
  }
  return counts
})

const genderScoreRate = computed(() => {
  const result: { male: number; female: number } = { male: 0, female: 0 }
  const maleRecords = filteredScores.value.filter((r) => r.gender === '男')
  const femaleRecords = filteredScores.value.filter((r) => r.gender === '女')
  if (maleRecords.length) {
    result.male = Math.round(
      (maleRecords.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / maleRecords.length) * 10000,
    ) / 100
  }
  if (femaleRecords.length) {
    result.female = Math.round(
      (femaleRecords.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / femaleRecords.length) * 10000,
    ) / 100
  }
  return result
})

const typeDistribution = computed(() => {
  const counts: Record<string, number> = {}
  for (const r of filteredScores.value) {
    const name = r.studentName
    if (!counts[name]) {
      counts[name] = 0
    }
  }
  // Count unique students by type
  const typeMap = new Map<string, number>()
  const seen = new Set<string>()
  for (const r of filteredScores.value) {
    if (seen.has(r.studentName)) continue
    seen.add(r.studentName)
    typeMap.set(r.studentType, (typeMap.get(r.studentType) ?? 0) + 1)
  }
  return Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }))
})

// 学生总分排名
const studentTotalRank = computed(() => {
  const studentMap = new Map<string, { name: string; gender: string; total: number; count: number }>()
  for (const r of filteredScores.value) {
    if (selectedSubjects.value.length && !selectedSubjects.value.includes(r.subject)) continue
    const existing = studentMap.get(r.studentName) ?? { name: r.studentName, gender: r.gender, total: 0, count: 0 }
    existing.total += r.score
    existing.count++
    studentMap.set(r.studentName, existing)
  }
  return Array.from(studentMap.values())
    .map((s) => ({ ...s, avg: s.count > 0 ? Math.round((s.total / s.count) * 100) / 100 : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)
})

// 科目雷达图（前5名 vs 后5名）
const subjectRadar = computed(() => {
  const ranked = studentTotalRank.value
  if (ranked.length < 2) return null
  const top5 = ranked.slice(0, 5)
  const bottom5 = ranked.slice(-5)

  const radarData: Record<string, { topAvg: number; bottomAvg: number }> = {}
  for (const subj of examSubjects.value) {
    const subjConfig = SUBJECTS.find((s) => s.name === subj)
    const fullScore = subjConfig?.fullScore ?? 100

    const topScores: number[] = []
    const bottomScores: number[] = []

    for (const student of top5) {
      const record = filteredScores.value.find(
        (r) => r.studentName === student.name && r.subject === subj,
      )
      if (record) topScores.push(calcScoreRate(record.score, record.fullScore) * 100)
    }
    for (const student of bottom5) {
      const record = filteredScores.value.find(
        (r) => r.studentName === student.name && r.subject === subj,
      )
      if (record) bottomScores.push(calcScoreRate(record.score, record.fullScore) * 100)
    }

    radarData[subj] = {
      topAvg: topScores.length ? Math.round((topScores.reduce((s, v) => s + v, 0) / topScores.length) * 100) / 100 : 0,
      bottomAvg: bottomScores.length ? Math.round((bottomScores.reduce((s, v) => s + v, 0) / bottomScores.length) * 100) / 100 : 0,
    }
    // Suppress unused var
    void fullScore
  }

  return radarData
})

// ===== ECharts 配置 =====
const colorPalette = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#e84393', '#0984e3', '#fd79a8']

// 1. 班级均分 vs 年级均分（柱状图）
const classVsGradeChart = computed<EChartsOption>(() => {
  const subjects = Array.from(classAvgBySubject.value.keys())
  return {
    color: colorPalette,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['班级均分', '年级均分'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '分数' },
    series: [
      {
        name: '班级均分',
        type: 'bar',
        data: subjects.map((s) => classAvgBySubject.value.get(s) ?? 0),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '年级均分',
        type: 'bar',
        data: subjects.map((s) => gradeAvgBySubject.value.get(s) ?? 0),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
})

// 2. 各科得分率（条形图）
const scoreRateChart = computed<EChartsOption>(() => {
  const subjects = Array.from(scoreRateBySubject.value.keys())
  return {
    color: colorPalette,
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: subjects, axisLabel: { fontSize: 11 } },
    series: [
      {
        type: 'bar',
        data: subjects.map((s) => scoreRateBySubject.value.get(s) ?? 0),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: '#6c5ce7',
        },
        label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11 },
      },
    ],
  }
})

// 3. 评价等级分布（饼图）
const evaluationPieChart = computed<EChartsOption>(() => {
  const dist = evaluationDistribution.value
  return {
    color: ['#00b894', '#fdcb6e', '#74b9ff', '#e17055'],
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
        data: Object.entries(dist)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => ({ name: k, value: v })),
      },
    ],
  }
})

// 4. 性别得分率对比（柱状图）
const genderChart = computed<EChartsOption>(() => {
  const subjects = Array.from(scoreRateBySubject.value.keys())
  const maleData: number[] = []
  const femaleData: number[] = []
  for (const subj of subjects) {
    const maleRecords = filteredScores.value.filter((r) => r.subject === subj && r.gender === '男')
    const femaleRecords = filteredScores.value.filter((r) => r.subject === subj && r.gender === '女')
    maleData.push(
      maleRecords.length
        ? Math.round(
            (maleRecords.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / maleRecords.length) * 10000,
          ) / 100
        : 0,
    )
    femaleData.push(
      femaleRecords.length
        ? Math.round(
            (femaleRecords.reduce((s, r) => s + calcScoreRate(r.score, r.fullScore), 0) / femaleRecords.length) * 10000,
          ) / 100
        : 0,
    )
  }
  return {
    color: ['#0984e3', '#e84393'],
    tooltip: { trigger: 'axis', formatter: '{a}: {c}%' },
    legend: { data: ['男生得分率', '女生得分率'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: subjects, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      { name: '男生得分率', type: 'bar', data: maleData, itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '女生得分率', type: 'bar', data: femaleData, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
  }
})

// 5. 学生类型分布（饼图）
const typePieChart = computed<EChartsOption>(() => {
  return {
    color: colorPalette,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
        data: typeDistribution.value,
      },
    ],
  }
})

// 6. 学生总分排名 Top 20（横向条形图）
const rankChart = computed<EChartsOption>(() => {
  const ranked = studentTotalRank.value
  return {
    color: ['#6c5ce7'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.name}: ${p.value} 分`
      },
    },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', name: '总分' },
    yAxis: {
      type: 'category',
      data: ranked.map((s) => s.name).reverse(),
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: ranked.map((s) => s.total).reverse(),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: (params: any): string => {
            const colors = ['#6c5ce7', '#a29bfe', '#fdcb6e', '#fd79a8', '#e17055', '#00b894']
            return colors[params.dataIndex % colors.length] ?? '#6c5ce7'
          },
        },
        label: { show: true, position: 'right', fontSize: 11 },
      },
    ],
  }
})

// 7. 科目雷达图（Top5 vs Bottom5）
const radarChart = computed<EChartsOption>(() => {
  const radar = subjectRadar.value
  if (!radar) return {}
  const subjects = Object.keys(radar)
  return {
    color: ['#00b894', '#e17055'],
    tooltip: { trigger: 'item' },
    legend: { data: ['Top5 平均得分率', 'Bottom5 平均得分率'], bottom: 0 },
    radar: {
      indicator: subjects.map((s) => ({ name: s, max: 100 })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: { fontSize: 11 },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: subjects.map((s) => radar[s]?.topAvg ?? 0),
            name: 'Top5 平均得分率',
            areaStyle: { opacity: 0.2 },
          },
          {
            value: subjects.map((s) => radar[s]?.bottomAvg ?? 0),
            name: 'Bottom5 平均得分率',
            areaStyle: { opacity: 0.2 },
          },
        ],
      },
    ],
  }
})

// 8. 各科得分率箱型替代（散点图 - 分数分布）
const scatterChart = computed<EChartsOption>(() => {
  const data = filteredScores.value.map((r) => ({
    value: [examSubjects.value.indexOf(r.subject), r.score, r.studentName, r.fullScore],
  }))
  return {
    color: ['#6c5ce7'],
    tooltip: {
      formatter: (params: any) => {
        const d = params.value
        return `${d[2]} - ${examSubjects.value[d[0]]}<br/>分数: ${d[1]}/${d[3]}`
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: examSubjects.value,
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: '分数' },
    series: [
      {
        type: 'scatter',
        data,
        symbolSize: 8,
        itemStyle: { opacity: 0.6 },
      },
    ],
  }
})
</script>

<template>
  <div class="class-analysis">
    <!-- 筛选栏 -->
    <div class="filter-bar card">
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">考试：</span>
          <el-select v-model="selectedExam" size="small" style="width: 140px">
            <el-option v-for="e in scoreStore.exams" :key="e.id" :label="e.name" :value="e.name" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">评价：</span>
          <el-checkbox-group v-model="selectedEvaluations" size="small">
            <el-checkbox-button v-for="e in EVALUATIONS" :key="e.id" :label="e.name" :value="e.name">
              {{ e.name }}
            </el-checkbox-button>
          </el-checkbox-group>
        </div>
        <div class="filter-item">
          <span class="filter-label">性别：</span>
          <el-checkbox-group v-model="selectedGenders" size="small">
            <el-checkbox-button label="男" value="男">男</el-checkbox-button>
            <el-checkbox-button label="女" value="女">女</el-checkbox-button>
          </el-checkbox-group>
        </div>
      </div>
      <div class="filter-row">
        <div class="filter-item">
          <span class="filter-label">类型：</span>
          <el-checkbox-group v-model="selectedTypes" size="small">
            <el-checkbox-button v-for="t in ['普高生', '艺术生', '体育生']" :key="t" :label="t" :value="t">
              {{ t }}
            </el-checkbox-button>
          </el-checkbox-group>
        </div>
        <div class="filter-item">
          <span class="filter-label">科目：</span>
          <el-select
            v-model="selectedSubjects"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="全部科目"
            size="small"
            style="width: 260px"
          >
            <el-option v-for="s in SUBJECTS" :key="s.name" :label="s.name" :value="s.name" />
          </el-select>
        </div>
        <el-button size="small" @click="resetFilter">重置筛选</el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-value">{{ filteredStudentCount }}</div>
        <div class="stat-label">筛选人数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ filteredScores.length }}</div>
        <div class="stat-label">成绩条数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value male-color">{{ genderScoreRate.male }}%</div>
        <div class="stat-label">男生得分率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value female-color">{{ genderScoreRate.female }}%</div>
        <div class="stat-label">女生得分率</div>
      </div>
    </div>

    <!-- 图表网格 -->
    <div class="chart-grid">
      <div class="chart-card card">
        <div class="chart-title">班级均分 vs 年级均分</div>
        <ChartContainer :option="classVsGradeChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">各科得分率</div>
        <ChartContainer :option="scoreRateChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">评价等级分布</div>
        <ChartContainer :option="evaluationPieChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">性别得分率对比</div>
        <ChartContainer :option="genderChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">学生类型分布</div>
        <ChartContainer :option="typePieChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">总分排名 Top 20</div>
        <ChartContainer :option="rankChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">Top5 vs Bottom5 科目雷达</div>
        <ChartContainer :option="radarChart" height="280px" />
      </div>
      <div class="chart-card card">
        <div class="chart-title">各科成绩散点分布</div>
        <ChartContainer :option="scatterChart" height="280px" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.class-analysis {
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
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }
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

.stat-row {
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

      &.male-color { color: #0984e3; }
      &.female-color { color: #e84393; }
    }
    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
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
  }
}

@media (max-width: 1200px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
