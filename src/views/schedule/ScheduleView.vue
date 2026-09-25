<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, EditPen, Close, FolderOpened, CopyDocument, Delete, Rank } from '@element-plus/icons-vue'
import type { ScheduleItem } from '@/types'

// ===== 模板类型 =====
interface ScheduleTemplate {
  name: string
  createdAt: string
  data: ScheduleItem[]
}

const TEMPLATE_KEY = 'schedule-templates'

function loadTemplates(): ScheduleTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    return raw ? (JSON.parse(raw) as ScheduleTemplate[]) : []
  } catch {
    return []
  }
}

function saveTemplates(list: ScheduleTemplate[]) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(list))
}

// ===== 节次结构（时段分色）=====
interface PeriodConfig {
  /** 节次名称 */
  period: string
  /** 时间段 */
  timeRange: string
  /** 时段类型 */
  timeSlot: '早读' | '上午' | '午休' | '下午' | '晚自习'
}

const PERIODS: PeriodConfig[] = [
  { period: '早读', timeRange: '7:30-8:00', timeSlot: '早读' },
  { period: '第一节', timeRange: '8:00-8:45', timeSlot: '上午' },
  { period: '第二节', timeRange: '8:55-9:40', timeSlot: '上午' },
  { period: '第三节', timeRange: '10:00-10:45', timeSlot: '上午' },
  { period: '第四节', timeRange: '10:55-11:40', timeSlot: '上午' },
  { period: '午休', timeRange: '12:00-13:30', timeSlot: '午休' },
  { period: '第五节', timeRange: '14:00-14:45', timeSlot: '下午' },
  { period: '第六节', timeRange: '14:55-15:40', timeSlot: '下午' },
  { period: '第七节', timeRange: '16:00-16:45', timeSlot: '下午' },
  { period: '第八节', timeRange: '16:55-17:40', timeSlot: '下午' },
  { period: '晚自习1', timeRange: '19:00-19:50', timeSlot: '晚自习' },
  { period: '晚自习2', timeRange: '20:00-20:50', timeSlot: '晚自习' },
  { period: '晚自习3', timeRange: '21:00-21:50', timeSlot: '晚自习' },
]

/** 星期列背景色（周一~周五不同色） */
const WEEKDAY_COLORS = ['#fdf2f2', '#fef7e6', '#eef9f2', '#e8f4fd', '#f5effd'] // 浅红→浅橙→浅绿→浅蓝→浅紫

/** 行背景色（按时段） */
const SLOT_COLORS: Record<PeriodConfig['timeSlot'], string> = {
  早读: '#f8f9fa', // 浅灰白
  上午: '#fdf6d8', // 浅黄
  午休: '#f8f9fa', // 浅灰白
  下午: '#dceafd', // 浅蓝
  晚自习: '#d9f2e6', // 浅绿
}

// ===== 默认课程 =====
const SUBJECTS = ['语文', '数学', '外语', '物理', '化学', '生物', '历史', '地理', '政治', '班会', '自习']

