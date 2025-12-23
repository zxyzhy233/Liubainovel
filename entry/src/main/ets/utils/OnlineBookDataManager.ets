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

import { relationalStore } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { OnlineBookInfo, ChapterDownloadInfo } from '../models/OnlineBookModel';

const TAG: string = 'OnlineBookDataManager';

/**
 * 在线书籍数据管理器
 */
class OnlineBookDataManager {
  private rdbStore: relationalStore.RdbStore | null = null;
  private isInitialized: boolean = false;

  /**
   * 初始化数据库
   */
  async init(context: common.UIAbilityContext): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const STORE_CONFIG: relationalStore.StoreConfig = {
        name: 'online_books.db',
        securityLevel: relationalStore.SecurityLevel.S3
      };

      this.rdbStore = await relationalStore.getRdbStore(context, STORE_CONFIG);
      
      // 创建在线书籍表
      await this.rdbStore.executeSql(
        `CREATE TABLE IF NOT EXISTS online_books (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookUrl TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          author TEXT,
          cover TEXT,
          description TEXT,
          category TEXT,
          status TEXT,
          latestChapter TEXT,
          updateTime TEXT,
          addTime INTEGER,
          lastReadTime INTEGER,
          currentChapter TEXT,
          progress TEXT,
          totalChapters INTEGER DEFAULT 0,
          downloadedChapters INTEGER DEFAULT 0
        )`
      );

      // 创建章节下载表
      await this.rdbStore.executeSql(
        `CREATE TABLE IF NOT EXISTS chapter_downloads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookId INTEGER NOT NULL,
          chapterIndex INTEGER NOT NULL,
          chapterTitle TEXT NOT NULL,
          chapterUrl TEXT NOT NULL,
          content TEXT,
          isDownloaded INTEGER DEFAULT 0,
          downloadTime INTEGER,
          filePath TEXT,
          UNIQUE(bookId, chapterIndex)
        )`
      );

