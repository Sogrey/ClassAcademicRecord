<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { MagicStick, Refresh, EditPen, Bell, Calendar } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import type { CleaningAssignment } from '@/types'
import {
  assignCleaningGroups,
  DEFAULT_TASKS,
  type CleaningGroup,
} from '@/utils/seating-algorithms'

const studentStore = useStudentStore()

// ===== 名单 =====
const maleStudents = computed(() => studentStore.students.filter((s) => s.gender === '男'))
const femaleStudents = computed(() => studentStore.students.filter((s) => s.gender === '女'))

// ===== 分组结果 =====
const groups = ref<CleaningGroup[]>([])
const generated = ref(false)
const generating = ref(false)

// ===== 任务 =====
const taskNames = ref<string[]>([...DEFAULT_TASKS])
const editingTaskIdx = ref<number | null>(null)
const editingTaskName = ref('')

// ===== 轮换模式 =====
type RotateMode = 'week' | 'month'
const rotateMode = ref<RotateMode>('week')
const rotateOffset = ref(0)

// ===== 提醒通知 =====
const notifyEnabled = ref(false)
const notifyTime = ref('07:30') // 默认提醒时间
let notifyTimer: ReturnType<typeof setInterval> | null = null

/** 检查当前时间是否匹配提醒时间 */
function checkNotifyTime() {
  if (!notifyEnabled.value || !generated.value) return
  const now = new Date()
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (current === notifyTime.value) {
    // 获取今天星期几（1=周一...5=周五）
    const weekday = now.getDay()
    if (weekday >= 1 && weekday <= 5) {
      sendDutyNotification(weekday)
    }
  }
}

/** 发送值日提醒通知 */
function sendDutyNotification(weekday: number) {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  const todayGroup = ((weekday - 1 + rotateOffset.value) % 5) + 1
  const group = groups.value.find((g) => g.groupNumber === todayGroup)
  if (!group) return
  const names = group.members.map((m) => m.name).join('、')
  const tasks = taskNames.value.slice(0, 5).join('、')
  ElNotification({
    title: `值日提醒 · 星期${dayNames[weekday]}`,
    message: `今天是第${todayGroup}组值日\n值日同学：${names}\n主要任务：${tasks}`,
    type: 'info',
    duration: 10000,
  })
}

/** 切换提醒开关 */
function toggleNotify() {
  notifyEnabled.value = !notifyEnabled.value
  if (notifyEnabled.value) {
    ElMessage.success(`已开启值日提醒，每天 ${notifyTime.value} 推送`)
  } else {
    ElMessage.info('已关闭值日提醒')
  }
}

onMounted(() => {
  notifyTimer = setInterval(checkNotifyTime, 60000) // 每分钟检查
})

onUnmounted(() => {
  if (notifyTimer) clearInterval(notifyTimer)
})

/** 生成分组 */
function generateGroups() {
  generating.value = true
  setTimeout(() => {
    groups.value = assignCleaningGroups(studentStore.students, 5)
    rotateOffset.value = 0
    rotateMode.value = 'week'
    generated.value = true
    generating.value = false
    ElMessage.success(`已生成 ${groups.value.length} 个值日小组，每组 ${groups.value[0]?.members.length ?? 0} 人`)
  }, 300)
}

function resetGroups() {
  groups.value = []
  generated.value = false
  rotateOffset.value = 0
  rotateMode.value = 'week'
}

/** 轮换：周模式+1，月模式+4（约一个月） */
function rotateGroups() {
  if (!generated.value) return
  rotateOffset.value += rotateMode.value === 'week' ? 1 : 4
  const label = rotateMode.value === 'week' ? '周' : '月'
  ElMessage.success(`已轮换${label}（当前第 ${rotateOffset.value + 1} 个周期）`)
}

/** 切换轮换模式 */
function switchRotateMode(mode: RotateMode) {
  rotateMode.value = mode
  rotateOffset.value = 0
  const label = mode === 'week' ? '周' : '月'
  ElMessage.info(`已切换为按${label}轮换`)
}

// ===== 值日分配表 =====
/** 组装任务-学生分配（每组组员循环填充10个任务） */
const assignments = computed<CleaningAssignment[]>(() => {
  const list: CleaningAssignment[] = []
  for (const group of groups.value) {
    const members = group.members
    const size = members.length
    if (size === 0) continue
    taskNames.value.forEach((taskName, taskIdx) => {
      // 轮换后取模定位组员：成员索引 = (任务索引 + 轮换偏移) % 组人数
      const member = members[(taskIdx + rotateOffset.value) % size]
      list.push({
        groupNumber: group.groupNumber,
        taskNumber: taskIdx + 1,
        taskName,
        studentId: member?.id ?? 0,
        studentName: member?.name ?? '—',
      })
    })
  }
  return list
})