/** 默认课表（周一~周五，13节次） */
const DEFAULT_SCHEDULE: ScheduleItem[] = [
  // 周一
  { period: '早读', timeRange: '7:30-8:00', weekday: 1, subject: '语文', timeSlot: '早读' },
  { period: '第一节', timeRange: '8:00-8:45', weekday: 1, subject: '数学', timeSlot: '上午' },
  { period: '第二节', timeRange: '8:55-9:40', weekday: 1, subject: '语文', timeSlot: '上午' },
  { period: '第三节', timeRange: '10:00-10:45', weekday: 1, subject: '外语', timeSlot: '上午' },
  { period: '第四节', timeRange: '10:55-11:40', weekday: 1, subject: '物理', timeSlot: '上午' },
  { period: '午休', timeRange: '12:00-13:30', weekday: 1, subject: '午休', timeSlot: '午休' },
  { period: '第五节', timeRange: '14:00-14:45', weekday: 1, subject: '化学', timeSlot: '下午' },
  { period: '第六节', timeRange: '14:55-15:40', weekday: 1, subject: '生物', timeSlot: '下午' },
  { period: '第七节', timeRange: '16:00-16:45', weekday: 1, subject: '历史', timeSlot: '下午' },
  { period: '第八节', timeRange: '16:55-17:40', weekday: 1, subject: '体育', timeSlot: '下午' },
  { period: '晚自习1', timeRange: '19:00-19:50', weekday: 1, subject: '数学', timeSlot: '晚自习' },
  { period: '晚自习2', timeRange: '20:00-20:50', weekday: 1, subject: '外语', timeSlot: '晚自习' },
  { period: '晚自习3', timeRange: '21:00-21:50', weekday: 1, subject: '自习', timeSlot: '晚自习' },
  // 周二
  { period: '早读', timeRange: '7:30-8:00', weekday: 2, subject: '外语', timeSlot: '早读' },
  { period: '第一节', timeRange: '8:00-8:45', weekday: 2, subject: '语文', timeSlot: '上午' },
  { period: '第二节', timeRange: '8:55-9:40', weekday: 2, subject: '数学', timeSlot: '上午' },
  { period: '第三节', timeRange: '10:00-10:45', weekday: 2, subject: '外语', timeSlot: '上午' },
  { period: '第四节', timeRange: '10:55-11:40', weekday: 2, subject: '数学', timeSlot: '上午' },
  { period: '午休', timeRange: '12:00-13:30', weekday: 2, subject: '午休', timeSlot: '午休' },
  { period: '第五节', timeRange: '14:00-14:45', weekday: 2, subject: '物理', timeSlot: '下午' },
  { period: '第六节', timeRange: '14:55-15:40', weekday: 2, subject: '化学', timeSlot: '下午' },
  { period: '第七节', timeRange: '16:00-16:45', weekday: 2, subject: '政治', timeSlot: '下午' },
  { period: '第八节', timeRange: '16:55-17:40', weekday: 2, subject: '地理', timeSlot: '下午' },
  { period: '晚自习1', timeRange: '19:00-19:50', weekday: 2, subject: '物理', timeSlot: '晚自习' },
  { period: '晚自习2', timeRange: '20:00-20:50', weekday: 2, subject: '化学', timeSlot: '晚自习' },
  { period: '晚自习3', timeRange: '21:00-21:50', weekday: 2, subject: '自习', timeSlot: '晚自习' },
  // 周三
  { period: '早读', timeRange: '7:30-8:00', weekday: 3, subject: '语文', timeSlot: '早读' },
  { period: '第一节', timeRange: '8:00-8:45', weekday: 3, subject: '数学', timeSlot: '上午' },
  { period: '第二节', timeRange: '8:55-9:40', weekday: 3, subject: '外语', timeSlot: '上午' },
  { period: '第三节', timeRange: '10:00-10:45', weekday: 3, subject: '语文', timeSlot: '上午' },
  { period: '第四节', timeRange: '10:55-11:40', weekday: 3, subject: '生物', timeSlot: '上午' },
  { period: '午休', timeRange: '12:00-13:30', weekday: 3, subject: '午休', timeSlot: '午休' },
  { period: '第五节', timeRange: '14:00-14:45', weekday: 3, subject: '历史', timeSlot: '下午' },
  { period: '第六节', timeRange: '14:55-15:40', weekday: 3, subject: '地理', timeSlot: '下午' },
  { period: '第七节', timeRange: '16:00-16:45', weekday: 3, subject: '班会', timeSlot: '下午' },
  { period: '第八节', timeRange: '16:55-17:40', weekday: 3, subject: '体育', timeSlot: '下午' },
  { period: '晚自习1', timeRange: '19:00-19:50', weekday: 3, subject: '数学', timeSlot: '晚自习' },
  { period: '晚自习2', timeRange: '20:00-20:50', weekday: 3, subject: '外语', timeSlot: '晚自习' },
  { period: '晚自习3', timeRange: '21:00-21:50', weekday: 3, subject: '自习', timeSlot: '晚自习' },
  // 周四
  { period: '早读', timeRange: '7:30-8:00', weekday: 4, subject: '外语', timeSlot: '早读' },
  { period: '第一节', timeRange: '8:00-8:45', weekday: 4, subject: '语文', timeSlot: '上午' },
  { period: '第二节', timeRange: '8:55-9:40', weekday: 4, subject: '数学', timeSlot: '上午' },
  { period: '第三节', timeRange: '10:00-10:45', weekday: 4, subject: '外语', timeSlot: '上午' },
  { period: '第四节', timeRange: '10:55-11:40', weekday: 4, subject: '物理', timeSlot: '上午' },
  { period: '午休', timeRange: '12:00-13:30', weekday: 4, subject: '午休', timeSlot: '午休' },
  { period: '第五节', timeRange: '14:00-14:45', weekday: 4, subject: '化学', timeSlot: '下午' },
  { period: '第六节', timeRange: '14:55-15:40', weekday: 4, subject: '政治', timeSlot: '下午' },
  { period: '第七节', timeRange: '16:00-16:45', weekday: 4, subject: '生物', timeSlot: '下午' },
  { period: '第八节', timeRange: '16:55-17:40', weekday: 4, subject: '地理', timeSlot: '下午' },
  { period: '晚自习1', timeRange: '19:00-19:50', weekday: 4, subject: '语文', timeSlot: '晚自习' },
  { period: '晚自习2', timeRange: '20:00-20:50', weekday: 4, subject: '数学', timeSlot: '晚自习' },
  { period: '晚自习3', timeRange: '21:00-21:50', weekday: 4, subject: '自习', timeSlot: '晚自习' },
  // 周五
  { period: '早读', timeRange: '7:30-8:00', weekday: 5, subject: '语文', timeSlot: '早读' },
  { period: '第一节', timeRange: '8:00-8:45', weekday: 5, subject: '数学', timeSlot: '上午' },
  { period: '第二节', timeRange: '8:55-9:40', weekday: 5, subject: '外语', timeSlot: '上午' },
  { period: '第三节', timeRange: '10:00-10:45', weekday: 5, subject: '语文', timeSlot: '上午' },
  { period: '第四节', timeRange: '10:55-11:40', weekday: 5, subject: '数学', timeSlot: '上午' },
  { period: '午休', timeRange: '12:00-13:30', weekday: 5, subject: '午休', timeSlot: '午休' },
  { period: '第五节', timeRange: '14:00-14:45', weekday: 5, subject: '物理', timeSlot: '下午' },
  { period: '第六节', timeRange: '14:55-15:40', weekday: 5, subject: '化学', timeSlot: '下午' },
  { period: '第七节', timeRange: '16:00-16:45', weekday: 5, subject: '历史', timeSlot: '下午' },
  { period: '第八节', timeRange: '16:55-17:40', weekday: 5, subject: '班会', timeSlot: '下午' },
  { period: '晚自习1', timeRange: '19:00-19:50', weekday: 5, subject: '外语', timeSlot: '晚自习' },
  { period: '晚自习2', timeRange: '20:00-20:50', weekday: 5, subject: '政治', timeSlot: '晚自习' },
  { period: '晚自习3', timeRange: '21:00-21:50', weekday: 5, subject: '自习', timeSlot: '晚自习' },
]

