<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, RadarChart, LineChart, ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  BarChart,
  PieChart,
  RadarChart,
  LineChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  ToolboxComponent,
])

const props = defineProps<{
  option: EChartsOption
  height?: string
}>()

const chartHeight = computed(() => props.height ?? '300px')
</script>

<template>
  <VChart :option="props.option" :style="{ height: chartHeight, width: '100%' }" autoresize />
</template>
