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
import { hilog } from '@kit.PerformanceAnalysisKit';
import { BookInfo } from '../common/BookInfo';
import { common } from '@kit.AbilityKit';

const TAG: string = 'BookDataManager';
const DB_NAME = 'BookShelf.db';
const TABLE_NAME = 'books';

const SQL_CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookName TEXT NOT NULL,
    author TEXT,
    filePath TEXT NOT NULL UNIQUE,
    coverPath TEXT,
    progress TEXT,
    currentChapter TEXT,
    lastReadTime INTEGER,
    resourceIndex INTEGER,
    domPos TEXT
  )
`;

class BookDataManager {
  private rdbStore: relationalStore.RdbStore | null = null;

  async init(context: common.UIAbilityContext): Promise<void> {
    if (this.rdbStore) {
      return;
    }
    try {
      const storeConfig: relationalStore.StoreConfig = {
        name: DB_NAME,
        securityLevel: relationalStore.SecurityLevel.S1
      };
      this.rdbStore = await relationalStore.getRdbStore(context, storeConfig);
      await this.rdbStore.executeSql(SQL_CREATE_TABLE);
      
      // Check if required columns exist and add them if missing
      const columns = await this.rdbStore.querySql(`PRAGMA table_info(${TABLE_NAME})`);
      let hasAuthorColumn = false;
      let hasCurrentChapterColumn = false;
      
      while(columns.goToNextRow()) {
        const columnName = columns.getString(columns.getColumnIndex('name'));
        if (columnName === 'author') {
          hasAuthorColumn = true;
        } else if (columnName === 'currentChapter') {
          hasCurrentChapterColumn = true;
        }
      }
      columns.close();

      // Add missing columns
      if (!hasAuthorColumn) {
        await this.rdbStore.executeSql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN author TEXT`);
        hilog.info(0x0000, TAG, 'Database schema updated: added author column.');
      }
      
      if (!hasCurrentChapterColumn) {
        await this.rdbStore.executeSql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN currentChapter TEXT`);
        hilog.info(0x0000, TAG, 'Database schema updated: added currentChapter column.');
      }
      hilog.info(0x0000, TAG, 'Database init success.');
    } catch (e) {
      hilog.error(0x0000, TAG, `Database init failed, error: ${e}`);
    }
  }

  async insertBook(book: BookInfo): Promise<number> {
    if (!this.rdbStore) {
      hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
      return -1;
    }
    const valueBucket: relationalStore.ValuesBucket = {
      bookName: book.bookName,
      author: book.author,
      filePath: book.filePath,
      coverPath: book.coverPath,
      progress: book.progress,
      lastReadTime: book.lastReadTime
    };
    try {
      const newRowId = await this.rdbStore.insert(TABLE_NAME, valueBucket);
      hilog.info(0x0000, TAG, `Insert book success, row id: ${newRowId}`);
      return newRowId;
    } catch (e) {
      hilog.error(0x0000, TAG, `Insert book failed, error: ${e}`);
      return -1;
    }
  }

  async queryAllBooks(): Promise<BookInfo[]> {
    if (!this.rdbStore) {
      hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
      return [];
    }
    const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
    try {
      const resultSet = await this.rdbStore.query(predicates);
      const books: BookInfo[] = [];
      if (resultSet.rowCount > 0) {
        while (resultSet.goToNextRow()) {
          const book = new BookInfo();
          book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
          book.bookName = resultSet.getString(resultSet.getColumnIndex('bookName'));
          book.author = resultSet.getString(resultSet.getColumnIndex('author'));
          book.filePath = resultSet.getString(resultSet.getColumnIndex('filePath'));
          book.coverPath = resultSet.getString(resultSet.getColumnIndex('coverPath'));
          book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
          // 尝试读取 currentChapter 字段，如果不存在则使用空字符串
          try {
            book.currentChapter = resultSet.getString(resultSet.getColumnIndex('currentChapter')) || '';
          } catch (e) {
            book.currentChapter = '';
          }
          book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
          book.resourceIndex = resultSet.getLong(resultSet.getColumnIndex('resourceIndex'));
          book.domPos = resultSet.getString(resultSet.getColumnIndex('domPos'));
          books.push(book);
        }
      }
      resultSet.close();
      hilog.info(0x0000, TAG, 'Query all books success.');
      return books;
    } catch (e) {
      hilog.error(0x0000, TAG, `Query all books failed, error: ${e}`);
      return [];
    }
  }

  async queryBooksByName(bookName: string): Promise<BookInfo[]> {
    if (!this.rdbStore) {
      hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
      return [];
    }
    const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
    predicates.like('bookName', `%${bookName}%`);
    try {
      const resultSet = await this.rdbStore.query(predicates);
      const books: BookInfo[] = [];
      if (resultSet.rowCount > 0) {
        while (resultSet.goToNextRow()) {
          const book = new BookInfo();
          book.id = resultSet.getLong(resultSet.getColumnIndex('id'));
          book.bookName = resultSet.getString(resultSet.getColumnIndex('bookName'));
          book.author = resultSet.getString(resultSet.getColumnIndex('author'));
          book.filePath = resultSet.getString(resultSet.getColumnIndex('filePath'));
          book.coverPath = resultSet.getString(resultSet.getColumnIndex('coverPath'));
          book.progress = resultSet.getString(resultSet.getColumnIndex('progress'));
          // 尝试读取 currentChapter 字段，如果不存在则使用空字符串
          try {
            book.currentChapter = resultSet.getString(resultSet.getColumnIndex('currentChapter')) || '';
          } catch (e) {
            book.currentChapter = '';
          }
          book.lastReadTime = resultSet.getLong(resultSet.getColumnIndex('lastReadTime'));
          book.resourceIndex = resultSet.getLong(resultSet.getColumnIndex('resourceIndex'));
          book.domPos = resultSet.getString(resultSet.getColumnIndex('domPos'));
          books.push(book);
        }
      }
      resultSet.close();
      hilog.info(0x0000, TAG, 'Query books by name success.');
      return books;
    } catch (e) {
      hilog.error(0x0000, TAG, `Query books by name failed, error: ${e}`);
      return [];
    }
  }

  /**
   * 更新书籍阅读记录（用于书架显示章节名）
   * @param filePath 文件路径
   * @param chapterName 章节名（用于书架显示已读章节）
   */
  async updateBookReadingRecord(filePath: string, chapterName: string): Promise<void> {
    if (!this.rdbStore) {
      hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
      return;
    }
    try {
      const valueBucket: relationalStore.ValuesBucket = {
        currentChapter: chapterName,
        lastReadTime: new Date().getTime()
      };
      const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
      predicates.equalTo('filePath', filePath);
      await this.rdbStore.update(valueBucket, predicates);
      hilog.info(0x0000, TAG, `Updated book reading record: ${filePath}, chapterName=${chapterName}`);
    } catch (err) {
      hilog.error(0x0000, TAG, `Failed to update book reading record: ${JSON.stringify(err)}`);
    }
  }

  /**
   * 更新书籍阅读进度百分比（用于书架显示进度）
   * @param filePath 文件路径
   * @param progressPercent 进度百分比（如 "25%" 或 "已读50页"）
   */
  async updateBookProgress(filePath: string, progressPercent: string): Promise<void> {
    if (!this.rdbStore) {
      hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
      return;
    }
    try {
      const valueBucket: relationalStore.ValuesBucket = {
        progress: progressPercent,
        lastReadTime: new Date().getTime()
      };
      const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
      predicates.equalTo('filePath', filePath);
      await this.rdbStore.update(valueBucket, predicates);
      hilog.info(0x0000, TAG, `Updated book progress: ${filePath}, progress=${progressPercent}`);
    } catch (err) {
      hilog.error(0x0000, TAG, `Failed to update book progress: ${JSON.stringify(err)}`);
    }
  }


  async deleteBooksByIds(ids: number[]): Promise<void> {
    if (!this.rdbStore) {
      hilog.error(0x0000, TAG, 'RdbStore is not initialized.');
      return;
    }
    if (!ids || ids.length === 0) {
      return;
    }
    const predicates = new relationalStore.RdbPredicates(TABLE_NAME);
    predicates.in('id', ids);
    try {
      await this.rdbStore.delete(predicates);
      hilog.info(0x0000, TAG, `Delete books success, ids: ${ids.join(',')}`);
    } catch (e) {
      hilog.error(0x0000, TAG, `Delete books failed, error: ${e}`);
    }
  }
}

export const bookDataManager = new BookDataManager();