// ===== 课表数据 =====
const schedule = ref<ScheduleItem[]>([...DEFAULT_SCHEDULE])

// ===== 拖拽调课 =====
const dragSourceKey = ref<string | null>(null)
const dragOverKey = ref<string>('')

/** 拖拽开始 */
function onDragStartCourse(weekday: number, period: string) {
  if (!isEditable(period)) return
  dragSourceKey.value = cellKey(weekday, period)
}

/** 拖拽悬浮 */
function onDragOverCourse(weekday: number, period: string) {
  if (!isEditable(period)) return
  dragOverKey.value = cellKey(weekday, period)
}

/** 拖拽放下：交换两格课程 */
function onDropCourse(weekday: number, period: string) {
  if (!dragSourceKey.value || !isEditable(period)) {
    dragSourceKey.value = null
    dragOverKey.value = ''
    return
  }
  const targetKey = cellKey(weekday, period)
  if (dragSourceKey.value === targetKey) {
    dragSourceKey.value = null
    dragOverKey.value = ''
    return
  }
  // 解析源/目标
  const [srcWeek, srcPeriod] = dragSourceKey.value.split('-')
  const srcItem = schedule.value.find(
    (s) => s.weekday === Number(srcWeek) && s.period === srcPeriod,
  )
  const tgtItem = schedule.value.find(
    (s) => s.weekday === weekday && s.period === period,
  )
  if (srcItem && tgtItem) {
    // 交换 subject
    const tmp = srcItem.subject
    srcItem.subject = tgtItem.subject
    tgtItem.subject = tmp
    ElMessage.success('课程已交换')
  } else if (srcItem && !tgtItem) {
    // 移动到空格
    const periodConfig = PERIODS.find((p) => p.period === period)
    schedule.value.push({
      period,
      timeRange: periodConfig?.timeRange ?? '',
      weekday,
      subject: srcItem.subject,
      timeSlot: periodConfig?.timeSlot ?? '上午',
    })
    srcItem.subject = '—'
    ElMessage.success('课程已移动')
  }
  dragSourceKey.value = null
  dragOverKey.value = ''
}

