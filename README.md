# 班级综合管理系统 (Class Academic Record)

基于 Vue 3 重构的班级综合管理分析系统，原系统为 Excel + VBA 实现（v1.71）。

## 技术栈

- Vue 3 + Composition API + TypeScript
- Vite + Pinia + Vue Router
- Element Plus（UI 组件库，自动按需导入）
- ECharts + vue-echarts（数据可视化）
- SCSS（样式预处理）
- unplugin-auto-import / unplugin-vue-components（自动导入）

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 班级分析 | /class-analysis | 多维筛选联动 + 14 个可视化图表 |
| 个体分析 | /individual-analysis | 单生学情深度分析 + 9 个图表 |
| 学生档案 | /student-archives | 学生全维度档案 CRUD + 行为记录 |
| 成绩管理 | /score-management | 成绩录入/导入 + 明细数据库 |
| 座位排布 | /seating | 按身高排序 + 同性同桌优先算法 |
| 卫生值日 | /cleaning | 随机分组 + 男女均衡分配 |
| 课程表 | /schedule | 周课表展示与编辑 |
| 系统配置 | /settings | 学科/评价/心理/健康/词典配置 |

## 项目结构

```
src/
├── assets/styles/       # 全局样式
├── components/
│   ├── charts/          # ECharts 图表组件
│   └── common/          # 通用组件
├── layouts/             # 布局组件（MainLayout）
├── router/              # 路由配置
├── stores/              # Pinia 状态管理
├── types/               # TypeScript 类型定义 + 自动生成声明
├── utils/               # 工具函数 + 全局常量
└── views/               # 页面组件
    ├── class-analysis/
    ├── individual-analysis/
    ├── student-archives/
    ├── score-management/
    ├── seating/
    ├── cleaning/
    ├── schedule/
    └── settings/
```

## 开发命令

```sh
pnpm install      # 安装依赖
pnpm run dev      # 启动开发服务器
pnpm run build    # 类型检查 + 生产构建
pnpm run preview  # 预览生产构建
pnpm run lint     # 代码检查
```
