import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/class-analysis',
    children: [
      {
        path: 'class-analysis',
        name: 'class-analysis',
        meta: { title: '班级分析', icon: 'DataAnalysis' },
        component: () => import('@/views/class-analysis/ClassAnalysisView.vue'),
      },
      {
        path: 'individual-analysis',
        name: 'individual-analysis',
        meta: { title: '个体分析', icon: 'User' },
        component: () => import('@/views/individual-analysis/IndividualAnalysisView.vue'),
      },
      {
        path: 'student-archives',
        name: 'student-archives',
        meta: { title: '学生档案', icon: 'Files' },
        component: () => import('@/views/student-archives/StudentArchivesView.vue'),
      },
      {
        path: 'score-management',
        name: 'score-management',
        meta: { title: '成绩管理', icon: 'Document' },
        component: () => import('@/views/score-management/ScoreManagementView.vue'),
      },
      {
        path: 'seating',
        name: 'seating',
        meta: { title: '座位排布', icon: 'Grid' },
        component: () => import('@/views/seating/SeatingView.vue'),
      },
      {
        path: 'cleaning',
        name: 'cleaning',
        meta: { title: '卫生值日', icon: 'Brush' },
        component: () => import('@/views/cleaning/CleaningView.vue'),
      },
      {
        path: 'schedule',
        name: 'schedule',
        meta: { title: '课程表', icon: 'Calendar' },
        component: () => import('@/views/schedule/ScheduleView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        meta: { title: '系统配置', icon: 'Setting' },
        component: () => import('@/views/settings/SettingsView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