/** 获取某任务某组的学生 */
function getStudentByTask(groupNumber: number, taskIdx: number) {
  return assignments.value.find(
    (a) => a.groupNumber === groupNumber && a.taskNumber === taskIdx + 1,
  )
}

/** 某任务行使用的组员索引（用于显示学号） */
function getMemberNo(groupNumber: number, taskIdx: number) {
  const group = groups.value.find((g) => g.groupNumber === groupNumber)
  const members = group?.members ?? []
  if (members.length === 0) return ''
  const member = members[(taskIdx + rotateOffset.value) % members.length]
  return member ? String(member.studentNo).padStart(2, '0') : ''
}

// ===== 任务名编辑 =====
function startEditTask(idx: number) {
  editingTaskIdx.value = idx
  editingTaskName.value = taskNames.value[idx] ?? ''
}

function confirmEditTask() {
  if (editingTaskIdx.value !== null) {
    const name = editingTaskName.value.trim() || DEFAULT_TASKS[editingTaskIdx.value]!
    taskNames.value[editingTaskIdx.value] = name
    ElMessage.success('任务名称已更新')
  }
  editingTaskIdx.value = null
}

// ===== 行背景四色循环 =====
const ROW_COLORS = ['#fde8d7', '#fdf6d8', '#dceafd', '#d9f2e6'] // 浅橙→浅黄→浅蓝→浅绿
function rowColor(taskIdx: number) {
  return ROW_COLORS[taskIdx % ROW_COLORS.length]
}

// ===== 备注 =====
const notes = [
  '1. 每个小组按周/月轮换值日，选择轮换模式后点击「轮换」按钮切换至下一周期',
  '2. 组内同学如需换班，请提前一天与同组同学协商调换',
  '3. 因病事假无法值日的同学，请提前告知组长并补齐值日',
  '4. 开启值日提醒后，系统将在每天指定时间推送当日值日小组通知',
]
</script>