      this.isInitialized = true;
      hilog.info(0x0000, TAG, '在线书籍数据库初始化成功');
    } catch (error) {
      hilog.error(0x0000, TAG, '初始化数据库失败: ' + JSON.stringify(error));
      throw new Error(String(error));
    }
  }

  /**
   * 添加在线书籍到书架
   */
  async addOnlineBook(book: OnlineBookInfo): Promise<number> {
    if (!this.rdbStore) {
      throw new Error('数据库未初始化');
    }

    try {
      const valueBucket: relationalStore.ValuesBucket = {
        bookUrl: book.bookUrl,
        title: book.title,
        author: book.author,
        cover: book.cover,
        description: book.description,
        category: book.category,
        status: book.status,
        latestChapter: book.latestChapter,
        updateTime: book.updateTime,
        addTime: Date.now(),
        lastReadTime: Date.now(),
        currentChapter: '',
        progress: '0%',
        totalChapters: book.totalChapters,
        downloadedChapters: 0
      };

      const rowId = await this.rdbStore.insert('online_books', valueBucket);
      hilog.info(0x0000, TAG, `添加在线书籍成功: ${book.title}, rowId: ${rowId}`);
      return rowId;
    } catch (error) {
      hilog.error(0x0000, TAG, '添加在线书籍失败: ' + JSON.stringify(error));
      throw new Error(String(error));
    }
  }

  /**
   * 查询所有在线书籍
   */
  async queryAllOnlineBooks(): Promise<OnlineBookInfo[]> {
    if (!this.rdbStore) {
      return [];
    }

    try {
      const predicates = new relationalStore.RdbPredicates('online_books');
      predicates.orderByDesc('lastReadTime');
      
      const resultSet = await this.rdbStore.query(predicates);
      const books: OnlineBookInfo[] = [];

      while (resultSet.goToNextRow()) {
        const book = new OnlineBookInfo();
        book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
        book.bookUrl = resultSet.getString(resultSet.getColumnIndex('bookUrl'));
        book.title = resultSet.getString(resultSet.getColumnIndex('title'));
        book.author = resultSet.getString(resultSet.getColumnIndex('author'));
        book.cover = resultSet.getString(resultSet.getColumnIndex('cover'));
        book.description = resultSet.getString(resultSet.getColumnIndex('description'));
        book.category = resultSet.getString(resultSet.getColumnIndex('category'));
        book.status = resultSet.getString(resultSet.getColumnIndex('status'));
        book.latestChapter = resultSet.getString(resultSet.getColumnIndex('latestChapter'));
        book.updateTime = resultSet.getString(resultSet.getColumnIndex('updateTime'));
        book.addTime = resultSet.getLong(resultSet.getColumnIndex('addTime'));
        book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
        book.currentChapter = resultSet.getString(resultSet.getColumnIndex('currentChapter'));
        book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
        book.totalChapters = resultSet.getLong(resultSet.getColumnIndex('totalChapters'));
        book.downloadedChapters = resultSet.getLong(resultSet.getColumnIndex('downloadedChapters'));
        books.push(book);
      }

      resultSet.close();
      return books;
    } catch (error) {
      hilog.error(0x0000, TAG, '查询在线书籍失败: ' + JSON.stringify(error));
      return [];
    }
  }

  /**
   * 根据ID查询在线书籍
   */
  async queryOnlineBookById(bookId: number): Promise<OnlineBookInfo | null> {
    if (!this.rdbStore) {
      return null;
    }

    try {
      const predicates = new relationalStore.RdbPredicates('online_books');
      predicates.equalTo('id', bookId);
      
      const resultSet = await this.rdbStore.query(predicates);
      
      if (resultSet.goToFirstRow()) {
        const book = new OnlineBookInfo();
        book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
        book.bookUrl = resultSet.getString(resultSet.getColumnIndex('bookUrl'));
        book.title = resultSet.getString(resultSet.getColumnIndex('title'));
        book.author = resultSet.getString(resultSet.getColumnIndex('author'));
        book.cover = resultSet.getString(resultSet.getColumnIndex('cover'));
        book.description = resultSet.getString(resultSet.getColumnIndex('description'));
        book.category = resultSet.getString(resultSet.getColumnIndex('category'));
        book.status = resultSet.getString(resultSet.getColumnIndex('status'));
        book.latestChapter = resultSet.getString(resultSet.getColumnIndex('latestChapter'));
        book.updateTime = resultSet.getString(resultSet.getColumnIndex('updateTime'));
        book.addTime = resultSet.getLong(resultSet.getColumnIndex('addTime'));
        book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
        book.currentChapter = resultSet.getString(resultSet.getColumnIndex('currentChapter'));
        book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
        book.totalChapters = resultSet.getLong(resultSet.getColumnIndex('totalChapters'));
        book.downloadedChapters = resultSet.getLong(resultSet.getColumnIndex('downloadedChapters'));
        resultSet.close();
        return book;
      }

      resultSet.close();
      return null;
    } catch (error) {
      hilog.error(0x0000, TAG, '根据ID查询在线书籍失败: ' + JSON.stringify(error));
      return null;
    }
  }

  /**
   * 根据URL查询在线书籍
   */
  async queryOnlineBookByUrl(bookUrl: string): Promise<OnlineBookInfo | null> {
    if (!this.rdbStore) {
      return null;
    }

    try {
      const predicates = new relationalStore.RdbPredicates('online_books');
      predicates.equalTo('bookUrl', bookUrl);
      
      const resultSet = await this.rdbStore.query(predicates);
      
      if (resultSet.goToFirstRow()) {
        const book = new OnlineBookInfo();
        book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
        book.bookUrl = resultSet.getString(resultSet.getColumnIndex('bookUrl'));
        book.title = resultSet.getString(resultSet.getColumnIndex('title'));
        book.author = resultSet.getString(resultSet.getColumnIndex('author'));
        book.cover = resultSet.getString(resultSet.getColumnIndex('cover'));
        book.description = resultSet.getString(resultSet.getColumnIndex('description'));
        book.category = resultSet.getString(resultSet.getColumnIndex('category'));
        book.status = resultSet.getString(resultSet.getColumnIndex('status'));
        book.latestChapter = resultSet.getString(resultSet.getColumnIndex('latestChapter'));
        book.updateTime = resultSet.getString(resultSet.getColumnIndex('updateTime'));
        book.addTime = resultSet.getLong(resultSet.getColumnIndex('addTime'));
        book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
        book.currentChapter = resultSet.getString(resultSet.getColumnIndex('currentChapter'));
        book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
        book.totalChapters = resultSet.getLong(resultSet.getColumnIndex('totalChapters'));
        book.downloadedChapters = resultSet.getLong(resultSet.getColumnIndex('downloadedChapters'));
        resultSet.close();
        return book;
      }

      resultSet.close();
      return null;
    } catch (error) {
      hilog.error(0x0000, TAG, '查询在线书籍失败: ' + JSON.stringify(error));
      return null;
    }
  }

  /**
   * 更新在线书籍阅读进度（根据bookId）
   */
  async updateReadingProgress(bookId: number, chapterIndex: number, chapterTitle: string): Promise<void> {
    if (!this.rdbStore) {
      return;
    }

    try {
      // 计算阅读进度百分比
      const book = await this.queryOnlineBookById(bookId);
      if (!book) {
        hilog.warn(0x0000, TAG, `未找到书籍: bookId=${bookId}`);
        return;
      }

      const progress = book.totalChapters > 0 
        ? Math.round(((chapterIndex + 1) / book.totalChapters) * 100) 
        : 0;

      const valueBucket: relationalStore.ValuesBucket = {
        currentChapter: chapterTitle,
        progress: `${progress}%`,
        lastReadTime: Date.now()
      };

      const predicates = new relationalStore.RdbPredicates('online_books');
      predicates.equalTo('id', bookId);
      
      await this.rdbStore.update(valueBucket, predicates);
      hilog.info(0x0000, TAG, `更新阅读进度成功: bookId=${bookId}, chapter=${chapterTitle}, progress=${progress}%`);
    } catch (error) {
      hilog.error(0x0000, TAG, '更新阅读进度失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 更新在线书籍阅读进度（根据bookUrl）
   */
  async updateOnlineBookProgress(bookUrl: string, currentChapter: string, progress: string): Promise<void> {
    if (!this.rdbStore) {
      return;
    }

    try {
      const valueBucket: relationalStore.ValuesBucket = {
        currentChapter: currentChapter,
        progress: progress,
        lastReadTime: Date.now()
      };

      const predicates = new relationalStore.RdbPredicates('online_books');
      predicates.equalTo('bookUrl', bookUrl);
      
      await this.rdbStore.update(valueBucket, predicates);
      hilog.info(0x0000, TAG, `更新阅读进度成功: ${currentChapter}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '更新阅读进度失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 保存章节下载信息
   */
  async saveChapterDownload(chapter: ChapterDownloadInfo): Promise<void> {
    if (!this.rdbStore) {
      return;
    }

    try {
      const valueBucket: relationalStore.ValuesBucket = {
        bookId: chapter.bookId,
        chapterIndex: chapter.chapterIndex,
        chapterTitle: chapter.chapterTitle,
        chapterUrl: chapter.chapterUrl,
        content: chapter.content,
        isDownloaded: chapter.isDownloaded ? 1 : 0,
        downloadTime: Date.now(),
        filePath: chapter.filePath
      };

      await this.rdbStore.insert('chapter_downloads', valueBucket, relationalStore.ConflictResolution.ON_CONFLICT_REPLACE);
      
      // 更新书籍的已下载章节数
      await this.updateDownloadedChaptersCount(chapter.bookId);
      
      hilog.info(0x0000, TAG, `保存章节下载信息成功: ${chapter.chapterTitle}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '保存章节下载信息失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 查询章节下载信息
   */
  async queryChapterDownload(bookId: number, chapterIndex: number): Promise<ChapterDownloadInfo | null> {
    if (!this.rdbStore) {
      return null;
    }

    try {
      const predicates = new relationalStore.RdbPredicates('chapter_downloads');
      predicates.equalTo('bookId', bookId).equalTo('chapterIndex', chapterIndex);
      
      const resultSet = await this.rdbStore.query(predicates);
      
      if (resultSet.goToFirstRow()) {
        const chapter = new ChapterDownloadInfo();
        chapter.id = resultSet.getLong(resultSet.getColumnIndex('id'));
        chapter.bookId = resultSet.getLong(resultSet.getColumnIndex('bookId'));
        chapter.chapterIndex = resultSet.getLong(resultSet.getColumnIndex('chapterIndex'));
        chapter.chapterTitle = resultSet.getString(resultSet.getColumnIndex('chapterTitle'));
        chapter.chapterUrl = resultSet.getString(resultSet.getColumnIndex('chapterUrl'));
        chapter.content = resultSet.getString(resultSet.getColumnIndex('content'));
        chapter.isDownloaded = resultSet.getLong(resultSet.getColumnIndex('isDownloaded')) === 1;
        chapter.downloadTime = resultSet.getLong(resultSet.getColumnIndex('downloadTime'));
        chapter.filePath = resultSet.getString(resultSet.getColumnIndex('filePath'));
        resultSet.close();
        return chapter;
      }

      resultSet.close();
      return null;
    } catch (error) {
      hilog.error(0x0000, TAG, '查询章节下载信息失败: ' + JSON.stringify(error));
      return null;
    }
  }

  /**
   * 查询书籍的所有章节下载状态
   */
  async queryBookChaptersDownloadStatus(bookId: number): Promise<Map<number, boolean>> {
    const statusMap = new Map<number, boolean>();
    
    if (!this.rdbStore) {
      return statusMap;
    }

    try {
      const predicates = new relationalStore.RdbPredicates('chapter_downloads');
      predicates.equalTo('bookId', bookId);
      
      const resultSet = await this.rdbStore.query(predicates);
      
      while (resultSet.goToNextRow()) {
        const chapterIndex = resultSet.getLong(resultSet.getColumnIndex('chapterIndex'));
        const isDownloaded = resultSet.getLong(resultSet.getColumnIndex('isDownloaded')) === 1;
        statusMap.set(chapterIndex, isDownloaded);
      }

      resultSet.close();
      return statusMap;
    } catch (error) {
      hilog.error(0x0000, TAG, '查询章节下载状态失败: ' + JSON.stringify(error));
      return statusMap;
    }
  }

  /**
   * 更新书籍的已下载章节数
   */
  private async updateDownloadedChaptersCount(bookId: number): Promise<void> {
    if (!this.rdbStore) {
      return;
    }

    try {
      const predicates = new relationalStore.RdbPredicates('chapter_downloads');
      predicates.equalTo('bookId', bookId).equalTo('isDownloaded', 1);
      
      const resultSet = await this.rdbStore.query(predicates);
      const count = resultSet.rowCount;
      resultSet.close();

      const updatePredicates = new relationalStore.RdbPredicates('online_books');
      updatePredicates.equalTo('id', bookId);
      
      const valueBucket: relationalStore.ValuesBucket = {
        downloadedChapters: count
      };

      await this.rdbStore.update(valueBucket, updatePredicates);
    } catch (error) {
      hilog.error(0x0000, TAG, '更新已下载章节数失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 删除在线书籍
   */
  async deleteOnlineBook(bookId: number): Promise<void> {
    if (!this.rdbStore) {
      return;
    }

    try {
      // 删除章节下载记录
      const chapterPredicates = new relationalStore.RdbPredicates('chapter_downloads');
      chapterPredicates.equalTo('bookId', bookId);
      await this.rdbStore.delete(chapterPredicates);

      // 删除书籍记录
      const bookPredicates = new relationalStore.RdbPredicates('online_books');
      bookPredicates.equalTo('id', bookId);
      await this.rdbStore.delete(bookPredicates);

      hilog.info(0x0000, TAG, `删除在线书籍成功: bookId=${bookId}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '删除在线书籍失败: ' + JSON.stringify(error));
    }
  }
}

export const onlineBookDataManager = new OnlineBookDataManager();