// ===== 模板管理 =====
const templates = ref<ScheduleTemplate[]>(loadTemplates())
const templateDialog = ref(false)
const newTemplateName = ref('')

function openTemplateDialog() {
  newTemplateName.value = ''
  templateDialog.value = true
}

function saveTemplate() {
  const name = newTemplateName.value.trim()
  if (!name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  templates.value.push({
    name,
    createdAt: new Date().toLocaleString('zh-CN'),
    data: schedule.value.map((s) => ({ ...s })),
  })
  saveTemplates(templates.value)
  templateDialog.value = false
  ElMessage.success(`模板「${name}」已保存`)
}

function loadTemplate(idx: number) {
  const tpl = templates.value[idx]
  if (!tpl) return
  ElMessageBox.confirm(`确定加载模板「${tpl.name}」？当前课表将被覆盖。`, '加载模板', {
    type: 'warning',
    confirmButtonText: '加载',
    cancelButtonText: '取消',
  })
    .then(() => {
      schedule.value = tpl.data.map((s) => ({ ...s }))
      ElMessage.success(`已加载模板「${tpl.name}」`)
    })
    .catch(() => {})
}

function deleteTemplate(idx: number) {
  const tpl = templates.value[idx]
  if (!tpl) return
  ElMessageBox.confirm(`确定删除模板「${tpl.name}」？`, '删除模板', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(() => {
      templates.value.splice(idx, 1)
      saveTemplates(templates.value)
      ElMessage.success(`已删除模板「${tpl.name}」`)
    })
    .catch(() => {})
}

// ===== 编辑状态 =====
const editingKey = ref<string | null>(null) // `${weekday}-${period}`
const editingValue = ref('')
const editingType = ref<'select' | 'input'>('select')

/** 单元格 key */
function cellKey(weekday: number, period: string) {
  return `${weekday}-${period}`
}

/** 获取某单元格课程 */
function getSubject(weekday: number, period: string) {
  return schedule.value.find(
    (s) => s.weekday === weekday && s.period === period,
  )?.subject ?? '—'
}

/** 该单元格是否可编辑（午休不可编辑） */
function isEditable(period: string) {
  return period !== '午休'
}

/** 开始编辑 */
function startEdit(weekday: number, period: string) {
  if (!isEditable(period)) return
  editingKey.value = cellKey(weekday, period)
  editingValue.value = getSubject(weekday, period) === '—' ? '' : getSubject(weekday, period)
  editingType.value = 'select'
}

/** 确认编辑 */
function confirmEdit(weekday: number, period: string) {
  if (editingKey.value !== cellKey(weekday, period)) return
  const value = editingValue.value.trim()
  if (value) {
    const item = schedule.value.find(
      (s) => s.weekday === weekday && s.period === period,
    )
    if (item) {
      item.subject = value
    } else {
      // 新增
      const periodConfig = PERIODS.find((p) => p.period === period)
      schedule.value.push({
        period,
        timeRange: periodConfig?.timeRange ?? '',
        weekday,
        subject: value,
        timeSlot: periodConfig?.timeSlot ?? '上午',
      })
    }
    ElMessage.success(`已将${period}（周${WEEKDAYS[weekday - 1]}）设为「${value}」`)
  }
  editingKey.value = null
}

/** 取消编辑 */
function cancelEdit() {
  editingKey.value = null
}

/** 重置为默认课表 */
function resetSchedule() {
  schedule.value = [...DEFAULT_SCHEDULE]
  editingKey.value = null
  ElMessage.success('已恢复默认课表')
}

// ===== 工具 =====
const WEEKDAYS = ['一', '二', '三', '四', '五']
const WEEKDAY_NAMES = WEEKDAYS.map((d) => `星期${d}`)

/** 按周统计各科节数 */
const subjectStats = computed(() => {
  const map = new Map<string, number>()
  for (const item of schedule.value) {
    if (item.subject === '午休' || item.subject === '—') continue
    map.set(item.subject, (map.get(item.subject) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})
</script>

<template>
  <div class="schedule-view">
    <!-- 操作区 -->
    <div class="actions card">
      <div class="action-left">
        <span class="tip">点击单元格修改课程，拖拽课程格可跨时段交换</span>
      </div>
      <div class="action-right">
        <el-button size="small" @click="openTemplateDialog">
          <el-icon><CopyDocument /></el-icon> 保存模板
        </el-button>
        <el-dropdown v-if="templates.length" trigger="click" @command="loadTemplate">
          <el-button size="small">
            <el-icon><FolderOpened /></el-icon> 加载模板
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="(tpl, idx) in templates"
                :key="idx"
                :command="idx"
              >
                {{ tpl.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="danger" plain @click="resetSchedule">
          <el-icon><Refresh /></el-icon> 恢复默认
        </el-button>
      </div>
    </div>

    <!-- 课表主体 -->
    <div class="schedule-card card">
      <h2 class="schedule-title">班级课程表</h2>

      <div class="schedule-grid">
        <!-- 表头 -->
        <div class="schedule-row header-row">
          <div class="period-col">节次</div>
          <div class="time-col">时间</div>
          <div
            v-for="(day, idx) in WEEKDAY_NAMES"
            :key="day"
            class="day-col"
            :style="{ background: WEEKDAY_COLORS[idx] }"
          >
            {{ day }}
          </div>
        </div>

        <!-- 主体行 -->
        <div
          v-for="periodConfig in PERIODS"
          :key="periodConfig.period"
          class="schedule-row"
          :style="{ background: SLOT_COLORS[periodConfig.timeSlot] }"
          :class="{ 'merged-row': periodConfig.timeSlot === '午休' }"
        >
          <!-- 节次 + 时间 -->
          <div class="period-col">
            <div class="period-name">{{ periodConfig.period }}</div>
          </div>
          <div class="time-col">
            <div class="period-time">{{ periodConfig.timeRange }}</div>
          </div>

          <!-- 周一到周五单元格 -->
          <div
            v-for="weekday in 5"
            :key="weekday"
            class="day-col course-cell"
            :class="{
              'editing': editingKey === cellKey(weekday, periodConfig.period),
              'non-editable': !isEditable(periodConfig.period),
              'drag-source': dragSourceKey === cellKey(weekday, periodConfig.period),
              'drag-over': dragOverKey === cellKey(weekday, periodConfig.period) && dragSourceKey !== cellKey(weekday, periodConfig.period),
            }"
            :style="{ background: WEEKDAY_COLORS[weekday - 1] }"
            draggable="true"
            @click="startEdit(weekday, periodConfig.period)"
            @dragstart="onDragStartCourse(weekday, periodConfig.period)"
            @dragover.prevent="onDragOverCourse(weekday, periodConfig.period)"
            @drop.prevent="onDropCourse(weekday, periodConfig.period)"
          >
            <!-- 编辑态 -->
            <template v-if="editingKey === cellKey(weekday, periodConfig.period)">
              <div class="edit-wrap">
                <el-select
                  v-model="editingValue"
                  size="small"
                  filterable
                  allow-create
                  default-first-option
                  class="course-select"
                  @change="confirmEdit(weekday, periodConfig.period)"
                >
                  <el-option v-for="s in SUBJECTS" :key="s" :label="s" :value="s" />
                </el-select>
                <el-icon class="edit-cancel" :size="14" @click.stop="cancelEdit">
                  <Close />
                </el-icon>
              </div>
            </template>
            <!-- 显示态 -->
            <template v-else>
              <span v-if="periodConfig.period === '午休'" class="lunch-text">午 休</span>
              <template v-else>
                <span class="course-text">{{ getSubject(weekday, periodConfig.period) }}</span>
                <el-icon
                  v-if="isEditable(periodConfig.period)"
                  class="hover-edit"
                  :size="12"
                  @click.stop="startEdit(weekday, periodConfig.period)"
                >
                  <EditPen />
                </el-icon>
              </template>
            </template>
          </div>
        </div>
      </div>

      <!-- 课程统计 -->
      <div class="subject-stats">
        <h4>一周课程统计</h4>
        <div class="stats-list">
          <span
            v-for="[subject, count] in subjectStats"
            :key="subject"
            class="stat-item"
          >
            <span class="stat-name">{{ subject }}</span>
            <span class="stat-count">{{ count }}节</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 时段图例 -->
    <div class="legend card">
      <h4>时段图例</h4>
      <div class="legend-items">
        <span v-for="(color, slot) in SLOT_COLORS" :key="slot" class="legend-item">
          <span class="color-block" :style="{ background: color }"></span>
          {{ slot }}
        </span>
      </div>
      <p class="legend-tip">点击任意课程单元格可修改课程名称，拖拽课程格可交换课程</p>
    </div>

    <!-- 已保存模板列表 -->
    <div v-if="templates.length" class="templates card">
      <h4>已保存模板（{{ templates.length }}个）</h4>
      <div class="template-list">
        <div
          v-for="(tpl, idx) in templates"
          :key="idx"
          class="template-item"
        >
          <div class="tpl-info">
            <span class="tpl-name">{{ tpl.name }}</span>
            <span class="tpl-date">{{ tpl.createdAt }}</span>
          </div>
          <div class="tpl-actions">
            <el-button size="small" link @click="loadTemplate(idx)">加载</el-button>
            <el-button size="small" type="danger" link @click="deleteTemplate(idx)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存模板对话框 -->
    <el-dialog v-model="templateDialog" title="保存当前课表为模板" width="420px">
      <el-form label-width="80px">
        <el-form-item label="模板名称">
          <el-input
            v-model="newTemplateName"
            placeholder="如：2025秋季课表"
            @keyup.enter="saveTemplate"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.schedule-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;

  .action-left {
    .tip {
      font-size: 13px;
      color: var(--text-regular);
    }
  }
}

.schedule-card {
  .schedule-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 4px;
    color: var(--primary-dark);
    margin-bottom: 16px;
  }

  .schedule-grid {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    overflow: hidden;

    .schedule-row {
      display: grid;
      grid-template-columns: 90px 110px repeat(5, 1fr);

      &.header-row {
        background: var(--primary-bg);
        font-weight: 600;

        .period-col,
        .time-col,
        .day-col {
          padding: 10px 6px;
          text-align: center;
          border-right: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);

          &:last-child { border-right: none; }
        }
      }

      &:not(.header-row) {
        .period-col,
        .time-col,
        .day-col {
          padding: 6px 4px;
          text-align: center;
          border-right: 1px solid rgba(0, 0, 0, 0.04);
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);

          &:last-child { border-right: none; }
        }

        .period-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 2px;
          background: rgba(255, 255, 255, 0.6);
          font-weight: 600;

          .period-name {
            font-size: 13px;
            color: var(--text-primary);
          }
        }

        .time-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 2px;
          background: rgba(255, 255, 255, 0.35);
          font-size: 12px;
          color: var(--text-regular);

          .period-time { font-size: 11px; }
        }

        .course-cell {
          position: relative;
          cursor: pointer;
          transition: all 0.2s;

          .course-text {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
          }

          .lunch-text {
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 4px;
            color: var(--text-regular);
          }

          .hover-edit {
            position: absolute;
            top: 4px;
            right: 4px;
            color: var(--text-secondary);
            opacity: 0;
            transition: opacity 0.2s;
          }

          &:hover {
            box-shadow: inset 0 0 0 2px var(--primary-light);
            border-radius: 4px;

            .hover-edit {
              opacity: 1;
            }
          }

          &.non-editable {
            cursor: default;

            &:hover {
              box-shadow: none;
            }
          }

          &.drag-source {
            opacity: 0.4;
          }

          &.drag-over {
            box-shadow: inset 0 0 0 2px var(--success-color);
            border-radius: 4px;
          }

          &.editing {
            background: #fff !important;
            box-shadow: inset 0 0 0 2px var(--primary-color);

            .edit-wrap {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;

              .course-select {
                width: 84px;
              }

              .edit-cancel {
                color: var(--danger-color);
                cursor: pointer;
                flex-shrink: 0;
              }
            }
          }
        }
      }
    }
  }

  .subject-stats {
    margin-top: 14px;
    padding: 12px 16px;
    background: var(--bg-page);
    border-radius: var(--radius-sm);

    h4 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-regular);
    }

    .stats-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .stat-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        background: #fff;
        border: 1px solid var(--border-color);
        border-radius: 20px;
        font-size: 12px;

        .stat-name {
          font-weight: 500;
          color: var(--text-primary);
        }

        .stat-count {
          color: var(--primary-color);
          font-weight: 600;
        }
      }
    }
  }
}

.legend-card {
  padding: 14px 18px;

  h4 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-regular);
  }

  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-regular);

      .color-block {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
    }
  }

  .legend-tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.templates {
  h4 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--text-regular);
  }

  .template-list {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .template-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--bg-page);
      border-radius: var(--radius-sm);
      transition: all 0.2s;

      &:hover {
        background: var(--primary-bg);
      }

      .tpl-info {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .tpl-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .tpl-date {
          font-size: 11px;
          color: var(--text-secondary);
        }
      }

      .tpl-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
}
</style>