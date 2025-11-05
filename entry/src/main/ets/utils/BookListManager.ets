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

import { common } from '@kit.AbilityKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { OnlineBookInfo } from '../models/OnlineBookModel';
import { BookListExport, ExportBookItem } from '../models/BookListExportModel';
import { onlineBookDataManager } from './OnlineBookDataManager';

const TAG: string = 'BookListManager';

/**
 * 书单管理工具类
 * 负责书单的导出和导入功能
 */
export class BookListManager {
  private context: common.UIAbilityContext | null = null;

  /**
   * 初始化
   * @param context UIAbilityContext
   */
  init(context: common.UIAbilityContext): void {
    this.context = context;
  }

  /**
   * 导出书单到JSON文件
   * @param books 要导出的在线书籍列表
   * @returns 导出的文件路径
   */
  async exportBookList(books: OnlineBookInfo[]): Promise<string> {
    if (!this.context) {
      throw new Error('BookListManager未初始化');
    }

    if (books.length === 0) {
      throw new Error('没有可导出的书籍');
    }

    try {
      // 构建导出数据
      const exportData: BookListExport = {
        version: '1.0',
        exportTime: Date.now(),
        appName: 'ReaderKit',
        totalBooks: books.length,
        books: books.map((book: OnlineBookInfo): ExportBookItem => {
          return {
            bookUrl: book.bookUrl,
            title: book.title,
            author: book.author,
            cover: book.cover,
            description: book.description,
            category: book.category,
            status: book.status,
            latestChapter: book.latestChapter
          };
        })
      };

      // 生成文件名（使用时间戳）
      const timestamp = new Date().getTime();
      const fileName = `booklist_${timestamp}.json`;
      const filePath = `${this.context.cacheDir}/${fileName}`;

      // 将数据转换为JSON字符串
      const jsonContent = JSON.stringify(exportData, null, 2);

      // 写入文件
      const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
      fs.writeSync(file.fd, jsonContent);
      fs.closeSync(file);

      hilog.info(0x0000, TAG, `书单导出成功: ${filePath}, 共${books.length}本书`);
      return filePath;
    } catch (error) {
      hilog.error(0x0000, TAG, `导出书单失败: ${JSON.stringify(error)}`);
      throw new Error('导出书单失败: ' + String(error));
    }
  }

  /**
   * 从JSON文件导入书单
   * @param filePath JSON文件路径
   * @returns 导入的书籍数量
   */
  async importBookList(filePath: string): Promise<number> {
    if (!this.context) {
      throw new Error('BookListManager未初始化');
    }

    try {
      // 读取文件内容
      const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
      const stat = fs.statSync(filePath);
      const buffer = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buffer);
      fs.closeSync(file);

      // 将ArrayBuffer转换为字符串
      const jsonContent = String.fromCharCode(...new Uint8Array(buffer));

      // 解析JSON
      const importData = JSON.parse(jsonContent) as BookListExport;

      if (!importData.books || !Array.isArray(importData.books)) {
        throw new Error('书单格式不正确');
      }

      hilog.info(0x0000, TAG, `开始导入书单，共${importData.totalBooks}本书`);

      // 导入书籍到数据库
      let importCount = 0;
      for (const bookItem of importData.books) {
        try {
          // 检查书籍是否已存在
          const existingBooks = await onlineBookDataManager.queryAllOnlineBooks();
          const exists = existingBooks.some((book: OnlineBookInfo): boolean => {
            return book.bookUrl === bookItem.bookUrl;
          });

          if (exists) {
            hilog.info(0x0000, TAG, `书籍已存在，跳过: ${bookItem.title}`);
            continue;
          }

          // 创建新的在线书籍对象
          const newBook = new OnlineBookInfo();
          newBook.bookUrl = bookItem.bookUrl;
          newBook.title = bookItem.title;
          newBook.author = bookItem.author;
          newBook.cover = bookItem.cover;
          newBook.description = bookItem.description;
          newBook.category = bookItem.category;
          newBook.status = bookItem.status;
          newBook.latestChapter = bookItem.latestChapter;
          newBook.addTime = Date.now();
          newBook.lastReadTime = 0;
          newBook.currentChapter = '';
          newBook.progress = '';
          newBook.totalChapters = 0;
          newBook.downloadedChapters = 0;

          // 插入数据库
          await onlineBookDataManager.addOnlineBook(newBook);
          importCount++;
          hilog.info(0x0000, TAG, `成功导入书籍: ${bookItem.title}`);
        } catch (error) {
          hilog.error(0x0000, TAG, `导入书籍失败: ${bookItem.title}, ${JSON.stringify(error)}`);
        }
      }

      hilog.info(0x0000, TAG, `书单导入完成,成功导入${importCount}本书`);
      return importCount;
    } catch (error) {
      hilog.error(0x0000, TAG, `导入书单失败: ${JSON.stringify(error)}`);
      throw new Error('导入书单失败: ' + String(error));
    }
  }
}

// 导出单例
export const bookListManager = new BookListManager();
