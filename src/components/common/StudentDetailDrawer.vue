<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStudentStore } from '@/stores/student'
import type { RecordType, BehaviorRecord } from '@/types'
import { DICTIONARIES, ETHNICITIES, PSYCHOLOGY, HEALTH_EVALUATIONS } from '@/utils/constants'

const props = defineProps<{
  visible: boolean
  studentId: number | null
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  edit: [id: number]
}>()

const store = useStudentStore()

const student = computed(() => {
  if (props.studentId === null) return null
  return store.getStudentById(props.studentId) ?? null
})

const activeTab = ref('basic')

watch(
  () => props.visible,
  (val) => {
    if (val) activeTab.value = 'basic'
  },
)

// ===== 行为记录管理 =====
const recordDialogVisible = ref(false)
const newRecord = ref<{ type: RecordType; date: string; content: string }>({
  type: '正向',
  date: new Date().toISOString().slice(0, 10),
  content: '',
})

function addRecord() {
  if (props.studentId === null) return
  if (!newRecord.value.content.trim()) return
  store.addRecord(props.studentId, newRecord.value.type, newRecord.value.date, newRecord.value.content)
  newRecord.value = { type: '正向', date: new Date().toISOString().slice(0, 10), content: '' }
  recordDialogVisible.value = false
}

function removeRecord(recordId: number) {
  if (props.studentId === null) return
  store.deleteRecord(props.studentId, recordId)
}

const recordStats = computed(() => {
  if (props.studentId === null) return { positive: 0, negative: 0, leave: 0, total: 0 }
  return store.getRecordStats(props.studentId)
})

