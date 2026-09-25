<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  DataAnalysis,
  User,
  Files,
  Document,
  Grid,
  Brush,
  Calendar,
  Setting,
} from '@element-plus/icons-vue'

const route = useRoute()

const menuItems = [
  { index: '/class-analysis', title: '班级分析', icon: DataAnalysis },
  { index: '/individual-analysis', title: '个体分析', icon: User },
  { index: '/student-archives', title: '学生档案', icon: Files },
  { index: '/score-management', title: '成绩管理', icon: Document },
  { index: '/seating', title: '座位排布', icon: Grid },
  { index: '/cleaning', title: '卫生值日', icon: Brush },
  { index: '/schedule', title: '课程表', icon: Calendar },
  { index: '/settings', title: '系统配置', icon: Setting },
]

const currentTitle = computed(() => (route.meta.title as string) || '班级综合管理系统')
</script>

<template>
  <div class="app-layout">
    <!-- 侧边导航 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-icon">
          <el-icon :size="24"><DataAnalysis /></el-icon>
        </div>
        <span class="logo-text">班级综合管理</span>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in menuItems"
          :key="item.index"
          :to="item.index"
          class="nav-item"
          :class="{ active: route.path === item.index }"
        >
          <el-icon :size="18"><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </RouterLink>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <header class="page-header">
        <h1>{{ currentTitle }}</h1>
      </header>
      <div class="page-body">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  background: linear-gradient(180deg, var(--primary-dark) 0%, var(--primary-color) 100%);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 100;

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 16px;
    color: #fff;

    .logo-icon {
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        color: #fff;
        background: rgba(255, 255, 255, 0.2);
        font-weight: 500;
      }

      .el-icon {
        flex-shrink: 0;
      }
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .page-header {
    height: 56px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;

    h1 {
      font-size: 17px;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .page-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
}
</style>
