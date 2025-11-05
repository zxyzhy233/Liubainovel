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
 * 导出书单中的单本书籍信息
 */
export interface ExportBookItem {
  bookUrl: string; // 书籍详情页URL
  title: string; // 书名
  author: string; // 作者
  cover: string; // 封面URL
  description: string; // 简介
  category: string; // 分类
  status: string; // 状态
  latestChapter: string; // 最新章节
}

/**
 * 导出的书单数据结构
 */
export interface BookListExport {
  version: string; // 书单格式版本
  exportTime: number; // 导出时间戳
  appName: string; // 应用名称
  totalBooks: number; // 书籍总数
  books: ExportBookItem[]; // 书籍列表
}
