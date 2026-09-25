<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useStudentStore } from '@/stores/student'
import type { Student, Gender, StudentType, StudentStatus, Guardian, CommPreference } from '@/types'
import { DICTIONARIES, ETHNICITIES, PSYCHOLOGY, HEALTH_EVALUATIONS } from '@/utils/constants'

const props = defineProps<{
  visible: boolean
  studentId: number | null
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  saved: []
}>()

const store = useStudentStore()

const activeStep = ref(0)

// 表单数据
const defaultForm = (): Omit<Student, 'id' | 'studentNo'> => ({
  name: '',
  gender: '男' as Gender,
  ethnicity: '汉族',
  birthDate: '',
  phone: '',
  idCard: '',
  avatar: '',
  enrollmentDate: new Date().toISOString().slice(0, 10),
  entranceScore: 0,
  status: '在读' as StudentStatus,
  graduatedSchool: '',
  type: '普高生' as StudentType,
  familyStructure: '核心家庭',
  address: '',
  guardians: [] as Guardian[],
  height: 0,
  weight: 0,
  healthEvaluation: '良好',
  diseaseHistory: '',
  emotionType: PSYCHOLOGY.emotionTypes[0] ?? '乐观积极型',
  socialType: PSYCHOLOGY.socialTypes[0] ?? '外向主动型',
  learningPsychology: PSYCHOLOGY.learningTypes[0] ?? '自主进取型',
  specialty: '',
  hobby: '',
  dream: '',
  shortTermGoal: '',
  midTermGoal: '',
  longTermGoal: '',
  goodRelations: [] as string[],
  conflictRelations: [] as string[],
  records: [],
})

const form = ref<Omit<Student, 'id' | 'studentNo'>>(defaultForm())

const isEdit = computed(() => props.studentId !== null)

const dialogTitle = computed(() => (isEdit.value ? '编辑学生档案' : '新增学生档案'))

watch(
  () => props.visible,
  (val) => {
    if (val) {
      activeStep.value = 0
      if (props.studentId !== null) {
        const s = store.getStudentById(props.studentId)
        if (s) {
          const { id, studentNo, ...rest } = s
          form.value = { ...rest } as Omit<Student, 'id' | 'studentNo'>
        }
      } else {
        form.value = defaultForm()
      }
    }
  },
)

// 所有学生姓名（用于关系选择）
const allNames = computed(() => store.studentNames)

// 家长信息操作
function addGuardian() {
  form.value.guardians.push({
    name: '',
    relationship: '',
    occupation: '',
    phone: '',
    preference: '微信' as CommPreference,
  })
}

function removeGuardian(idx: number) {
  form.value.guardians.splice(idx, 1)
}

// 保存
function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入学生姓名')
    return
  }
  if (isEdit.value && props.studentId !== null) {
    store.updateStudent(props.studentId, form.value)
    ElMessage.success('档案已更新')
  } else {
    store.addStudent(form.value)
    ElMessage.success('学生已添加')
  }
  emit('saved')
}

