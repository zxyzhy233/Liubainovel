/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { hilog } from '@kit.PerformanceAnalysisKit';
import { bookSourceManager } from './BookSourceManager';
import { ChapterInfo } from '../models/BookSourceModel';
import { ChapterDownloadInfo } from '../models/OnlineBookModel';
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { fileIo as fs } from '@kit.CoreFileKit';
import { common } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { util } from '@kit.ArkTS';

const TAG: string = 'DownloadManager';

/**
 * 下载任务
 */
interface DownloadTask {
  bookId: number;
  bookTitle: string;
  chapters: ChapterInfo[];
  currentIndex: number;
  isRunning: boolean;
  onProgress?: (current: number, total: number) => void;
  onComplete?: () => void;
}

/**
 * 章节下载管理器
 */
class DownloadManager {
  private downloadTasks: Map<number, DownloadTask> = new Map();
  private context: common.UIAbilityContext | null = null;
  private downloadDir: string = '';

  /**
   * 初始化下载管理器
   */
  init(context: common.UIAbilityContext): void {
    this.context = context;
    
    try {
      // 使用应用缓存目录存储下载的章节
      this.downloadDir = `${context.cacheDir}/chapters`;
      
      // 创建下载目录
      if (!fs.accessSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, true);
        hilog.info(0x0000, TAG, `成功创建下载目录: ${this.downloadDir}`);
      }
      
      hilog.info(0x0000, TAG, `下载管理器初始化成功,目录: ${this.downloadDir}`);
    } catch (error) {
      const err: BusinessError = error as BusinessError;
      hilog.error(0x0000, TAG, `初始化下载目录失败: code=${err.code}, message=${err.message}`);
    }
  }

  /**
   * 开始下载书籍的所有章节
   */
  async startDownloadBook(
    bookId: number, 
    bookTitle: string, 
    chapters: ChapterInfo[],
    onProgress?: (current: number, total: number) => void,
    onComplete?: () => void
  ): Promise<void> {
    if (this.downloadTasks.has(bookId)) {
      hilog.warn(0x0000, TAG, `书籍 ${bookTitle} 已在下载队列中`);
      return;
    }

    const task: DownloadTask = {
      bookId: bookId,
      bookTitle: bookTitle,
      chapters: chapters,
      currentIndex: 0,
      isRunning: true,
      onProgress: onProgress,
      onComplete: onComplete
    };

    this.downloadTasks.set(bookId, task);
    hilog.info(0x0000, TAG, `开始下载书籍: ${bookTitle}, 共 ${chapters.length} 章`);

    // 异步下载章节
    this.downloadChaptersSequentially(task);
  }

  /**
   * 下载单个章节
   */
  async downloadChapter(bookId: number, bookTitle: string, chapter: ChapterInfo, chapterIndex: number): Promise<boolean> {
    try {
      hilog.info(0x0000, TAG, `开始下载章节: ${chapter.title}`);

      // 检查是否已下载
      const existingChapter = await onlineBookDataManager.queryChapterDownload(bookId, chapterIndex);
      if (existingChapter && existingChapter.isDownloaded) {
        hilog.info(0x0000, TAG, `章节已下载: ${chapter.title}`);
        return true;
      }

      // 使用bookSourceManager获取章节正文内容
      let content: string = '';
      try {
        const contentResult = await bookSourceManager.getChapterContent(chapter.url);
        
        if (!contentResult.success || !contentResult.data) {
          hilog.error(0x0000, TAG, `获取章节内容失败: ${chapter.title}, 错误: ${contentResult.error || '未知错误'}`);
          return false;
        }
        
        content = contentResult.data;
        
        if (!content || content.length === 0) {
          hilog.error(0x0000, TAG, `章节内容为空: ${chapter.title}`);
          return false;
        }
        
        hilog.info(0x0000, TAG, `成功获取章节内容: ${chapter.title}, 长度: ${content.length}`);
      } catch (error) {
        hilog.error(0x0000, TAG, `获取章节内容异常: ${chapter.title}, 错误: ${JSON.stringify(error)}`);
        return false;
      }

      // 格式化章节内容，去除多余换行符
      content = this.normalizeChapterContent(content);

      // 保存章节到文件 - 使用书名避免不同书籍相同ID的覆盖问题
      // 将书名中的特殊字符替换为下划线
      const safeBookTitle = this.getSafeFileName(bookTitle);
      const fileName = `${safeBookTitle}_${bookId}_${chapterIndex}.txt`;
      const filePath = `${this.downloadDir}/${fileName}`;
      
      try {
        // 构建标准TXT格式：章节标题 + 空行 + 正文内容
        const formattedContent = `${chapter.title}\n\n${content}`;
        
        // 使用TextEncoder确保UTF-8编码正确
        const encoder = util.TextEncoder.create();
        const uint8Array = encoder.encodeInto(formattedContent);
        
        const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC);
        fs.writeSync(file.fd, uint8Array.buffer);
        fs.closeSync(file);
        hilog.info(0x0000, TAG, `章节文件保存成功: ${filePath}, 大小: ${uint8Array.length} 字节`);
      } catch (error) {
        hilog.error(0x0000, TAG, `保存章节文件失败: ${JSON.stringify(error)}`);
        return false;
      }

      // 保存章节下载信息到数据库
      const chapterDownloadInfo = new ChapterDownloadInfo();
      chapterDownloadInfo.bookId = bookId;
      chapterDownloadInfo.chapterIndex = chapterIndex;
      chapterDownloadInfo.chapterTitle = chapter.title;
      chapterDownloadInfo.chapterUrl = chapter.url;
      chapterDownloadInfo.content = content;
      chapterDownloadInfo.isDownloaded = true;
      chapterDownloadInfo.filePath = filePath;

      await onlineBookDataManager.saveChapterDownload(chapterDownloadInfo);
      hilog.info(0x0000, TAG, `章节下载完成: ${chapter.title}`);

      return true;
    } catch (error) {
      hilog.error(0x0000, TAG, `下载章节失败: ${chapter.title}, 错误: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /**
   * 并发下载章节（优化版：使用多WebView实例并发下载）
   */
  private async downloadChaptersSequentially(task: DownloadTask): Promise<void> {
    hilog.info(0x0000, TAG, `开始并发下载: ${task.bookTitle}, 共 ${task.chapters.length} 章`);
    
    const concurrency = 3; // 并发数量，对应3个WebView实例
    const delayBetweenBatches = 500; // 每批次间延迟500ms，避免触发反爬虫机制
    
    while (task.isRunning && task.currentIndex < task.chapters.length) {
      // 获取当前批次的章节（最多3章）
      const batchStart = task.currentIndex;
      const batchEnd = Math.min(batchStart + concurrency, task.chapters.length);
      const batchChapters = task.chapters.slice(batchStart, batchEnd);
      
      hilog.info(0x0000, TAG, `下载批次: 章节 ${batchStart + 1}-${batchEnd}/${task.chapters.length}`);
      
      // 并发下载当前批次的章节
      const downloadPromises = batchChapters.map((chapter, index) => 
        this.downloadChapter(task.bookId, task.bookTitle, chapter, batchStart + index)
      );
      
      // 等待当前批次全部完成
      const results = await Promise.all(downloadPromises);
      
      // 统计成功数量
      const successCount = results.filter(success => success).length;
      task.currentIndex = batchEnd;
      
      hilog.info(0x0000, TAG, `批次完成: ${successCount}/${batchChapters.length} 章成功, 总进度: ${task.currentIndex}/${task.chapters.length}`);
      
      // 调用进度回调
      if (task.onProgress) {
        task.onProgress(task.currentIndex, task.chapters.length);
      }
      
      // 批次间延迟300ms，避免请求过快
      if (task.currentIndex < task.chapters.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    if (task.currentIndex >= task.chapters.length) {
      hilog.info(0x0000, TAG, `书籍下载完成: ${task.bookTitle}`);
      
      // 下载完成后自动合并章节
      hilog.info(0x0000, TAG, `开始合并章节: ${task.bookTitle}`);
      const mergedFilePath = await this.mergeChapters(task.bookId, task.bookTitle, task.chapters);
      
      if (mergedFilePath) {
        hilog.info(0x0000, TAG, `章节合并完成: ${mergedFilePath}`);
      } else {
        hilog.error(0x0000, TAG, `章节合并失败`);
      }
      
      // 调用完成回调
      if (task.onComplete) {
        task.onComplete();
      }
      
      this.downloadTasks.delete(task.bookId);
    }
  }

  /**
   * 停止下载任务
   */
  stopDownload(bookId: number): void {
    const task = this.downloadTasks.get(bookId);
    if (task) {
      task.isRunning = false;
      this.downloadTasks.delete(bookId);
      hilog.info(0x0000, TAG, `停止下载: ${task.bookTitle}`);
    }
  }

  /**
   * 获取下载进度
   */
  getDownloadProgress(bookId: number): number {
    const task = this.downloadTasks.get(bookId);
    if (!task) {
      return 0;
    }
    return Math.round((task.currentIndex / task.chapters.length) * 100);
  }

  /**
   * 检查是否正在下载
   */
  isDownloading(bookId: number): boolean {
    return this.downloadTasks.has(bookId);
  }

  /**
   * 获取安全的文件名（移除特殊字符）
   */
  private getSafeFileName(fileName: string): string {
    // 替换文件名中的特殊字符为下划线
    return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 50);
  }

  /**
   * 读取已下载的章节内容
   */
  async readChapterContent(bookId: number, bookTitle: string, chapterIndex: number): Promise<string> {
    try {
      // 先从数据库查询
      const chapter = await onlineBookDataManager.queryChapterDownload(bookId, chapterIndex);
      if (chapter && chapter.isDownloaded) {
        // 如果有文件路径且文件存在，从文件读取
        if (chapter.filePath && fs.accessSync(chapter.filePath)) {
          const file = fs.openSync(chapter.filePath, fs.OpenMode.READ_ONLY);
          const stat = fs.statSync(chapter.filePath);
          const buffer = new ArrayBuffer(stat.size);
          fs.readSync(file.fd, buffer);
          fs.closeSync(file);
          
          const uint8Array = new Uint8Array(buffer);
          // 使用TextDecoder正确解码UTF-8
          const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true });
          const textContent: string = decoder.decodeToString(uint8Array);
          return textContent;
        }
        
        // 否则返回数据库中的内容
        return chapter.content || '';
      }
      
      return '';
    } catch (error) {
      hilog.error(0x0000, TAG, `读取章节内容失败: ${JSON.stringify(error)}`);
      return '';
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * 标准化章节内容格式（复制自BookSourceParser）
   * @param content 原始章节内容
   * @returns 格式化后的内容
   */
  private normalizeChapterContent(content: string): string {
    if (!content) {
      return '';
    }

    // 1. 先处理HTML换行标签，统一转换为换行符
    let normalized = content
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')  // <br /><br /> 或 <br><br> 转换为段落分隔
      .replace(/<br\s*\/?>/gi, '\n')                 // 单个 <br /> 或 <br> 转换为换行
      .replace(/<p[^>]*>/gi, '\n')                   // <p> 标签转换为换行
      .replace(/<\/p>/gi, '\n')                      // </p> 标签转换为换行
      .replace(/<div[^>]*>/gi, '\n')                 // <div> 标签转换为换行
      .replace(/<\/div>/gi, '\n')                    // </div> 标签转换为换行

    // 2. 清理多余的空白字符
    normalized = normalized
      .replace(/\r\n/g, '\n')                     // 统一换行符为 \n
      .replace(/\r/g, '\n')                       // 统一换行符为 \n
      .replace(/[ \t]+/g, ' ')                    // 将多个空格/制表符合并为一个空格
      .replace(/\n{3,}/g, '\n\n')                 // 将3个及以上连续换行符替换为2个（段落分隔）
      .replace(/^\n+|\n+$/g, '');                 // 移除开头和结尾的换行符

    // 3. 过滤广告和无关内容
    normalized = this.filterAdvertisements(normalized);

    // 4. 按段落分割并处理
    const paragraphs = normalized.split('\n\n');
    const formattedParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
      // 移除段落首尾空白
      const trimmed = paragraph.trim();
      
      if (trimmed.length === 0) {
        continue; // 跳过空段落
      }

      // 检查段落是否已经有缩进（全角空格或多个空格开头）
      const hasIndent = trimmed.startsWith('　') || trimmed.startsWith('  ');
      
      // 如果没有缩进，添加两个全角空格
      const formatted = hasIndent ? trimmed : `　　${trimmed}`;
      formattedParagraphs.push(formatted);
    }

    // 5. 用双换行符连接所有段落
    return formattedParagraphs.join('\n\n');
  }

  /**
   * 过滤广告和无关内容（复制自BookSourceParser）
   * @param content 原始内容
   * @returns 过滤后的内容
   */
  private filterAdvertisements(content: string): string {
    // 定义需要过滤的广告模式
    const adPatterns = [
      /^请收藏本站[：:].*/gi,           // 匹配"请收藏本站：xxx"
      /^手机版[：:].*/gi,                // 匹配"手机版：xxx"
      /^本站地址[：:].*/gi,              // 匹配"本站地址：xxx"
      /^最新网址[：:].*/gi,              // 匹配"最新网址：xxx"
      /^永久地址[：:].*/gi,              // 匹配"永久地址：xxx"
      /^记住网址[：:].*/gi,              // 匹配"记住网址：xxx"
      /^.*www\.[a-zA-Z0-9-]+\.(com|cn|net|org).*$/gi,  // 匹配包含网址的行
      /^.*http[s]?:\/\/.*$/gi,           // 匹配包含http链接的行
      /^.*\d+\.\d+\.\d+\.\d+.*$/g        // 匹配包含IP地址的行
    ];

    // 按行分割内容
    const lines = content.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过空行
      if (trimmedLine.length === 0) {
        filteredLines.push(line);
        continue;
      }

      // 检查是否匹配任何广告模式
      let isAd = false;
      for (const pattern of adPatterns) {
        if (pattern.test(trimmedLine)) {
          isAd = true;
          hilog.info(0x0000, TAG, `过滤广告内容: ${trimmedLine.substring(0, 50)}`);
          break;
        }
      }

      // 如果不是广告，保留该行
      if (!isAd) {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  /**
   * 清理下载文件
   */
  async clearDownloads(bookId: number, bookTitle: string): Promise<void> {
    try {
      // 查询所有章节
      const statusMap = await onlineBookDataManager.queryBookChaptersDownloadStatus(bookId);
      const safeBookTitle = this.getSafeFileName(bookTitle);
      
      // 删除文件
      statusMap.forEach((isDownloaded: boolean, chapterIndex: number) => {
        const fileName = `${safeBookTitle}_${bookId}_${chapterIndex}.txt`;
        const filePath = `${this.downloadDir}/${fileName}`;
        
        if (fs.accessSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // 删除合并文件
      const mergedFilePath = `${this.downloadDir}/${safeBookTitle}_${bookId}_merged.txt`;
      if (fs.accessSync(mergedFilePath)) {
        fs.unlinkSync(mergedFilePath);
      }

      hilog.info(0x0000, TAG, `清理下载文件完成: bookId=${bookId}, bookTitle=${bookTitle}`);
    } catch (error) {
      hilog.error(0x0000, TAG, `清理下载文件失败: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 合并所有章节为一个完整文件
   * @param bookId 书籍ID
   * @param bookTitle 书籍标题
   * @param chapters 章节列表
   * @returns 返回合并后的文件路径，失败返回null
   */
  async mergeChapters(bookId: number, bookTitle: string, chapters: ChapterInfo[]): Promise<string | null> {
    try {
      const safeBookTitle = this.getSafeFileName(bookTitle);
      const mergedFilePath = `${this.downloadDir}/${safeBookTitle}_${bookId}_merged.txt`;
      
      // 检查合并文件是否已存在
      if (fs.accessSync(mergedFilePath)) {
        hilog.info(0x0000, TAG, `合并文件已存在: ${mergedFilePath}`);
        return mergedFilePath;
      }
      
      hilog.info(0x0000, TAG, `开始合并章节: ${bookTitle}, 共 ${chapters.length} 章`);
      
      // 创建合并文件
      const file = fs.openSync(mergedFilePath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
      
      let mergedContent = '';
      let successCount = 0;
      
      // 按顺序读取并合并每一章
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        
        // 查询章节下载信息
        const chapterDownloadInfo = await onlineBookDataManager.queryChapterDownload(bookId, i);
        
        if (chapterDownloadInfo && chapterDownloadInfo.isDownloaded) {
          let chapterContent = '';
          
          // 优先从文件读取
          if (chapterDownloadInfo.filePath && fs.accessSync(chapterDownloadInfo.filePath)) {
            const chapterFile = fs.openSync(chapterDownloadInfo.filePath, fs.OpenMode.READ_ONLY);
            const stat = fs.statSync(chapterDownloadInfo.filePath);
            const buffer = new ArrayBuffer(stat.size);
            fs.readSync(chapterFile.fd, buffer);
            fs.closeSync(chapterFile);
            
            const uint8Array = new Uint8Array(buffer);
            const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true });
            chapterContent = decoder.decodeToString(uint8Array);
          } else if (chapterDownloadInfo.content) {
            // 从数据库读取
            chapterContent = chapterDownloadInfo.content;
          }
          
          if (chapterContent && chapterContent.length > 0) {
            // 添加章节内容（标准TXT格式）
            // 注意：chapterContent 已经包含了章节标题（在 downloadChapter 中添加的）
            // 如果不是第一章，先添加空行作为章节分隔
            if (successCount > 0) {
              mergedContent += '\n\n\n';
            }
            // 对章节内容进行格式化处理后再添加
             const formattedContent = this.normalizeChapterContent(chapterContent);
            // 直接添加章节内容（已包含标题）
            mergedContent += formattedContent;
            successCount++;
            
            hilog.info(0x0000, TAG, `合并章节 ${i + 1}/${chapters.length}: ${chapter.title}`);
          } else {
            hilog.warn(0x0000, TAG, `章节内容为空，跳过: ${chapter.title}`);
          }
        } else {
          hilog.warn(0x0000, TAG, `章节未下载，跳过: ${chapter.title}`);
        }
      }
      
      // 写入合并内容
      if (mergedContent.length > 0) {
        // 使用TextEncoder确保UTF-8编码正确
        const encoder = util.TextEncoder.create();
        const uint8Array = encoder.encodeInto(mergedContent);
        
        fs.writeSync(file.fd, uint8Array.buffer);
        fs.closeSync(file);
        
        hilog.info(0x0000, TAG, `章节合并完成: ${successCount}/${chapters.length} 章, 文件: ${mergedFilePath}, 大小: ${uint8Array.length} 字节`);
        return mergedFilePath;
      } else {
        fs.closeSync(file);
        // 删除空文件
        if (fs.accessSync(mergedFilePath)) {
          fs.unlinkSync(mergedFilePath);
        }
        hilog.error(0x0000, TAG, '没有可合并的章节内容');
        return null;
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `合并章节失败: ${JSON.stringify(error)}`);
      return null;
    }
  }

  /**
   * 获取合并文件路径（如果存在）
   * @param bookId 书籍ID
   * @param bookTitle 书籍标题
   * @returns 返回合并文件路径，不存在返回null
   */
  getMergedFilePath(bookId: number, bookTitle: string): string | null {
    try {
      const safeBookTitle = this.getSafeFileName(bookTitle);
      const mergedFilePath = `${this.downloadDir}/${safeBookTitle}_${bookId}_merged.txt`;
      
      if (fs.accessSync(mergedFilePath)) {
        return mergedFilePath;
      }
      
      return null;
    } catch (error) {
      hilog.error(0x0000, TAG, `获取合并文件路径失败: ${JSON.stringify(error)}`);
      return null;
    }
  }
}

export const downloadManager = new DownloadManager();
