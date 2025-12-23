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
  async startDownloadBook(bookId: number, bookTitle: string, chapters: ChapterInfo[]): Promise<void> {
    if (this.downloadTasks.has(bookId)) {
      hilog.warn(0x0000, TAG, `书籍 ${bookTitle} 已在下载队列中`);
      return;
    }

    const task: DownloadTask = {
      bookId: bookId,
      bookTitle: bookTitle,
      chapters: chapters,
      currentIndex: 0,
      isRunning: true
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

      // 保存章节到文件 - 使用书名避免不同书籍相同ID的覆盖问题
      // 将书名中的特殊字符替换为下划线
      const safeBookTitle = this.getSafeFileName(bookTitle);
      const fileName = `${safeBookTitle}_${bookId}_${chapterIndex}.txt`;
      const filePath = `${this.downloadDir}/${fileName}`;
      
      try {
        const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
        fs.writeSync(file.fd, content);
        fs.closeSync(file);
        hilog.info(0x0000, TAG, `章节文件保存成功: ${filePath}`);
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
   * 顺序下载章节
   */
  private async downloadChaptersSequentially(task: DownloadTask): Promise<void> {
    while (task.isRunning && task.currentIndex < task.chapters.length) {
      const chapter = task.chapters[task.currentIndex];
      const success = await this.downloadChapter(task.bookId, task.bookTitle, chapter, task.currentIndex);
      
      if (success) {
        task.currentIndex++;
        hilog.info(0x0000, TAG, `下载进度: ${task.currentIndex}/${task.chapters.length}`);
      } else {
        hilog.warn(0x0000, TAG, `章节下载失败，跳过: ${chapter.title}`);
        task.currentIndex++;
      }

      // 添加延迟，避免请求过快
      await this.delay(500);
    }

    if (task.currentIndex >= task.chapters.length) {
      hilog.info(0x0000, TAG, `书籍下载完成: ${task.bookTitle}`);
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
          // 使用String.fromCharCode转换
          const textContent: string = String.fromCharCode(...Array.from(uint8Array));
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

      hilog.info(0x0000, TAG, `清理下载文件完成: bookId=${bookId}, bookTitle=${bookTitle}`);
    } catch (error) {
      hilog.error(0x0000, TAG, `清理下载文件失败: ${JSON.stringify(error)}`);
    }
  }
}

export const downloadManager = new DownloadManager();
