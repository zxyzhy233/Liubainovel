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

/**
 * 在线书籍信息模型
 */
export class OnlineBookInfo {
  id: number = 0; // 数据库ID
  bookUrl: string = ''; // 书籍详情页URL
  title: string = ''; // 书名
  author: string = ''; // 作者
  cover: string = ''; // 封面URL
  description: string = ''; // 简介
  category: string = ''; // 分类
  status: string = ''; // 状态
  latestChapter: string = ''; // 最新章节
  updateTime: string = ''; // 更新时间
  addTime: number = 0; // 加入书架时间
  lastReadTime: number = 0; // 最后阅读时间
  currentChapter: string = ''; // 当前阅读章节
  progress: string = ''; // 阅读进度
  totalChapters: number = 0; // 总章节数
  downloadedChapters: number = 0; // 已下载章节数
}

/**
 * 章节下载信息
 */
export class ChapterDownloadInfo {
  id: number = 0; // 数据库ID
  bookId: number = 0; // 书籍ID
  chapterIndex: number = 0; // 章节索引
  chapterTitle: string = ''; // 章节标题
  chapterUrl: string = ''; // 章节URL
  content: string = ''; // 章节内容
  isDownloaded: boolean = false; // 是否已下载
  downloadTime: number = 0; // 下载时间
  filePath: string = ''; // 本地文件路径
}
