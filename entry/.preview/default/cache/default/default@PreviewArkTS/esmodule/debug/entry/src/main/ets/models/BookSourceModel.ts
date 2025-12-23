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
 * 鹿析规则接口
 */
export interface BookSourceRule {
    author?: string; // 作者选择器
    bookList?: string; // 书籍列表选择器
    bookUrl?: string; // 书籍URL选择器
    coverUrl?: string; // 封面URL选择器
    intro?: string; // 简介选择器
    kind?: string; // 分类选择器
    lastChapter?: string; // 最新章节选择器
    name?: string; // 书名选择器
    wordCount?: string; // 字数选择器
    checkKeyWord?: string; // 关键词验证选择器
    chapterList?: string; // 章节列表选择器
    chapterName?: string; // 章节名称选择器
    chapterUrl?: string; // 章节URL选择器
    nextTocUrl?: string; // 下一页目录URL选择器
    content?: string; // 正文内容选择器
    nextContentUrl?: string; // 下一页内容URL选择器
    replaceRegex?: string; // 内容替换正则表达式
    tocUrl?: string; // 目录URL选择器
    init?: string; // 初始化脚本
}
/**
 * 完整书源信息接口
 */
export interface BookSourceInfo {
    bookSourceName: string; // 书源名称
    bookSourceUrl: string; // 书源URL
    bookSourceGroup: string; // 书源分组
    bookSourceComment: string; // 书源注释
    bookSourceType: number; // 书源类型 (0: 小说, 1: 漫画, 2: 有声书)
    enabled: boolean; // 是否启用
    enabledCookieJar: boolean; // 是否启用Cookie
    enabledExplore: boolean; // 是否启用发现
    enabledReview: boolean; // 是否启用评论
    header: string; // 请求头
    searchUrl: string; // 搜索URL
    exploreUrl: string; // 发现URL
    bookUrlPattern: string; // 书籍URL模式
    ruleSearch: BookSourceRule; // 搜索规则
    ruleExplore: BookSourceRule; // 发现规则
    ruleBookInfo: BookSourceRule; // 书籍信息规则
    ruleToc: BookSourceRule; // 目录规则
    ruleContent: BookSourceRule; // 内容规则
    ruleReview: BookSourceRule; // 评论规则
    weight: number; // 权重
    customOrder: number; // 自定义排序
    lastUpdateTime?: number; // 最后更新时间
    respondTime?: number; // 响应时间
    loginUrl?: string; // 登录URL
    concurrentRate?: string; // 并发率
    loginCheckJs?: string; // 登录检查脚本
    loginUi?: string; // 登录界面
    variableComment?: string; // 变量注释
}
/**
 * 小说信息接口
 */
export interface NovelInfo {
    cover: string; // 封面图片URL
    title: string; // 小说标题
    author: string; // 作者
    description: string; // 简介
    link: string; // 详情链接
    hotValue?: string; // 热度值
    category?: string; // 分类
    status?: string; // 状态
    updateTime?: string; // 更新时间
    latestChapter?: string; // 最新章节
    wordCount?: string; // 字数
}
/**
 * 章节信息接口
 */
export interface ChapterInfo {
    title: string; // 章节标题
    url: string; // 章节链接
    index?: number; // 章节索引
}
/**
 * 书籍详情信息接口
 */
export interface BookDetailInfo {
    cover: string; // 封面图片URL
    title: string; // 书名
    author: string; // 作者
    description: string; // 简介
    status: string; // 状态（连载中/已完结）
    updateTime: string; // 更新时间
    latestChapter: string; // 最新章节名
    category?: string; // 分类
    wordCount?: string; // 字数
    tocUrl?: string; // 目录URL
}
/**
 * 解析结果接口
 */
export interface ParseResult<T> {
    success: boolean; // 是否成功
    data?: T; // 解析数据
    error?: string; // 错误信息
    source?: string; // 书源名称
}
/**
 * 书源测试结果接口
 */
export interface BookSourceTestResult {
    sourceName: string; // 书源名称
    success: boolean; // 测试是否成功
    responseTime: number; // 响应时间(ms)
    error?: string; // 错误信息
    testType: 'search' | 'explore' | 'bookInfo' | 'toc' | 'content'; // 测试类型
    testData?: object; // 测试数据
}
/**
 * 书源统计信息接口
 */
export interface BookSourceStats {
    sourceName: string; // 书源名称
    totalRequests: number; // 总请求数
    successRequests: number; // 成功请求数
    failedRequests: number; // 失败请求数
    averageResponseTime: number; // 平均响应时间
    lastUsedTime: number; // 最后使用时间
    successRate: number; // 成功率
}
/**
 * 书源管理器配置接口
 */
export interface BookSourceManagerConfig {
    enableStats: boolean; // 是否启用统计
    maxConcurrentRequests: number; // 最大并发请求数
    requestTimeout: number; // 请求超时时间(ms)
    retryCount: number; // 重试次数
    cacheEnabled: boolean; // 是否启用缓存
    cacheDuration: number; // 缓存持续时间(ms)
}
/**
 * 导入结果接口
 */
export interface ImportResult {
    success: number; // 成功导入数量
    failed: number; // 失败导入数量
    errors: string[]; // 错误信息列表
}
/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG: BookSourceManagerConfig = {
    enableStats: true,
    maxConcurrentRequests: 3,
    requestTimeout: 10000,
    retryCount: 2,
    cacheEnabled: true,
    cacheDuration: 300000 // 5分钟
};
/**
 * 书源类型枚举
 */
export enum BookSourceType {
    NOVEL = 0,
    COMIC = 1,
    AUDIO = 2 // 有声书
}
/**
 * 解析器类型枚举
 */
export enum ParserType {
    REGEX = "regex",
    XPATH = "xpath",
    CSS = "css",
    JSON = "json" // JSON路径
}
