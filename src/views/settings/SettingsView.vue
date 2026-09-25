<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Close } from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

// ===== 学科 =====
const subjectForm = ref({ name: '', attr: '副科' as '主科' | '副科', fullScore: 100 })
const subjectDialog = ref(false)

function openAddSubject() {
  subjectForm.value = { name: '', attr: '副科', fullScore: 100 }
  subjectDialog.value = true
}

function confirmAddSubject() {
  const name = subjectForm.value.name.trim()
  if (!name) {
    ElMessage.warning('请输入学科名称')
    return
  }
  if (settingsStore.subjects.some((s) => s.name === name)) {
    ElMessage.warning('该学科已存在')
    return
  }
  settingsStore.addSubject({ ...subjectForm.value, name })
  subjectDialog.value = false
  ElMessage.success(`已添加学科「${name}」`)
}

function updateSubjectRow(index: number, field: 'name' | 'attr' | 'fullScore', value: string | number) {
  settingsStore.updateSubject(index, { [field]: value } as never)
}

function removeSubject(index: number, name: string) {
  ElMessageBox.confirm(`确定删除学科「${name}」？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(() => {
      settingsStore.removeSubject(index)
      ElMessage.success(`已删除学科「${name}」`)
    })
    .catch(() => {})
}

// ===== 评价等级（固定4个）=====
function updateEvalRow(index: number, field: 'name' | 'threshold', value: string | number | null) {
  settingsStore.updateEvaluation(index, { [field]: value } as never)
}

// ===== 心理预设 =====
const psychNew = ref<Record<string, string>>({ emotionTypes: '', socialTypes: '', learningTypes: '' })

function addPsychNew(dim: 'emotionTypes' | 'socialTypes' | 'learningTypes') {
  const value = (psychNew.value[dim] ?? '').trim()
  if (!value) return
  const arr = settingsStore.psychology[dim] as string[]
  if (arr.includes(value)) {
    ElMessage.warning('该选项已存在')
    return
  }
  settingsStore.addPsychologyType(dim, value)
  psychNew.value[dim] = ''
  ElMessage.success('已添加选项')
}

function updatePsych(dim: 'emotionTypes' | 'socialTypes' | 'learningTypes', index: number, value: string) {
  settingsStore.updatePsychologyType(dim, index, value)
}

function removePsych(dim: 'emotionTypes' | 'socialTypes' | 'learningTypes', index: number) {
  settingsStore.removePsychologyType(dim, index)
}

// ===== 健康评价 =====
const healthForm = ref({ name: '', description: '' })
const healthDialog = ref(false)

function openAddHealth() {
  healthForm.value = { name: '', description: '' }
  healthDialog.value = true
}

function confirmAddHealth() {
  const name = healthForm.value.name.trim()
  if (!name) {
    ElMessage.warning('请输入评价名称')
    return
  }
  settingsStore.addHealth(name, healthForm.value.description.trim())
  healthDialog.value = false
  ElMessage.success(`已添加健康评价「${name}」`)
}

function updateHealthRow(index: number, field: 'name' | 'description', value: string) {
  settingsStore.updateHealth(index, { [field]: value })
}

function removeHealth(index: number, name: string) {
  ElMessageBox.confirm(`确定删除健康评价「${name}」？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(() => {
      settingsStore.removeHealth(index)
      ElMessage.success(`已删除「${name}」`)
    })
    .catch(() => {})
}

// ===== 基础词典 =====
const dictNew = ref<Record<string, string>>({})

function addDict(key: string) {
  const value = (dictNew.value[key] ?? '').trim()
  if (!value) return
  const arr = settingsStore.dictionaries[key] as string[]
  if (arr.includes(value)) {
    ElMessage.warning('该选项已存在')
    return
  }
  settingsStore.addDictionaryItem(key, value)
  dictNew.value[key] = ''
}

function updateDict(key: string, index: number, value: string) {
  settingsStore.updateDictionary(key, index, value)
}

function removeDict(key: string, index: number) {
  settingsStore.removeDictionaryItem(key, index)
}

// ===== 民族 =====
const ethnicityNew = ref('')

function addEthnicity() {
  const value = ethnicityNew.value.trim()
  if (!value) return
  if (settingsStore.ethnicities.includes(value)) {
    ElMessage.warning('该民族已存在')
    return
  }
  settingsStore.addEthnicity(value)
  ethnicityNew.value = ''
}

function removeEthnicity(index: number) {
  settingsStore.removeEthnicity(index)
}

// ===== 恢复默认 =====
function resetAll() {
  ElMessageBox.confirm('确定恢复所有配置为默认值？当前修改将丢失。', '恢复默认', {
    type: 'warning',
    confirmButtonText: '恢复',
    cancelButtonText: '取消',
  })
    .then(() => {
      settingsStore.resetAll()
      ElMessage.success('已恢复默认配置')
    })
    .catch(() => {})
}

// ===== 词典展示 =====
const DICT_LABELS: Record<string, string> = {
  familyStructure: '家庭结构',
  commPreference: '沟通偏好',
  studentStatus: '学籍状态',
  studentType: '学生类型',
  gender: '性别',
}

const DICT_KEYS = ['familyStructure', 'commPreference', 'studentStatus', 'studentType', 'gender']

const PSYCH_LABELS: Record<string, string> = {
  emotionTypes: '情绪调节能力',
  socialTypes: '社交互动模式',
  learningTypes: '学习心理倾向',
}

const PSYCH_DIMS = ['emotionTypes', 'socialTypes', 'learningTypes'] as const
type PsychDim = (typeof PSYCH_DIMS)[number]

// 计数
const subjectCount = computed(() => settingsStore.subjects.length)
const ethnicityCount = computed(() => settingsStore.ethnicities.length)
</script>

<template>
  <div class="settings-page">
    <!-- 顶部操作栏 -->
    <div class="actions card">
      <div class="action-left">
        <span class="tip">所有配置修改即时生效并自动保存到本地</span>
      </div>
      <div class="action-right">
        <el-button type="danger" plain @click="resetAll">
          <el-icon><Refresh /></el-icon> 恢复默认
        </el-button>
      </div>
    </div>

    <!-- 学科配置 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">学科配置（{{ subjectCount }}科）</div>
        <el-button type="primary" size="small" @click="openAddSubject">
          <el-icon><Plus /></el-icon> 新增学科
        </el-button>
      </div>
      <el-table :data="settingsStore.subjects" size="small" border>
        <el-table-column label="学科" width="140">
          <template #default="{ row, $index }">
            <el-input
              :model-value="row.name"
              size="small"
              @change="(v: string) => updateSubjectRow($index, 'name', v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="属性" width="120">
          <template #default="{ row, $index }">
            <el-select
              :model-value="row.attr"
              size="small"
              @change="(v: string) => updateSubjectRow($index, 'attr', v)"
            >
              <el-option label="主科" value="主科" />
              <el-option label="副科" value="副科" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="满分" width="120">
          <template #default="{ row, $index }">
            <el-input-number
              :model-value="row.fullScore"
              size="small"
              :min="1"
              :max="300"
              @change="(v: number | undefined) => updateSubjectRow($index, 'fullScore', v ?? 100)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ $index, row }">
            <el-button type="danger" link size="small" @click="removeSubject($index, row.name)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 评价等级 -->
    <div class="card">
      <div class="card-title">评价等级（固定4个，个数不可修改）</div>
      <el-table :data="settingsStore.evaluations" size="small" border>
        <el-table-column prop="id" label="等级编号" width="120" />
        <el-table-column label="等级名称" width="160">
          <template #default="{ row, $index }">
            <el-input
              :model-value="row.name"
              size="small"
              @change="(v: string) => updateEvalRow($index, 'name', v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="分界线系数" width="160">
          <template #default="{ row, $index }">
            <el-input-number
              v-if="row.threshold !== null"
              :model-value="row.threshold"
              size="small"
              :min="0"
              :max="1"
              :step="0.1"
              @change="(v: number | undefined) => updateEvalRow($index, 'threshold', v ?? null)"
            />
            <span v-else class="no-threshold">—</span>
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <span class="hint-text">{{ row.label ?? '最低等级，无分界线' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <p class="config-tip">得分率 ≥ 分界线系数时落入该等级；等级个数固定为 4 个，仅可修改名称和系数。</p>
    </div>

    <!-- 心理状态预设 -->
    <div class="card">
      <div class="card-title">心理状态预设</div>
      <el-row :gutter="20">
        <el-col v-for="dim in PSYCH_DIMS" :key="dim" :span="8">
          <div class="sub-card">
            <h4>{{ PSYCH_LABELS[dim] }}</h4>
            <div v-for="(item, idx) in (settingsStore.psychology[dim] as string[])" :key="idx" class="tag-row">
              <el-input
                :model-value="item"
                size="small"
                @change="(v: string) => updatePsych(dim, idx, v)"
              />
              <el-icon class="del-icon" :size="14" @click="removePsych(dim, idx)"><Close /></el-icon>
            </div>
            <div class="add-row">
              <el-input
                v-model="psychNew[dim]"
                size="small"
                placeholder="新增选项"
                @keyup.enter="addPsychNew(dim)"
              />
              <el-button size="small" type="primary" link @click="addPsychNew(dim)">添加</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 健康评价 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">健康评价标准（对照《国家学生体质健康标准》）</div>
        <el-button type="primary" size="small" @click="openAddHealth">
          <el-icon><Plus /></el-icon> 新增评价
        </el-button>
      </div>
      <el-table :data="settingsStore.healthEvaluations" size="small" border>
        <el-table-column label="评价" width="120">
          <template #default="{ row, $index }">
            <el-input
              :model-value="row.name"
              size="small"
              @change="(v: string) => updateHealthRow($index, 'name', v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row, $index }">
            <el-input
              :model-value="row.description"
              type="textarea"
              :rows="2"
              size="small"
              @change="(v: string) => updateHealthRow($index, 'description', v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ $index, row }">
            <el-button type="danger" link size="small" @click="removeHealth($index, row.name)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 基础属性词典 -->
    <div class="card">
      <div class="card-title">基础属性词典（下拉选项数据源）</div>
      <el-row :gutter="20">
        <el-col v-for="key in DICT_KEYS" :key="key" :span="8">
          <div class="sub-card">
            <h4>{{ DICT_LABELS[key] }}</h4>
            <div v-for="(item, idx) in (settingsStore.dictionaries[key] as string[])" :key="idx" class="tag-row">
              <el-input
                :model-value="item"
                size="small"
                @change="(v: string) => updateDict(key, idx, v)"
              />
              <el-icon class="del-icon" :size="14" @click="removeDict(key, idx)"><Close /></el-icon>
            </div>
            <div class="add-row">
              <el-input
                v-model="dictNew[key]"
                size="small"
                placeholder="新增选项"
                @keyup.enter="addDict(key)"
              />
              <el-button size="small" type="primary" link @click="addDict(key)">添加</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 民族列表 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">民族列表（{{ ethnicityCount }}个）</div>
      </div>
      <div class="tag-list">
        <el-tag
          v-for="(item, idx) in settingsStore.ethnicities"
          :key="idx"
          closable
          size="small"
          @close="removeEthnicity(idx)"
        >
          {{ item }}
        </el-tag>
        <el-input
          v-model="ethnicityNew"
          size="small"
          placeholder="输入民族名称后回车添加"
          class="ethnicity-input"
          @keyup.enter="addEthnicity"
        />
      </div>
    </div>

    <!-- 新增学科对话框 -->
    <el-dialog v-model="subjectDialog" title="新增学科" width="420px">
      <el-form label-width="80px">
        <el-form-item label="学科名称">
          <el-input v-model="subjectForm.name" placeholder="如：美术" />
        </el-form-item>
        <el-form-item label="属性">
          <el-radio-group v-model="subjectForm.attr">
            <el-radio value="主科">主科</el-radio>
            <el-radio value="副科">副科</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="满分">
          <el-input-number v-model="subjectForm.fullScore" :min="1" :max="300" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="subjectDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddSubject">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新增健康评价对话框 -->
    <el-dialog v-model="healthDialog" title="新增健康评价" width="460px">
      <el-form label-width="80px">
        <el-form-item label="评价名称">
          <el-input v-model="healthForm.name" placeholder="如：优秀" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="healthForm.description"
            type="textarea"
            :rows="3"
            placeholder="评价标准说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="healthDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddHealth">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .card {
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .card-title {
        margin-bottom: 0;
      }
    }
  }

  .hint-text {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .config-tip {
    margin-top: 10px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .sub-card {
    background: var(--bg-page);
    border-radius: var(--radius-sm);
    padding: 12px;
    margin-bottom: 12px;

    h4 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-regular);
    }

    .tag-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;

      .del-icon {
        color: var(--text-secondary);
        cursor: pointer;
        flex-shrink: 0;

        &:hover {
          color: var(--danger-color);
        }
      }
    }

    .add-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
    }
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;

    .el-tag {
      margin: 0;
    }

    .ethnicity-input {
      width: 180px;
    }
  }
}
</style>