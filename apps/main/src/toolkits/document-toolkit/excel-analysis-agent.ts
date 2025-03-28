import path from 'node:path';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { lastValueFrom } from 'rxjs';
import { BaseAgent } from '../../agent/base-agent.js';
import type { AgentTaskRef } from '../../agent/type.js';
import type { SpecializedToolAgent } from '../types.js';

// 定义单元格值类型
type CellValue = string | number | boolean | Date | null | undefined;

// 定义行数据类型
interface RowData {
  [key: string]: CellValue;
}

// 定义工作表数据类型
interface SheetData {
  [sheetName: string]: RowData[];
}

interface ExcelParseResult {
  totalSheets: number;
  analyzedSheets: number;
  summary: string;
  analysis?: string;
  data?: SheetData;
  error?: string;
}

export class ExcelAnalysisAgent extends BaseAgent implements SpecializedToolAgent {
  override name = 'ExcelAnalysisTool';

  description =
    'Excel Spreadsheet Analysis Tool, capable of extracting and analyzing data from Excel files';

  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Excel file URL or local path' },
      sheetName: {
        type: 'string',
        description:
          'Specify the worksheet name to analyze; if not specified, all worksheets will be analyzed',
      },
      requirement: {
        type: 'string',
        description: 'Specify the content or task requirements to analyze from the Excel file',
      },
    },
    required: ['url'],
  };

  strict = true;

  async execute(query: Record<string, string>, taskRef: AgentTaskRef): Promise<ExcelParseResult> {
    const { url, sheetName, requirement } = query;
    const workbook = new ExcelJS.Workbook();

    try {
      // 处理本地路径或URL
      if (url.startsWith('http')) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await workbook.xlsx.load(response.data);
      } else {
        await workbook.xlsx.readFile(path.resolve(url));
      }

      const result: SheetData = {};
      let analyzedSheets = 0;

      // 如果指定了特定工作表，则只分析该工作表
      if (sheetName) {
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) {
          return {
            totalSheets: workbook.worksheets.length,
            analyzedSheets: 0,
            summary: '',
            error: `Worksheet "${sheetName}" does not exist`,
          };
        }
        result[sheetName] = this.extractSheetData(sheet);
        analyzedSheets = 1;
      } else {
        // 否则分析所有工作表
        workbook.eachSheet((sheet) => {
          result[sheet.name] = this.extractSheetData(sheet);
          analyzedSheets++;
        });
      }

      // 如果有特定需求，进一步分析数据
      let analysis = '';
      if (requirement) {
        analysis = await this.analyzeExcelContent(result, requirement, taskRef);
      }

      return {
        totalSheets: workbook.worksheets.length,
        analyzedSheets,
        data: result,
        analysis,
        summary: 'Successfully extracted Excel file data',
      };
    } catch (error) {
      return {
        totalSheets: 0,
        analyzedSheets: 0,
        summary: '',
        error: `Error analyzing Excel file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private extractSheetData(sheet: ExcelJS.Worksheet): RowData[] {
    const data: RowData[] = [];
    const headers: string[] = [];

    // 提取表头
    if (sheet.rowCount > 0) {
      sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString() || `列${colNumber}`;
      });
    }

    // 提取数据行
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头行

      const rowData: RowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1] || `列${colNumber}`;
        rowData[header] = cell.value as CellValue;
      });

      data.push(rowData);
    });

    return data;
  }

  private async analyzeExcelContent(
    data: SheetData,
    requirement: string,
    taskRef: AgentTaskRef,
  ): Promise<string> {
    let excelContent = '';

    // 构建Excel数据的文本表示
    for (const sheetName in data) {
      excelContent += `Worksheet: ${sheetName}\n`;

      const rows = data[sheetName];
      if (rows.length === 0) {
        excelContent += 'No data in this worksheet.\n';
      } else {
        // 添加表格列名
        const headers = Object.keys(rows[0]);
        excelContent += `Columns: ${headers.join(', ')}\n`;
        excelContent += `Row count: ${rows.length}\n`;

        // 添加样本数据 (最多5行)
        excelContent += 'Sample data:\n';
        const sampleRows = rows.slice(0, 5);
        for (let i = 0; i < sampleRows.length; i++) {
          excelContent += `Row ${i + 1}: ${JSON.stringify(sampleRows[i])}\n`;
        }
      }

      excelContent += '\n---\n\n';
    }

    this.initialSystemMessage(`
      You are a professional Excel data analysis expert with the following capabilities and responsibilities:
      1. Extract and summarize core data and patterns from Excel spreadsheets
      2. Identify data structure, relationships, and inconsistencies
      3. Analyze numerical data, tables, and potential insights
      4. Provide targeted data analysis based on user requirements
      5. Present spreadsheet content objectively without adding assumptions
      
      When analyzing, please note:
      - Maintain a professional, objective language style
      - Adjust analysis methods according to data type (financial, statistical, inventory, etc.)
      - Provide structured analysis results for easy understanding
      - Honestly indicate unclear or potentially problematic data
      - Mention if content appears to be incomplete
    `);

    const result = await this.run(
      `
      I need you to analyze the following Excel spreadsheet data. Analysis requirements: ${requirement}
      
      Please analyze according to the following structure:
      1. Basic spreadsheet information (file structure, worksheets, data volume)
      2. Data structure overview (organization, column types, relationships between sheets if evident)
      3. Core data summary (key patterns, distributions, outliers)
      4. Important insights and findings (key statistics, trends, anomalies)
      5. Specific analysis for user requirements: ${requirement}
      6. Data quality observations and other noteworthy points
      
      Here is the Excel spreadsheet content:
      ${excelContent}
    `,
      taskRef,
      [],
      {},
      'LONG_TEXT',
    );

    if (!result) {
      throw new Error('Failed to analyze Excel content');
    }

    return await lastValueFrom(result?.contentStream);
  }
}
