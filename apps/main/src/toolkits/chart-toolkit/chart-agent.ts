import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from 'canvas';
import { Chart } from 'chart.js/auto';
import { app } from 'electron';
import yaml from 'js-yaml';
import { BaseAgent } from '../../agent/base-agent.js';
import type { SpecializedToolAgent } from '../types.js';

// 图表类型定义
type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap';
type ThemeType = 'light' | 'dark' | 'default';

// 数据集接口
interface DatasetItem {
  name?: string;
  values: number[];
}

// 坐标轴配置接口
interface AxisConfig {
  name?: string;
  data?: string[];
  min?: number;
  max?: number;
}

// 图表配置接口
interface ChartConfig {
  type: ChartType;
  title?: string;
  data: DatasetItem[] | Record<string, number>;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  width?: number;
  height?: number;
  theme?: ThemeType;
}

// 图表结果接口
interface ChartResult {
  chartData: ChartConfig;
  localPath: string;
}

export class ChartAgent extends BaseAgent implements SpecializedToolAgent {
  name = 'ChartAgent';

  description = 'Chart agent';

  parameters = {
    type: 'object',
    properties: {
      chartType: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'scatter', 'area', 'radar', 'heatmap'],
        description: '要生成的图表类型',
      },
      title: {
        type: 'string',
        description: '图表的标题',
      },
      data: {
        type: 'object',
        description: '图表数据，可以是数组或对象，取决于图表类型',
      },
      xAxis: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'X轴名称' },
          data: { type: 'array', items: { type: 'string' }, description: 'X轴数据类别' },
        },
        description: 'X轴配置（适用于柱状图、折线图等）',
      },
      yAxis: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Y轴名称' },
          min: { type: 'number', description: 'Y轴最小值' },
          max: { type: 'number', description: 'Y轴最大值' },
        },
        description: 'Y轴配置（适用于柱状图、折线图等）',
      },
      width: {
        type: 'number',
        description: '图表宽度（像素）',
      },
      height: {
        type: 'number',
        description: '图表高度（像素）',
      },
      theme: {
        type: 'string',
        enum: ['light', 'dark', 'default'],
        description: '图表主题',
      },
    },
    required: ['chartType', 'data'],
  };

  strict = true;

  async execute(query: Record<string, string>): Promise<string> {
    // 解析查询参数
    const chartType = query.chartType as ChartType;
    const data = typeof query.data === 'string' ? JSON.parse(query.data) : query.data;
    const title = query.title;
    const xAxis = typeof query.xAxis === 'string' ? JSON.parse(query.xAxis) : query.xAxis;
    const yAxis = typeof query.yAxis === 'string' ? JSON.parse(query.yAxis) : query.yAxis;
    const width = query.width ? Number.parseInt(query.width) : 800;
    const height = query.height ? Number.parseInt(query.height) : 600;
    const theme = (query.theme || 'default') as ThemeType;

    // 构建图表配置
    const chartConfig: ChartConfig = {
      type: chartType,
      title,
      data,
      xAxis,
      yAxis,
      width,
      height,
      theme,
    };

    // 调用图表生成服务
    const chartResult = await this.generateChart(chartConfig);

    // TODO: 使用 taskRef 收集这张图片

    return yaml.dump({
      message: 'Generated chart',
      chartPath: chartResult.localPath,
      configuration: chartResult.chartData,
      usage: `You can use FileTools to read this image file, path: ${chartResult.localPath}`,
    });
  }

  // 图表生成工具方法
  private async generateChart(config: ChartConfig): Promise<ChartResult> {
    // 创建临时目录用于存储生成的图表
    const chartDir = path.join(app.getPath('userData'), 'charts');
    if (!fs.existsSync(chartDir)) {
      fs.mkdirSync(chartDir, { recursive: true });
    }

    // 创建画布
    const canvas = createCanvas(config.width || 800, config.height || 600);
    const ctx = canvas.getContext('2d');

    // 根据图表类型和数据准备配置
    type ChartDataset = {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string | string[];
      fill?: boolean;
    };

    interface ChartDataConfig {
      labels: string[];
      datasets: ChartDataset[];
    }

    interface ChartOptionsConfig {
      responsive: boolean;
      maintainAspectRatio: boolean;
      plugins: {
        title: {
          display: boolean;
          text: string;
        };
        legend: {
          display: boolean;
        };
      };
      scales?: {
        y?: {
          title: {
            display: boolean;
            text: string;
          };
          min?: number;
          max?: number;
        };
        x?: {
          title: {
            display: boolean;
            text: string;
          };
        };
      };
    }

    let chartData: ChartDataConfig = { labels: [], datasets: [] };
    let chartOptions: ChartOptionsConfig = {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!config.title,
          text: config.title || '',
        },
        legend: {
          display: true,
        },
      },
    };

    // 根据不同图表类型处理数据
    switch (config.type) {
      case 'bar':
      case 'line':
      case 'area': {
        const isArea = config.type === 'area';
        chartData = {
          labels: config.xAxis?.data || [],
          datasets: Array.isArray(config.data)
            ? (config.data as DatasetItem[]).map((dataset, index) => ({
                label: dataset.name || `数据系列 ${index + 1}`,
                data: dataset.values,
                backgroundColor: this.getColor(index, true),
                borderColor: this.getColor(index, false),
                fill: isArea,
              }))
            : [
                {
                  label: '数据',
                  data: Object.values(config.data as Record<string, number>),
                  backgroundColor: this.getColor(0, true),
                  borderColor: this.getColor(0, false),
                  fill: isArea,
                },
              ],
        };

        if (config.yAxis) {
          chartOptions = {
            ...chartOptions,
            scales: {
              y: {
                title: {
                  display: !!config.yAxis.name,
                  text: config.yAxis.name || '',
                },
                min: config.yAxis.min,
                max: config.yAxis.max,
              },
              x: {
                title: {
                  display: !!config.xAxis?.name,
                  text: config.xAxis?.name || '',
                },
              },
            },
          };
        }
        break;
      }

      case 'pie':
      case 'radar': {
        const labels = config.xAxis?.data || Object.keys(config.data as Record<string, number>);
        const values = Array.isArray(config.data)
          ? (config.data as DatasetItem[]).flatMap((item) => item.values)
          : Object.values(config.data as Record<string, number>);

        chartData = {
          labels,
          datasets: [
            {
              label: config.title || '数据',
              data: values,
              backgroundColor: labels.map((_, index) => this.getColor(index, true)),
              borderColor: labels.map((_, index) => this.getColor(index, false)),
            },
          ],
        };
        break;
      }

      default:
        throw new Error(`不支持的图表类型: ${config.type}`);
    }

    // 创建图表
    const chart = new Chart(ctx, {
      type: config.type === 'area' ? 'line' : config.type,
      data: chartData,
      options: chartOptions,
    });

    chart.render();

    // 渲染图表并保存为图片
    const fileName = `chart-${Date.now()}.png`;
    const filePath = path.join(chartDir, fileName);

    // 将 canvas 转换为图片并保存
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    // 生成可访问的文件路径 (file:// URL)
    const fileUrl = `file://${filePath}`;

    return {
      chartData: config,
      localPath: filePath,
    };
  }

  // 辅助方法：生成颜色
  private getColor(index: number, withAlpha = false): string {
    const colors = [
      'rgb(54, 162, 235)',
      'rgb(255, 99, 132)',
      'rgb(255, 206, 86)',
      'rgb(75, 192, 192)',
      'rgb(153, 102, 255)',
      'rgb(255, 159, 64)',
      'rgb(199, 199, 199)',
    ];

    const color = colors[index % colors.length];
    if (withAlpha) {
      return color.replace('rgb', 'rgba').replace(')', ', 0.6)');
    }
    return color;
  }
}