function recordTagType(type: RecordType) {
  if (type === '正向') return 'success'
  if (type === '负向') return 'danger'
  return 'info'
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    size="640px"
    :title="student ? `${student.name} · 学生档案` : '学生档案'"
    direction="rtl"
  >
    <div v-if="student" class="detail-content">
      <!-- 顶部信息卡 -->
      <div class="profile-header">
        <div class="avatar-area">
          <div class="avatar" :class="student.gender">
            {{ student.name.charAt(0) }}
          </div>
        </div>
        <div class="profile-info">
          <h2>{{ student.name }}</h2>
          <div class="info-badges">
            <el-tag size="small">{{ student.gender }}</el-tag>
            <el-tag size="small" type="info">{{ student.ethnicity }}</el-tag>
            <el-tag size="small" :type="student.status === '在读' ? 'success' : 'warning'">{{ student.status }}</el-tag>
            <el-tag size="small" effect="plain">{{ student.type }}</el-tag>
          </div>
          <div class="quick-stats">
            <span>学号: {{ student.studentNo }}</span>
            <span>入学: {{ student.enrollmentDate }}</span>
            <span>入学成绩: {{ student.entranceScore }}</span>
          </div>
        </div>
      </div>

      <!-- Tab 选项卡 -->
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">出生年月</span>
              <span class="value">{{ student.birthDate }}</span>
            </div>
            <div class="info-item">
              <span class="label">联系电话</span>
              <span class="value">{{ student.phone || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="label">身份证号</span>
              <span class="value">{{ student.idCard || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="label">民族</span>
              <span class="value">{{ student.ethnicity }}</span>
            </div>
            <div class="info-item">
              <span class="label">毕业学校</span>
              <span class="value">{{ student.graduatedSchool || '—' }}</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 学籍信息 -->
        <el-tab-pane label="学籍信息" name="enrollment">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">入学时间</span>
              <span class="value">{{ student.enrollmentDate }}</span>
            </div>
            <div class="info-item">
              <span class="label">入学成绩</span>
              <span class="value">{{ student.entranceScore }}</span>
            </div>
            <div class="info-item">
              <span class="label">学籍状态</span>
              <span class="value">
                <el-tag :type="student.status === '在读' ? 'success' : 'warning'" size="small">{{ student.status }}</el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="label">学生类型</span>
              <span class="value">{{ student.type }}</span>
            </div>
            <div class="info-item">
              <span class="label">毕业学校</span>
              <span class="value">{{ student.graduatedSchool || '—' }}</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 家庭信息 -->
        <el-tab-pane label="家庭信息" name="family">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">家庭结构</span>
              <span class="value">{{ student.familyStructure || '—' }}</span>
            </div>
            <div class="info-item full">
              <span class="label">居住地址</span>
              <span class="value">{{ student.address || '—' }}</span>
            </div>
          </div>
          <div v-if="student.guardians.length" class="guardian-list">
            <h4>家长信息</h4>
            <div v-for="(g, i) in student.guardians" :key="i" class="guardian-card">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">姓名</span>
                  <span class="value">{{ g.name }}</span>
                </div>
                <div class="info-item">
                  <span class="label">关系</span>
                  <span class="value">{{ g.relationship }}</span>
                </div>
                <div class="info-item">
                  <span class="label">职业</span>
                  <span class="value">{{ g.occupation || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">电话</span>
                  <span class="value">{{ g.phone || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">沟通偏好</span>
                  <span class="value">{{ g.preference }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无家长信息" :image-size="60" />
        </el-tab-pane>

        <!-- 身心健康 -->
        <el-tab-pane label="身心健康" name="health">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">身高</span>
              <span class="value">{{ student.height }} cm</span>
            </div>
            <div class="info-item">
              <span class="label">体重</span>
              <span class="value">{{ student.weight }} kg</span>
            </div>
            <div class="info-item">
              <span class="label">身体评价</span>
              <span class="value">
                <el-tag
                  :type="student.healthEvaluation === '优秀' ? 'success' : student.healthEvaluation === '待提升' ? 'danger' : 'warning'"
                  size="small"
                >{{ student.healthEvaluation }}</el-tag>
              </span>
            </div>
            <div class="info-item full">
              <span class="label">疾病史</span>
              <span class="value">{{ student.diseaseHistory || '无' }}</span>
            </div>
            <div class="info-item">
              <span class="label">情绪调节</span>
              <span class="value">{{ student.emotionType }}</span>
            </div>
            <div class="info-item">
              <span class="label">社交模式</span>
              <span class="value">{{ student.socialType }}</span>
            </div>
            <div class="info-item">
              <span class="label">学习心理</span>
              <span class="value">{{ student.learningPsychology }}</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 发展信息 -->
        <el-tab-pane label="发展信息" name="development">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">特长</span>
              <span class="value">{{ student.specialty || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="label">爱好</span>
              <span class="value">{{ student.hobby || '—' }}</span>
            </div>
            <div class="info-item full">
              <span class="label">梦想</span>
              <span class="value">{{ student.dream || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="label">短期目标</span>
              <span class="value">{{ student.shortTermGoal || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="label">中期目标</span>
              <span class="value">{{ student.midTermGoal || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="label">长期目标</span>
              <span class="value">{{ student.longTermGoal || '—' }}</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 社交关系 -->
        <el-tab-pane label="社交关系" name="social">
          <div class="social-section">
            <h4>良好关系</h4>
            <div class="relation-tags">
              <el-tag v-for="name in student.goodRelations" :key="name" type="success" effect="light" size="small">
                {{ name }}
              </el-tag>
              <span v-if="!student.goodRelations.length" class="empty-text">暂无</span>
            </div>
          </div>
          <div class="social-section">
            <h4>矛盾关系</h4>
            <div class="relation-tags">
              <el-tag v-for="name in student.conflictRelations" :key="name" type="danger" effect="light" size="small">
                {{ name }}
              </el-tag>
              <span v-if="!student.conflictRelations.length" class="empty-text">暂无</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 行为记录 -->
        <el-tab-pane name="records">
          <template #label>
            <span>行为记录</span>
            <el-badge :value="recordStats.total" :max="99" class="tab-badge" />
          </template>

          <div class="records-section">
            <div class="records-stats">
              <div class="rstat positive">
                <span class="num">{{ recordStats.positive }}</span>
                <span class="lbl">正向</span>
              </div>
              <div class="rstat negative">
                <span class="num">{{ recordStats.negative }}</span>
                <span class="lbl">负向</span>
              </div>
              <div class="rstat leave">
                <span class="num">{{ recordStats.leave }}</span>
                <span class="lbl">请假</span>
              </div>
            </div>

            <div class="records-toolbar">
              <el-button type="primary" size="small" @click="recordDialogVisible = true">
                <el-icon><Plus /></el-icon> 添加记录
              </el-button>
            </div>

            <el-table :data="student.records" stripe size="small" style="width: 100%">
              <el-table-column prop="date" label="日期" width="120" />
              <el-table-column label="类型" width="80">
                <template #default="{ row }">
                  <el-tag :type="recordTagType(row.type)" size="small">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="content" label="内容" show-overflow-tooltip />
              <el-table-column label="操作" width="70" align="center">
                <template #default="{ row }">
                  <el-button link type="danger" size="small" @click="removeRecord(row.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!student.records.length" description="暂无行为记录" :image-size="60" />
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 底部操作 -->
      <div class="drawer-footer">
        <el-button type="primary" @click="emit('edit', student.id)">编辑档案</el-button>
      </div>
    </div>

    <el-empty v-else description="未选中学生" />

    <!-- 添加行为记录对话框 -->
    <el-dialog v-model="recordDialogVisible" title="添加行为记录" width="460px" append-to-body>
      <el-form label-width="70px">
        <el-form-item label="类型">
          <el-radio-group v-model="newRecord.type">
            <el-radio-button label="正向" />
            <el-radio-button label="负向" />
            <el-radio-button label="请假" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="newRecord.date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="newRecord.content" type="textarea" :rows="3" placeholder="请输入记录内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addRecord">添加</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style scoped lang="scss">
.detail-content {
  padding: 0 20px 20px;
}

.profile-header {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--primary-color);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 600;
    flex-shrink: 0;

    &.女 {
      background: #e84393;
    }
  }

  .profile-info {
    flex: 1;

    h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .info-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .quick-stats {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--text-regular);
      flex-wrap: wrap;
    }
  }
}

.detail-tabs {
  .tab-badge {
    margin-left: 4px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &.full {
      grid-column: 1 / -1;
    }

    .label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .value {
      font-size: 14px;
      color: var(--text-primary);
    }
  }
}

.guardian-list {
  margin-top: 16px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .guardian-card {
    background: var(--bg-page);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    margin-bottom: 10px;
  }
}

.social-section {
  margin-bottom: 20px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .relation-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .empty-text {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.records-section {
  .records-stats {
    display: flex;
    gap: 14px;
    margin-bottom: 16px;

    .rstat {
      flex: 1;
      text-align: center;
      padding: 10px;
      border-radius: var(--radius-sm);
      background: var(--bg-page);

      .num {
        display: block;
        font-size: 24px;
        font-weight: 700;
      }
      .lbl {
        font-size: 12px;
        color: var(--text-secondary);
      }
      &.positive .num { color: var(--success-color); }
      &.negative .num { color: var(--danger-color); }
      &.leave .num { color: var(--info-color); }
    }
  }

  .records-toolbar {
    margin-bottom: 12px;
  }
}

.drawer-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}
</style>
