<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Clock, Delete } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import type { SeatAssignment } from '@/types'
import { arrangeSeats, DEFAULT_SEATING_CONFIG } from '@/utils/seating-algorithms'

const studentStore = useStudentStore()

// ===== 名单 =====
const maleStudents = computed(() => studentStore.students.filter((s) => s.gender === '男'))
const femaleStudents = computed(() => studentStore.students.filter((s) => s.gender === '女'))

// ===== 排座 =====
const seats = ref<SeatAssignment[]>([])
const generated = ref(false)
const generating = ref(false)

// ===== 历史版本 =====
interface SeatHistory {
  name: string
  createdAt: string
  data: SeatAssignment[]
}
const HISTORY_KEY = 'seat-history'

function loadHistory(): SeatHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as SeatHistory[]) : []
  } catch {
    return []
  }
}

function saveHistory(list: SeatHistory[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

const history = ref<SeatHistory[]>(loadHistory())
const historyName = ref('')
const historyDialog = ref(false)

function openHistoryDialog() {
  historyName.value = ''
  historyDialog.value = true
}

function saveCurrentAsHistory() {
  const name = historyName.value.trim() || `排座方案${history.value.length + 1}`
  history.value.unshift({
    name,
    createdAt: new Date().toLocaleString('zh-CN'),
    data: seats.value.map((s) => ({ ...s })),
  })
  saveHistory(history.value)
  historyDialog.value = false
  ElMessage.success(`已保存「${name}」`)
}

function loadHistoryVersion(idx: number) {
  const item = history.value[idx]
  if (!item) return
  ElMessageBox.confirm(`确定加载「${item.name}」？当前座位将被覆盖。`, '加载历史版本', {
    type: 'warning',
    confirmButtonText: '加载',
    cancelButtonText: '取消',
  })
    .then(() => {
      seats.value = item.data.map((s) => ({ ...s }))
      generated.value = true
      ElMessage.success(`已加载「${item.name}」`)
    })
    .catch(() => {})
}

function deleteHistoryVersion(idx: number) {
  const item = history.value[idx]
  if (!item) return
  ElMessageBox.confirm(`确定删除历史版本「${item.name}」？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(() => {
      history.value.splice(idx, 1)
      saveHistory(history.value)
      ElMessage.success(`已删除「${item.name}」`)
    })
    .catch(() => {})
}

function generateSeats() {
  generating.value = true
  // 模拟异步，让UI反馈
  setTimeout(() => {
    seats.value = arrangeSeats(studentStore.students, DEFAULT_SEATING_CONFIG)
    generated.value = true
    generating.value = false
    ElMessage.success(`已生成 ${seats.value.length} 个座位`)
  }, 300)
}

// ===== 拖动调座 =====
const draggingId = ref<number | null>(null)
const dragOverCell = ref<string>('')

function onDragStart(studentId: number) {
  draggingId.value = studentId
}

function onDragOver(row: number, col: number) {
  dragOverCell.value = `${row}-${col}`
}

function onDrop(targetRow: number, targetCol: number) {
  if (draggingId.value === null) return
  const sourceIdx = seats.value.findIndex((s) => s.studentId === draggingId.value)
  const targetIdx = seats.value.findIndex((s) => s.row === targetRow && s.col === targetCol)
  if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) {
    draggingId.value = null
    dragOverCell.value = ''
    return
  }
  // 交换座位
  const tmp = { ...seats.value[sourceIdx]! }
  seats.value[sourceIdx] = { ...seats.value[targetIdx]!, row: seats.value[sourceIdx]!.row, col: seats.value[sourceIdx]!.col, group: seats.value[sourceIdx]!.group }
  seats.value[targetIdx] = { ...tmp, row: targetRow, col: targetCol, group: seats.value[targetIdx]!.group }
  draggingId.value = null
  dragOverCell.value = ''
}

// 获取某座位的学生
function getSeatStudent(row: number, col: number) {
  return seats.value.find((s) => s.row === row && s.col === col)
}

// 获取学生姓名（用于名单）
function getStudentName(id: number) {
  return studentStore.getStudentById(id)?.name ?? ''
}

function resetSeats() {
  seats.value = []
  generated.value = false
}
</script>

<template>
  <div class="seating-view">
    <!-- 名单区 -->
    <div class="name-lists card">
      <div class="name-list male-list">
        <h3>男生名单（{{ maleStudents.length }}人）</h3>
        <div class="name-grid">
          <div v-for="s in maleStudents" :key="s.id" class="name-cell">
            <span class="no">{{ s.studentNo }}</span>
            <span class="name">{{ s.name }}</span>
            <span class="height">{{ s.height }}cm</span>
          </div>
        </div>
      </div>
      <div class="name-list female-list">
        <h3>女生名单（{{ femaleStudents.length }}人）</h3>
        <div class="name-grid">
          <div v-for="s in femaleStudents" :key="s.id" class="name-cell">
            <span class="no">{{ s.studentNo }}</span>
            <span class="name">{{ s.name }}</span>
            <span class="height">{{ s.height }}cm</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="actions card">
      <div class="action-left">
        <el-button type="primary" :loading="generating" @click="generateSeats">
          <el-icon><MagicStick /></el-icon> 排座
        </el-button>
        <el-button v-if="generated" @click="openHistoryDialog">
          <el-icon><Clock /></el-icon> 保存版本
        </el-button>
        <el-button v-if="generated" type="danger" plain @click="resetSeats">重置</el-button>
        <span v-if="generated" class="generated-info">
          共 {{ seats.length }} 个座位 · 8排 × 8列 · 已按身高排序 + 同性同桌优先
        </span>
      </div>
    </div>

    <!-- 历史版本列表 -->
    <div v-if="history.length" class="history-section card">
      <h4>历史排座版本（{{ history.length }}个）</h4>
      <div class="history-list">
        <div
          v-for="(item, idx) in history"
          :key="idx"
          class="history-item"
        >
          <div class="hist-info">
            <span class="hist-name">{{ item.name }}</span>
            <span class="hist-date">{{ item.createdAt }}</span>
          </div>
          <div class="hist-actions">
            <el-button size="small" link @click="loadHistoryVersion(idx)">加载</el-button>
            <el-button size="small" type="danger" link @click="deleteHistoryVersion(idx)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 教室可视化 -->
    <div v-if="generated" class="classroom card">
      <!-- 黑板 -->
      <div class="blackboard">
        <span>黑 板</span>
      </div>
      <!-- 讲台 -->
      <div class="podium">
        <span>讲 台</span>
      </div>
      <div class="podium-desk">
        <span>讲 桌</span>
      </div>

      <!-- 门 -->
      <div class="door">门</div>

      <!-- 座位网格 -->
      <div class="seat-grid">
        <div class="row-header">
          <div class="corner"></div>
          <div v-for="col in 8" :key="col" class="col-header">
            第{{ col }}列
          </div>
        </div>
        <div v-for="row in 8" :key="row" class="seat-row">
          <div class="row-label">第{{ row }}排</div>
          <div
            v-for="col in 8"
            :key="col"
            class="seat-cell"
            :class="{
              'seat-occupied': getSeatStudent(row, col),
              'seat-empty': !getSeatStudent(row, col),
              'dragging': draggingId === getSeatStudent(row, col)?.studentId,
              'drop-target': dragOverCell === `${row}-${col}`,
              'aisle': col === 4 || col === 8,
            }"
            draggable="true"
            @dragstart="onDragStart(getSeatStudent(row, col)?.studentId ?? -1)"
            @dragover.prevent="onDragOver(row, col)"
            @drop.prevent="onDrop(row, col)"
          >
            <template v-if="getSeatStudent(row, col)">
              <div class="student-name">{{ getSeatStudent(row, col)?.studentName }}</div>
              <div class="student-meta">{{ getSeatStudent(row, col)?.studentId }}</div>
            </template>
            <div v-else class="empty-mark">—</div>
          </div>
        </div>
      </div>

      <!-- 底部区域 -->
      <div class="bottom-area">
        <div class="blackboard-news">黑板报</div>
        <div class="committee-area">
          <span class="committee-title">班委会</span>
          <div class="committee-grid">
            <div v-for="i in 8" :key="i" class="committee-cell">职务{{ i }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 未生成提示 -->
    <div v-else class="empty-state card">
      <el-empty description="点击「排座」按钮生成座位布局" />
    </div>

    <!-- 保存历史版本对话框 -->
    <el-dialog v-model="historyDialog" title="保存当前排座版本" width="420px">
      <el-form label-width="80px">
        <el-form-item label="版本名称">
          <el-input
            v-model="historyName"
            placeholder="如：期中考试排座"
            @keyup.enter="saveCurrentAsHistory"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="historyDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCurrentAsHistory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.seating-view {
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

      &.male-list { color: #0984e3; border-color: #0984e3; }
      &.female-list { color: #e84393; border-color: #e84393; }
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
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--bg-page);
      font-size: 12px;

      .no { color: var(--text-secondary); width: 20px; }
      .name { font-weight: 500; flex: 1; }
      .height { color: var(--primary-color); font-size: 11px; }
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

.classroom {
  position: relative;
  padding: 20px;
  background: linear-gradient(180deg, #faf9ff 0%, #f5f6fa 100%);

  .blackboard {
    background: #2d3436;
    color: #fff;
    text-align: center;
    padding: 14px;
    border-radius: 6px;
    font-size: 15px;
    letter-spacing: 12px;
    margin-bottom: 8px;
  }

  .podium {
    background: #dfe6e9;
    color: var(--text-regular);
    text-align: center;
    padding: 6px;
    border-radius: 4px;
    font-size: 13px;
    letter-spacing: 8px;
    margin-bottom: 4px;
  }

  .podium-desk {
    background: #b2bec3;
    color: #fff;
    text-align: center;
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
    letter-spacing: 8px;
    margin-bottom: 20px;
  }

  .door {
    position: absolute;
    top: 0;
    right: 0;
    width: 40px;
    height: 120px;
    background: #e17055;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    font-size: 12px;
    border-radius: 0 0 6px 6px;
  }

  .seat-grid {
    .row-header {
      display: grid;
      grid-template-columns: 60px repeat(8, 1fr);
      gap: 4px;
      margin-bottom: 4px;

      .corner { background: transparent; }

      .col-header {
        text-align: center;
        font-size: 11px;
        color: var(--text-secondary);
        padding: 4px 0;
        background: var(--primary-bg);
        border-radius: 4px;
      }
    }

    .seat-row {
      display: grid;
      grid-template-columns: 60px repeat(8, 1fr);
      gap: 4px;
      margin-bottom: 4px;

      .row-label {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: var(--text-secondary);
        background: var(--primary-bg);
        border-radius: 4px;
      }

      .seat-cell {
        min-height: 52px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2px 4px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;

        &.seat-occupied {
          background: #fff;
          border: 1.5px solid var(--primary-color);
          box-shadow: var(--shadow-card);

          .student-name {
            font-weight: 600;
            color: var(--text-primary);
          }

          .student-meta {
            font-size: 10px;
            color: var(--text-secondary);
          }

          &:hover {
            box-shadow: var(--shadow-hover);
            transform: translateY(-1px);
          }
        }

        &.seat-empty {
          background: transparent;
          border: 1px dashed var(--border-color);

          .empty-mark { color: var(--text-secondary); }
        }

        &.dragging {
          opacity: 0.5;
          border-style: dashed;
        }

        &.drop {
          background: var(--primary-bg);
          border-color: var(--primary-color);
        }

        &.aisle {
          margin-right: 8px;
        }
      }
    }
  }

  .bottom-area {
    display: flex;
    gap: 20px;
    margin-top: 16px;

    .blackboard {
      flex: 2;
      background: #0984e3;
      color: #fff;
      text-align: center;
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      letter-spacing: 6px;
    }

    .committee-area {
      flex: 3;
      background: #f8f9fa;
      border-radius: 6px;
      padding: 10px;

      .committee-title {
        font-size: 13px;
        font-weight: 600;
        display: block;
        margin-bottom: 6px;
      }

      .committee-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
      }

      .committee-cell {
        background: #fff;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 4px;
        text-align: center;
        font-size: 11px;
      }
    }
  }
}

.empty-state {
  padding: 40px;
}

.history-section {
  h4 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--text-regular);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .history-item {
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

      .hist-info {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .hist-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .hist-date {
          font-size: 11px;
          color: var(--text-secondary);
        }
      }

      .hist-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
}
</style>