<template>
  <div class="cleaning-view">
    <!-- 名单区 -->
    <div class="name-lists card">
      <div class="name-list">
        <h3 class="male-title">男生名单（{{ maleStudents.length }}人）</h3>
        <div class="name-grid">
          <div v-for="s in maleStudents" :key="s.id" class="name-cell">
            <span class="no">{{ s.studentNo }}</span>
            <span class="name">{{ s.name }}</span>
          </div>
        </div>
      </div>
      <div class="name-list">
        <h3 class="female-title">女生名单（{{ femaleStudents.length }}人）</h3>
        <div class="name-grid">
          <div v-for="s in femaleStudents" :key="s.id" class="name-cell">
            <span class="no">{{ s.studentNo }}</span>
            <span class="name">{{ s.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="actions card">
      <div class="action-left">
        <el-button type="primary" :loading="generating" @click="generateGroups">
          <el-icon><MagicStick /></el-icon> 自动分组
        </el-button>
        <template v-if="generated">
          <el-radio-group v-model="rotateMode" size="small" @change="switchRotateMode as any">
            <el-radio-button value="week">按周轮换</el-radio-button>
            <el-radio-button value="month">按月轮换</el-radio-button>
          </el-radio-group>
          <el-button @click="rotateGroups">
            <el-icon><Refresh /></el-icon> 轮换（第 {{ rotateOffset + 1 }} {{ rotateMode === 'week' ? '周' : '月' }}）
          </el-button>
          <el-button :type="notifyEnabled ? 'success' : 'default'" plain @click="toggleNotify">
            <el-icon><Bell /></el-icon> {{ notifyEnabled ? '提醒已开' : '值日提醒' }}
          </el-button>
          <el-time-select
            v-if="notifyEnabled"
            v-model="notifyTime"
            size="small"
            start="06:00"
            end="22:00"
            step="00:15"
            style="width: 110px"
            placeholder="提醒时间"
          />
          <el-button type="danger" plain @click="resetGroups">重置</el-button>
        </template>
      </div>
    </div>

    <!-- 当前轮换信息 -->
    <div v-if="generated" class="rotate-info card">
      <div class="rotate-info-left">
        <el-icon :size="16" color="var(--primary-color)"><Calendar /></el-icon>
        <span>当前轮换模式：按{{ rotateMode === 'week' ? '周' : '月' }}轮换</span>
        <span class="rotate-cycle">第 {{ rotateOffset + 1 }} 个周期</span>
      </div>
      <div class="rotate-info-right">
        <span v-if="notifyEnabled" class="notify-badge">
          <el-icon :size="12"><Bell /></el-icon> 提醒已开启 · 每天 {{ notifyTime }}
        </span>
      </div>
    </div>
    <div v-if="generated" class="duty-table card">
      <h3 class="card-title">卫生值日表</h3>

      <div class="duty-grid">
        <!-- 表头 -->
        <div class="duty-row duty-header">
          <div class="duty-task-col">任务</div>
          <div v-for="g in 5" :key="g" class="duty-group-col">
            第{{ g }}组
          </div>
        </div>

        <!-- 任务行 -->
        <div
          v-for="(taskName, taskIdx) in taskNames"
          :key="taskIdx"
          class="duty-row"
          :style="{ background: rowColor(taskIdx) }"
        >
          <!-- 任务名（可编辑） -->
          <div class="duty-task-col">
            <template v-if="editingTaskIdx === taskIdx">
              <el-input
                v-model="editingTaskName"
                size="small"
                class="task-input"
                @keyup.enter="confirmEditTask"
                @blur="confirmEditTask"
              />
            </template>
            <template v-else>
              <span class="task-name">{{ taskName }}</span>
              <el-icon class="edit-icon" :size="12" @click="startEditTask(taskIdx)"><EditPen /></el-icon>
            </template>
          </div>

          <!-- 各组学生 -->
          <div
            v-for="g in 5"
            :key="g"
            class="duty-group-col"
            :class="{
              'has-student': getStudentByTask(g, taskIdx)?.studentName !== '—',
            }"
          >
            <span class="student-name">{{ getStudentByTask(g, taskIdx)?.studentName ?? '—' }}</span>
            <span v-if="getMemberNo(g, taskIdx)" class="student-no">{{ getMemberNo(g, taskIdx) }}</span>
          </div>
        </div>
      </div>

      <!-- 备注 -->
      <div class="notes">
        <h4>使用说明</h4>
        <p v-for="(note, i) in notes" :key="i" class="note">{{ note }}</p>
      </div>
    </div>

    <!-- 未生成提示 -->
    <div v-else class="empty-state card">
      <el-empty description="点击「自动分组」按钮生成卫生值日安排" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.cleaning-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.name-lists {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  .name-list {
    h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid;

      &.male-title { color: #0984e3; border-color: #0984e3; }
      &.female-title { color: #e84393; border-color: #e84393; }
    }

    .name-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--bg-page);
      font-size: 12px;

      .no {
        color: var(--text-secondary);
        width: 24px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }

      .name {
        font-weight: 500;
        flex: 1;
      }
    }
  }
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;

  .action-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .generated-info {
    font-size: 13px;
    color: var(--text-regular);
  }
}

.rotate-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;

  .rotate-info-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-regular);

    .rotate-cycle {
      color: var(--primary-color);
      font-weight: 600;
    }
  }

  .rotate-info-right {
    .notify-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--success-color);
    }
  }
}

.duty-table {
  .heading {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 14px;
  }

  .duty-grid {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    overflow: hidden;

    .duty-row {
      display: grid;
      grid-template-columns: 130px repeat(5, 1fr);
      transition: background-color 0.2s;

      &.duty-header {
        background: var(--primary-bg);
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);

        .duty-task-col,
        .duty-group-col {
          padding: 10px 8px;
        }
      }

      .duty-task-col {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px;
        font-weight: 500;
        border-right: 1px solid var(--border-color);
        border-bottom: 1px solid rgba(255, 255, 255, 0.5);

        .task-input {
          width: 90px;
        }

        .task-name {
          cursor: default;
        }

        .edit-icon {
          color: var(--text-secondary);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;

          &:hover {
            color: var(--primary-color);
          }
        }

        &:hover .edit-icon {
          opacity: 1;
        }
      }

      .duty-group-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 6px 4px;
        border-right: 1px solid rgba(255, 255, 255, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.5);

        &:last-child {
          border-right: none;
        }

        .student-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .student-no {
          font-size: 11px;
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }

        &.has-student {
          .student-name {
            color: var(--primary-dark);
          }
        }
      }
    }
  }

  .notes {
    margin-top: 14px;
    padding: 12px 16px;
    background: var(--bg-page);
    border-radius: var(--radius-sm);

    h4 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-regular);
    }

    .note {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.8;
    }
  }
}

.empty-state {
  padding: 40px;
}
</style>