const steps = [
  { title: '基本信息', desc: '姓名/性别/民族等' },
  { title: '学籍信息', desc: '入学/状态/类型' },
  { title: '家庭信息', desc: '家庭结构/家长' },
  { title: '身心健康', desc: '身体/心理评估' },
  { title: '发展信息', desc: '特长/目标' },
  { title: '社交关系', desc: '良好/矛盾关系' },
]
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="dialogTitle"
    width="720px"
    top="5vh"
    :close-on-click-modal="false"
  >
    <div class="edit-dialog-body">
      <!-- 步骤条 -->
      <el-steps :active="activeStep" simple finish-status="success" class="step-bar">
        <el-step v-for="(s, i) in steps" :key="i" :title="s.title" @click="activeStep = i" style="cursor: pointer" />
      </el-steps>

      <div class="form-area">
        <!-- Step 0: 基本信息 -->
        <div v-show="activeStep === 0" class="step-content">
          <el-form label-width="90px" :model="form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="姓名" required>
                  <el-input v-model="form.name" placeholder="请输入姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="性别">
                  <el-radio-group v-model="form.gender">
                    <el-radio v-for="g in DICTIONARIES.gender" :key="g" :label="g">{{ g }}</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="民族">
                  <el-select v-model="form.ethnicity" filterable style="width: 100%">
                    <el-option v-for="e in ETHNICITIES" :key="e" :label="e" :value="e" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="出生年月">
                  <el-date-picker v-model="form.birthDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="form.phone" placeholder="联系电话" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="身份证号">
                  <el-input v-model="form.idCard" placeholder="身份证号" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>

        <!-- Step 1: 学籍信息 -->
        <div v-show="activeStep === 1" class="step-content">
          <el-form label-width="90px" :model="form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="入学时间">
                  <el-date-picker v-model="form.enrollmentDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="入学成绩">
                  <el-input-number v-model="form.entranceScore" :min="0" :max="800" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="学籍状态">
                  <el-select v-model="form.status" style="width: 100%">
                    <el-option v-for="s in DICTIONARIES.studentStatus" :key="s" :label="s" :value="s" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="学生类型">
                  <el-select v-model="form.type" style="width: 100%">
                    <el-option v-for="t in DICTIONARIES.studentType" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="毕业学校">
                  <el-input v-model="form.graduatedSchool" placeholder="毕业学校" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>

        <!-- Step 2: 家庭信息 -->
        <div v-show="activeStep === 2" class="step-content">
          <el-form label-width="90px" :model="form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="家庭结构">
                  <el-select v-model="form.familyStructure" style="width: 100%">
                    <el-option v-for="f in DICTIONARIES.familyStructure" :key="f" :label="f" :value="f" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="居住地址">
                  <el-input v-model="form.address" placeholder="居住地址" />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="guardian-section">
              <div class="section-header">
                <span>家长信息</span>
                <el-button type="primary" size="small" @click="addGuardian">添加家长</el-button>
              </div>
              <div v-for="(g, i) in form.guardians" :key="i" class="guardian-form-card">
                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="姓名" label-width="60px">
                      <el-input v-model="g.name" placeholder="家长姓名" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="关系" label-width="50px">
                      <el-input v-model="g.relationship" placeholder="如：父亲" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="职业" label-width="50px">
                      <el-input v-model="g.occupation" placeholder="职业" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="偏好" label-width="50px">
                      <el-select v-model="g.preference" style="width: 100%">
                        <el-option v-for="p in DICTIONARIES.commPreference" :key="p" :label="p" :value="p" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="18">
                    <el-form-item label="电话" label-width="60px">
                      <el-input v-model="g.phone" placeholder="联系电话" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-button type="danger" size="small" @click="removeGuardian(i)" style="margin-top: 4px">删除</el-button>
                  </el-col>
                </el-row>
              </div>
              <el-empty v-if="!form.guardians.length" description="暂无家长信息" :image-size="50" />
            </div>
          </el-form>
        </div>

        <!-- Step 3: 身心健康 -->
        <div v-show="activeStep === 3" class="step-content">
          <el-form label-width="90px" :model="form">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="身高(cm)">
                  <el-input-number v-model="form.height" :min="100" :max="250" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="体重(kg)">
                  <el-input-number v-model="form.weight" :min="20" :max="150" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="身体评价">
                  <el-select v-model="form.healthEvaluation" style="width: 100%">
                    <el-option v-for="h in HEALTH_EVALUATIONS" :key="h.name" :label="h.name" :value="h.name" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="疾病史">
                  <el-input v-model="form.diseaseHistory" placeholder="疾病史（无则留空）" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="情绪调节">
                  <el-select v-model="form.emotionType" style="width: 100%">
                    <el-option v-for="t in PSYCHOLOGY.emotionTypes" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="社交模式">
                  <el-select v-model="form.socialType" style="width: 100%">
                    <el-option v-for="t in PSYCHOLOGY.socialTypes" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="学习心理">
                  <el-select v-model="form.learningPsychology" style="width: 100%">
                    <el-option v-for="t in PSYCHOLOGY.learningTypes" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>

        <!-- Step 4: 发展信息 -->
        <div v-show="activeStep === 4" class="step-content">
          <el-form label-width="90px" :model="form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="特长">
                  <el-input v-model="form.specialty" placeholder="特长" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="爱好">
                  <el-input v-model="form.hobby" placeholder="爱好" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="梦想">
                  <el-input v-model="form.dream" placeholder="梦想" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="短期目标">
                  <el-input v-model="form.shortTermGoal" placeholder="短期目标" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="中期目标">
                  <el-input v-model="form.midTermGoal" placeholder="中期目标" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="长期目标">
                  <el-input v-model="form.longTermGoal" placeholder="长期目标" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>

        <!-- Step 5: 社交关系 -->
        <div v-show="activeStep === 5" class="step-content">
          <el-form label-width="90px" :model="form">
            <el-form-item label="良好关系">
              <el-select
                v-model="form.goodRelations"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入良好关系学生"
                style="width: 100%"
              >
                <el-option v-for="n in allNames" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>
            <el-form-item label="矛盾关系">
              <el-select
                v-model="form.conflictRelations"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入矛盾关系学生"
                style="width: 100%"
              >
                <el-option v-for="n in allNames" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 步骤导航 -->
      <div class="step-nav">
        <el-button :disabled="activeStep === 0" @click="activeStep--">上一步</el-button>
        <el-button v-if="activeStep < steps.length - 1" type="primary" @click="activeStep++">下一步</el-button>
        <el-button v-if="activeStep === steps.length - 1" type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.edit-dialog-body {
  .step-bar {
    margin-bottom: 20px;
    padding: 10px 0;
  }

  .form-area {
    min-height: 240px;
  }

  .step-content {
    animation: fadeIn 0.2s;
  }

  .step-nav {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-color);
  }

  .guardian-section {
    margin-top: 12px;

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 600;
      font-size: 14px;
    }

    .guardian-form-card {
      background: var(--bg-page);
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 10px;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
