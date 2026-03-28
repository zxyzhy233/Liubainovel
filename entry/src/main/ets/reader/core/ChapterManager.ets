/**
 * 章节管理器 - 管理在线书籍的章节列表和切换
 */

import { ChapterInfo } from '../../models/BookSourceModel';
import { onlineBookDataManager } from '../../utils/OnlineBookDataManager';
import hilog from '@ohos.hilog';

const TAG: string = 'ChapterManager';

/**
 * 章节管理器类
 * 负责管理章节列表、当前章节索引、章节切换等功能
 */
export class ChapterManager {
  private chapters: ChapterInfo[] = [];           // 章节列表
  private currentChapterIndex: number = 0;        // 当前章节索引
  private bookId: number = 0;                     // 在线书籍ID
  private bookTitle: string = '';                 // 书籍标题
  private bookUrl: string = '';                   // 书籍URL
  
  /**
   * 初始化章节管理器
   * @param chapters 章节列表
   * @param startChapterIndex 起始章节索引
   * @param bookId 在线书籍ID
   * @param bookTitle 书籍标题
   * @param bookUrl 书籍URL
   */
  init(chapters: ChapterInfo[], startChapterIndex: number, bookId: number, bookTitle: string, bookUrl: string): void {
    this.chapters = chapters;
    this.currentChapterIndex = startChapterIndex;
    this.bookId = bookId;
    this.bookTitle = bookTitle;
    this.bookUrl = bookUrl;
    
    hilog.info(0x0000, TAG, `章节管理器初始化: 总章节数=${chapters.length}, 起始章节=${startChapterIndex}, 书籍ID=${bookId}`);
  }
  
  /**
   * 获取章节列表
   */
  getChapters(): ChapterInfo[] {
    return this.chapters;
  }
  
  /**
   * 获取当前章节索引
   */
  getCurrentChapterIndex(): number {
    return this.currentChapterIndex;
  }
  
  /**
   * 设置当前章节索引
   */
  setCurrentChapterIndex(index: number): void {
    if (index >= 0 && index < this.chapters.length) {
      this.currentChapterIndex = index;
      hilog.info(0x0000, TAG, `当前章节索引更新为: ${index}`);
    }
  }
  
  /**
   * 获取当前章节信息
   */
  getCurrentChapter(): ChapterInfo | null {
    if (this.currentChapterIndex >= 0 && this.currentChapterIndex < this.chapters.length) {
      return this.chapters[this.currentChapterIndex];
    }
    return null;
  }
  
  /**
   * 是否有上一章
   */
  hasPrevChapter(): boolean {
    return this.currentChapterIndex > 0;
  }
  
  /**
   * 是否有下一章
   */
  hasNextChapter(): boolean {
    return this.currentChapterIndex < this.chapters.length - 1;
  }
  
  /**
   * 获取上一章信息
   */
  getPrevChapter(): ChapterInfo | null {
    if (this.hasPrevChapter()) {
      return this.chapters[this.currentChapterIndex - 1];
    }
    return null;
  }
  
  /**
   * 获取下一章信息
   */
  getNextChapter(): ChapterInfo | null {
    if (this.hasNextChapter()) {
      return this.chapters[this.currentChapterIndex + 1];
    }
    return null;
  }
  
  /**
   * 切换到上一章
   * @returns 返回上一章的文件路径，如果没有上一章或未下载则返回null
   */
  async switchToPrevChapter(): Promise<string | null> {
    if (!this.hasPrevChapter()) {
      hilog.warn(0x0000, TAG, '已经是第一章了');
      return null;
    }
    
    const prevIndex = this.currentChapterIndex - 1;
    const chapterDownloadInfo = await onlineBookDataManager.queryChapterDownload(this.bookId, prevIndex);
    
    if (chapterDownloadInfo && chapterDownloadInfo.isDownloaded && chapterDownloadInfo.filePath) {
      this.currentChapterIndex = prevIndex;
      hilog.info(0x0000, TAG, `切换到上一章: 第${prevIndex + 1}章 - ${this.chapters[prevIndex].title}`);
      return chapterDownloadInfo.filePath;
    } else {
      hilog.warn(0x0000, TAG, `上一章未下载: 第${prevIndex + 1}章`);
      return null;
    }
  }
  
  /**
   * 切换到下一章
   * @returns 返回下一章的文件路径，如果没有下一章或未下载则返回null
   */
  async switchToNextChapter(): Promise<string | null> {
    if (!this.hasNextChapter()) {
      hilog.warn(0x0000, TAG, '已经是最后一章了');
      return null;
    }
    
    const nextIndex = this.currentChapterIndex + 1;
    const chapterDownloadInfo = await onlineBookDataManager.queryChapterDownload(this.bookId, nextIndex);
    
    if (chapterDownloadInfo && chapterDownloadInfo.isDownloaded && chapterDownloadInfo.filePath) {
      this.currentChapterIndex = nextIndex;
      hilog.info(0x0000, TAG, `切换到下一章: 第${nextIndex + 1}章 - ${this.chapters[nextIndex].title}`);
      return chapterDownloadInfo.filePath;
    } else {
      hilog.warn(0x0000, TAG, `下一章未下载: 第${nextIndex + 1}章`);
      return null;
    }
  }
  
  /**
   * 切换到指定章节
   * @param chapterIndex 章节索引
   * @returns 返回章节的文件路径，如果章节不存在或未下载则返回null
   */
  async switchToChapter(chapterIndex: number): Promise<string | null> {
    if (chapterIndex < 0 || chapterIndex >= this.chapters.length) {
      hilog.error(0x0000, TAG, `无效的章节索引: ${chapterIndex}`);
      return null;
    }
    
    const chapterDownloadInfo = await onlineBookDataManager.queryChapterDownload(this.bookId, chapterIndex);
    
    if (chapterDownloadInfo && chapterDownloadInfo.isDownloaded && chapterDownloadInfo.filePath) {
      this.currentChapterIndex = chapterIndex;
      hilog.info(0x0000, TAG, `切换到章节: 第${chapterIndex + 1}章 - ${this.chapters[chapterIndex].title}`);
      return chapterDownloadInfo.filePath;
    } else {
      hilog.warn(0x0000, TAG, `章节未下载: 第${chapterIndex + 1}章`);
      return null;
    }
  }
  
  /**
   * 获取总章节数
   */
  getTotalChapterCount(): number {
    return this.chapters.length;
  }
  
  /**
   * 获取当前阅读进度（百分比）
   */
  getProgress(): number {
    if (this.chapters.length === 0) {
      return 0;
    }
    return Math.round((this.currentChapterIndex / this.chapters.length) * 100);
  }
  
  /**
   * 保存当前阅读进度到数据库
   */
  async saveProgress(): Promise<void> {
    if (this.bookId > 0 && this.currentChapterIndex >= 0 && this.currentChapterIndex < this.chapters.length) {
      const currentChapter = this.chapters[this.currentChapterIndex];
      const progress = this.getProgress();
      await onlineBookDataManager.updateOnlineBookProgress(
        this.bookUrl,
        currentChapter.title,
        `${progress}%`
      );
      hilog.info(0x0000, TAG, `保存阅读进度: 第${this.currentChapterIndex + 1}章 - ${currentChapter.title}, 进度=${progress}%`);
    }
  }
}
