<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStudentStore } from '@/stores/student'
import type { Gender, StudentType, StudentStatus } from '@/types'
import { DICTIONARIES } from '@/utils/constants'
import StudentDetailDrawer from '@/components/common/StudentDetailDrawer.vue'
import StudentEditDialog from '@/components/common/StudentEditDialog.vue'

const store = useStudentStore()

// ===== 搜索与筛选 =====
const keyword = ref('')
const filterGender = ref<Gender | ''>('')
const filterType = ref<StudentType | ''>('')
const filterStatus = ref<StudentStatus | ''>('')

const filteredList = computed(() => {
  let list = store.students
  if (keyword.value.trim()) {
    const kw = keyword.value.trim()
    list = list.filter(
      (s) => s.name.includes(kw) || String(s.studentNo).includes(kw) || s.phone.includes(kw),
    )
  }
  if (filterGender.value) list = list.filter((s) => s.gender === filterGender.value)
  if (filterType.value) list = list.filter((s) => s.type === filterType.value)
  if (filterStatus.value) list = list.filter((s) => s.status === filterStatus.value)
  return list
})

function resetFilter() {
  keyword.value = ''
  filterGender.value = ''
  filterType.value = ''
  filterStatus.value = ''
}

// ===== 详情抽屉 =====
const drawerVisible = ref(false)
const selectedId = ref<number | null>(null)

function openDetail(id: number) {
  selectedId.value = id
  drawerVisible.value = true
}

// ===== 新增/编辑对话框 =====
const editDialogVisible = ref(false)
const editingId = ref<number | null>(null)

function openAdd() {
  editingId.value = null
  editDialogVisible.value = true
}

function openEdit(id: number) {
  editingId.value = id
  editDialogVisible.value = true
  drawerVisible.value = false
}

function handleEditSaved() {
  editDialogVisible.value = false
}

// ===== 删除 =====
const deleteConfirmVisible = ref(false)
const deleteTarget = ref<{ id: number; name: string } | null>(null)

function askDelete(id: number, name: string) {
  deleteTarget.value = { id, name }
  deleteConfirmVisible.value = true
}

function confirmDelete() {
  if (deleteTarget.value) {
    store.deleteStudent(deleteTarget.value.id)
    if (selectedId.value === deleteTarget.value.id) {
      drawerVisible.value = false
    }
  }
  deleteConfirmVisible.value = false
  deleteTarget.value = null
}

// ===== 表格列 =====
function getRecordTag(studentId: number) {
  const stats = store.getRecordStats(studentId)
  return stats
}
</script>

<template>
  <div class="student-archives">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ store.totalCount }}</div>
        <div class="stat-label">总人数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value male">{{ store.maleCount }}</div>
        <div class="stat-label">男生</div>
      </div>
      <div class="stat-card">
        <div class="stat-value female">{{ store.femaleCount }}</div>
        <div class="stat-label">女生</div>
      </div>
      <div class="stat-card" v-for="[type, count] in store.typeCount" :key="type">
        <div class="stat-value">{{ count }}</div>
        <div class="stat-label">{{ type }}</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar card">
      <div class="toolbar-left">
        <el-input
          v-model="keyword"
          placeholder="搜索姓名 / 学号 / 电话"
          :prefix-icon="'Search'"
          clearable
          style="width: 260px"
        />
        <el-select v-model="filterGender" placeholder="性别" clearable style="width: 100px">
          <el-option v-for="g in DICTIONARIES.gender" :key="g" :label="g" :value="g" />
        </el-select>
        <el-select v-model="filterType" placeholder="学生类型" clearable style="width: 120px">
          <el-option v-for="t in DICTIONARIES.studentType" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="学籍状态" clearable style="width: 140px">
          <el-option v-for="s in DICTIONARIES.studentStatus" :key="s" :label="s" :value="s" />
        </el-select>
        <el-button @click="resetFilter" text>重置</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="openAdd">
          <el-icon><Plus /></el-icon>
          <span>新增学生</span>
        </el-button>
      </div>
    </div>

    <!-- 学生列表 -->
    <div class="table-wrap card">
      <el-table
        :data="filteredList"
        stripe
        highlight-current-row
        style="width: 100%"
        :header-cell-style="{ background: 'var(--primary-bg)', color: 'var(--text-primary)', fontWeight: 600 }"
      >
        <el-table-column prop="studentNo" label="学号" width="70" align="center" />
        <el-table-column label="姓名" width="100">
          <template #default="{ row }">
            <span class="name-cell" @click="openDetail(row.id)">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="60" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small" effect="light">
              {{ row.gender }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === '在读' ? 'success' : 'warning'"
              size="small"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ethnicity" label="民族" width="90" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column label="行为记录" width="140" align="center">
          <template #default="{ row }">
            <div class="record-tags">
              <el-tag v-if="getRecordTag(row.id).positive" type="success" size="small">
                正{{ getRecordTag(row.id).positive }}
              </el-tag>
              <el-tag v-if="getRecordTag(row.id).negative" type="danger" size="small">
                负{{ getRecordTag(row.id).negative }}
              </el-tag>
              <el-tag v-if="getRecordTag(row.id).leave" type="info" size="small">
                假{{ getRecordTag(row.id).leave }}
              </el-tag>
              <span v-if="!getRecordTag(row.id).total" class="no-record">—</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row.id)">详情</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row.id)">编辑</el-button>
            <el-button link type="danger" size="small" @click="askDelete(row.id, row.name)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 详情抽屉 -->
    <StudentDetailDrawer
      v-model:visible="drawerVisible"
      :student-id="selectedId"
      @edit="openEdit"
    />

    <!-- 新增/编辑对话框 -->
    <StudentEditDialog
      v-model:visible="editDialogVisible"
      :student-id="editingId"
      @saved="handleEditSaved"
    />

    <!-- 删除确认 -->
    <el-dialog v-model="deleteConfirmVisible" title="确认删除" width="380px">
      <span>确定要删除学生「{{ deleteTarget?.name }}」的档案吗？此操作不可撤销。</span>
      <template #footer>
        <el-button @click="deleteConfirmVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.student-archives {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

      &.male {
        color: #0984e3;
      }
      &.female {
        color: #e84393;
      }
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.table-wrap {
  padding: 0;
  overflow: hidden;

  .name-cell {
    color: var(--primary-color);
    cursor: pointer;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }

  .record-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .no-record {
    color: var(--text-secondary);
  }
}
</style>
