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
import { http } from '@kit.NetworkKit';
import {
  BookSourceInfo,
  BookSourceRule,
  NovelInfo,
  ChapterInfo,
  BookDetailInfo,
  ParseResult,
  ParserType
} from '../models/BookSourceModel';
import { webViewContentFetcher, CssSelectorRule } from '../utils/WebViewContentFetcher';

const TAG: string = 'BookSourceParser';

/**
 * 书源解析器类
 * 负责根据书源规则解析网页内容
 * 支持两种解析模式：
 * 1. 正则表达式模式（向后兼容）：规则中包含正则特征字符
 * 2. CSS选择器模式（推荐）：规则格式为 "selector@attr"
 */
export class BookSourceParser {
  private source: BookSourceInfo;

  /**
   * 构造函数
   * @param source 书源信息
   */
  constructor(source: BookSourceInfo) {
    this.source = source;
  }

  /**
   * 判断是否为 JSON API 书源
   * 检查 bookSourceType === 3 或规则中包含 apiUrl
   * @returns true=JSON API书源
   */
  private isJsonApiSource(): boolean {
    if (this.source.bookSourceType === 3) {
      return true;
    }
    // 检查各规则中是否有 apiUrl 字段
    const rules: BookSourceRule[] = [
      this.source.ruleBookInfo,
      this.source.ruleToc,
      this.source.ruleContent
    ];
    for (const rule of rules) {
      if (rule && rule.apiUrl) {
        return true;
      }
    }
    return false;
  }

  /**
   * 请求 JSON API 并返回解析后的对象
   * @param url 完整的API URL
   * @returns Promise<Record<string, Object>> JSON响应对象
   */
  private async fetchJson(url: string): Promise<Record<string, Object>> {
    try {
      const httpRequest = http.createHttp();
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      };

      // 解析自定义请求头
      if (this.source.header) {
        try {
          const customHeaders: Record<string, string> = JSON.parse(this.source.header);
          const headerKeys = Object.keys(customHeaders);
          for (let i = 0; i < headerKeys.length; i++) {
            const key = headerKeys[i];
            headers[key] = customHeaders[key];
          }
        } catch (error) {
          hilog.warn(0x0000, TAG, '解析自定义请求头失败: ' + error);
        }
      }

      const response = await httpRequest.request(url, {
        method: http.RequestMethod.GET,
        header: headers,
        connectTimeout: 30000,
        readTimeout: 30000
      });

      if (response.responseCode === 200) {
        const jsonStr = response.result.toString();
        hilog.info(0x0000, TAG, `[JSON API] 请求成功: ${url}, 响应长度: ${jsonStr.length}`);
        const result: Record<string, Object> = JSON.parse(jsonStr);
        return result;
      } else {
        const errorMsg = `JSON API请求失败: HTTP ${response.responseCode}`;
        hilog.error(0x0000, TAG, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `JSON API请求失败: ${url}, 错误: ${error}`);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  }

  /**
   * 从URL中提取bookId（URL中的数字部分）
   * @param bookUrl 书籍URL
   * @returns bookId字符串
   */
  private extractBookId(bookUrl: string): string {
    // 尝试从URL路径中提取数字ID
    const match = bookUrl.match(/\/(\d+)\/?$/);
    if (match) {
      return match[1];
    }
    // 尝试从查询参数中提取
    const paramMatch = bookUrl.match(/[?&]id=(\d+)/);
    if (paramMatch) {
      return paramMatch[1];
    }
    // 尝试提取URL中最后一段数字
    const numMatch = bookUrl.match(/(\d+)/g);
    if (numMatch && numMatch.length > 0) {
      return numMatch[numMatch.length - 1];
    }
    hilog.warn(0x0000, TAG, `无法从URL中提取bookId: ${bookUrl}`);
    return '';
  }

  /**
   * 判断一条规则是否为CSS选择器格式
   * CSS选择器格式: "selector@attr" 例如 "div.item@text", "a@href", "img@src"
   * 正则表达式特征: 包含 [, ], (, ), \, +, *, ?, {, }, ^, $, | 等正则元字符
   * @param rule 规则字符串
   * @returns true=CSS选择器, false=正则表达式
   */
  private isCssRule(rule: string): boolean {
    if (!rule) return false;

    // 如果包含 @ 且 @ 前面的部分不含典型正则元字符，认为是CSS选择器
    if (rule.includes('@')) {
      const selectorPart = rule.split('@')[0];
      // CSS选择器不会包含这些正则特有的模式
      const regexPatterns = ['[^>', '([\\', '\\/', '\\s\\S', '\\d+', '\\w+', '<\\/', '<[^'];
      for (const pattern of regexPatterns) {
        if (selectorPart.includes(pattern)) {
          return false;
        }
      }
      return true;
    }

    // 没有 @ 的情况下，检查是否像正则表达式
    // 正则表达式通常包含这些特征
    const regexIndicators = ['<', '>', '\\/', '([', '])', '\\s', '\\S', '\\d', '\\w', '[^', '(?:'];
    for (const indicator of regexIndicators) {
      if (rule.includes(indicator)) {
        return false;
      }
    }

    // 如果看起来像纯CSS选择器（标签名、类名、ID等），也认为是CSS
    const cssPattern = /^[a-zA-Z#.\[\]:>\s,+~*='"()-]+$/;
    if (cssPattern.test(rule)) {
      return true;
    }

    // 默认当作正则处理（向后兼容）
    return false;
  }

  /**
   * 判断整个规则集是否使用CSS选择器模式
   * 只要有一条规则是CSS格式，就认为整个规则集是CSS模式
   * @param rule 规则集
   * @returns true=CSS模式, false=正则模式
   */
  private isRuleSetCss(rule: BookSourceRule): boolean {
    const fields: string[] = [
      rule.bookList || '',
      rule.name || '',
      rule.author || '',
      rule.bookUrl || '',
      rule.coverUrl || '',
      rule.intro || '',
      rule.chapterList || '',
      rule.chapterName || '',
      rule.chapterUrl || '',
      rule.content || ''
    ];

    // 统计CSS规则和正则规则的数量
    let cssCount = 0;
    let regexCount = 0;
    for (const field of fields) {
      if (field) {
        if (this.isCssRule(field)) {
          cssCount++;
        } else {
          regexCount++;
        }
      }
    }

    // 如果CSS规则数量多于正则规则，认为是CSS模式
    return cssCount > regexCount;
  }

  /**
   * 将书源规则中的CSS选择器字段解析为 CssSelectorRule 数组
   * 规则格式: "selector@attr"
   * @param field 字段名
   * @param rule 规则字符串 (如 "div.title a@text")
   * @returns CssSelectorRule
   */
  private parseCssField(field: string, rule: string): CssSelectorRule {
    if (!rule || !rule.includes('@')) {
      // 没有@的纯选择器，默认提取text
      return { field: field, selector: rule || '', attr: 'text' };
    }

    const lastAtIndex = rule.lastIndexOf('@');
    const selector = rule.substring(0, lastAtIndex);
    const attr = rule.substring(lastAtIndex + 1);

    return { field: field, selector: selector, attr: attr || 'text' };
  }

  /**
   * 获取网页内容
   * @param url 请求URL
   * @returns Promise<string> 网页HTML内容
   */
  private async fetchHtml(url: string): Promise<string> {
    try {
      const httpRequest = http.createHttp();
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };

      // 解析自定义请求头
      if (this.source.header) {
        try {
          const customHeaders: Record<string, string> = JSON.parse(this.source.header);
          const headerKeys = Object.keys(customHeaders);
          for (let i = 0; i < headerKeys.length; i++) {
            const key = headerKeys[i];
            headers[key] = customHeaders[key];
          }
        } catch (error) {
          hilog.warn(0x0000, TAG, '解析自定义请求头失败: ' + error);
        }
      }

      const response = await httpRequest.request(url, {
        method: http.RequestMethod.GET,
        header: headers,
        connectTimeout: 30000,
        readTimeout: 30000
      });

      if (response.responseCode === 200) {
        const html = response.result.toString();
        
        // 检测是否为反爬虫验证页面
        if (html.includes('加载中') && html.includes('getCookie') && html.includes('setCookie')) {
          hilog.warn(0x0000, TAG, '检测到反爬虫验证页面，尝试重新请求');
          
          // 等待一段时间后重试
          await this.delay(2000);
          
          // 重新请求
          const retryResponse = await httpRequest.request(url, {
            method: http.RequestMethod.GET,
            header: headers,
            connectTimeout: 30000,
            readTimeout: 30000
          });
          
          if (retryResponse.responseCode === 200) {
            return retryResponse.result.toString();
          }
        }
        
        return html;
      } else {
        const errorMsg = `HTTP请求失败: ${response.responseCode}`;
        hilog.error(0x0000, TAG, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `获取网页内容失败: ${url}, 错误: ${error}`);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error));
      }
    }
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * 根据规则解析文本内容
   * @param html HTML内容
   * @param rule 解析规则
   * @param multiple 是否返回多个结果
   * @returns 解析结果
   */
  private parseByRule(html: string, rule: string, multiple: boolean = false): string | string[] {
    if (!rule || !html) {
      return multiple ? [] : '';
    }

    try {
      // 判断规则类型并解析
      if (rule.includes('@')) {
        // CSS选择器格式: selector@attr 或 selector@text
        return this.parseByCssSelector(html, rule, multiple);
      } else if (rule.startsWith('/') && rule.endsWith('/g')) {
        // 正则表达式格式: /pattern/flags
        return this.parseByRegex(html, rule, multiple);
      } else {
        // 直接正则表达式
        return this.parseByRegex(html, rule, multiple);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `解析规则失败: ${rule}, 错误: ${error}`);
      return multiple ? [] : '';
    }
  }

  /**
   * 使用正则表达式解析
   * @param html HTML内容
   * @param pattern 正则表达式
   * @param multiple 是否返回多个结果
   * @returns 解析结果
   */
  private parseByRegex(html: string, pattern: string, multiple: boolean = false): string | string[] {
    try {
      // 处理正则表达式格式
      let regex: RegExp;
      if (pattern.startsWith('/') && pattern.includes('/')) {
        // 提取正则表达式和标志
        const lastSlash = pattern.lastIndexOf('/');
        const regexPattern = pattern.substring(1, lastSlash);
        const flags = pattern.substring(lastSlash + 1);
        regex = new RegExp(regexPattern, flags);
      } else {
        regex = new RegExp(pattern, multiple ? 'g' : '');
      }

      if (multiple) {
        const results: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = regex.exec(html)) !== null) {
          results.push(match[1] || match[0]);
          if (!regex.global) break;
        }
        return results;
      } else {
        const match = regex.exec(html);
        return match ? (match[1] || match[0]) : '';
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `正则表达式解析失败: ${pattern}, 错误: ${error}`);
      return multiple ? [] : '';
    }
  }

  /**
   * 使用CSS选择器解析（简化版实现）
   * @param html HTML内容
   * @param rule CSS选择器规则
   * @param multiple 是否返回多个结果
   * @returns 解析结果
   */
  private parseByCssSelector(html: string, rule: string, multiple: boolean = false): string | string[] {
    try {
      const ruleParts = rule.split('@');
      const selector = ruleParts[0];
      const attr = ruleParts[1];
      
      // 简化的CSS选择器转正则表达式实现
      let pattern: string;
      
      if (selector.includes('.')) {
        // 类选择器: div.item -> <div[^>]*class="[^"]*item[^"]*"[^>]*>
        const selectorParts = selector.split('.');
        const tag = selectorParts[0];
        const className = selectorParts[1];
        pattern = `<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>(.*?)<\\/${tag}>`;
      } else if (selector.includes('[')) {
        // 属性选择器: meta[property='og:title'] -> <meta[^>]*property="og:title"[^>]*>
        const attrMatch = selector.match(/(\w+)\[([^=]+)='([^']+)'\]/);
        if (attrMatch) {
          const tag = attrMatch[1];
          const attrName = attrMatch[2];
          const attrValue = attrMatch[3];
          if (attr === 'content') {
            pattern = `<${tag}[^>]*${attrName}="${attrValue}"[^>]*content="([^"]+)"[^>]*>`;
          } else {
            pattern = `<${tag}[^>]*${attrName}="${attrValue}"[^>]*>`;
          }
        } else {
          pattern = selector;
        }
      } else {
        // 标签选择器: div -> <div[^>]*>(.*?)</div>
        pattern = `<${selector}[^>]*>(.*?)<\\/${selector}>`;
      }

      // 根据属性类型调整正则表达式
      if (attr === 'text') {
        // 提取文本内容
        return this.parseByRegex(html, pattern, multiple);
      } else if (attr === 'href') {
        // 提取href属性
        const hrefPattern = pattern.replace('>(.*?)<', '[^>]*href="([^"]+)"[^>]*>');
        return this.parseByRegex(html, hrefPattern, multiple);
      } else if (attr === 'src') {
        // 提取src属性
        const srcPattern = pattern.replace('>(.*?)<', '[^>]*src="([^"]+)"[^>]*>');
        return this.parseByRegex(html, srcPattern, multiple);
      } else if (attr === 'content') {
        // 已在上面处理
        return this.parseByRegex(html, pattern, multiple);
      } else {
        // 默认提取文本内容
        return this.parseByRegex(html, pattern, multiple);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `CSS选择器解析失败: ${rule}, 错误: ${error}`);
      return multiple ? [] : '';
    }
  }

  /**
   * 清理HTML标签
   * @param text 包含HTML标签的文本
   * @param preserveLineBreaks 是否保留换行符
   * @returns 清理后的纯文本
   */
  private cleanHtmlTags(text: string, preserveLineBreaks: boolean = false): string {
    if (preserveLineBreaks) {
      // 保留换行符：将<br>、<p>等标签转换为换行符
      return text
        .replace(/<br\s*\/?>/gi, '\n')           // <br> 转换为换行
        .replace(/<\/p>/gi, '\n\n')              // </p> 转换为双换行
        .replace(/<p[^>]*>/gi, '')               // 移除 <p> 开始标签
        .replace(/<div[^>]*>/gi, '')             // 移除 <div> 开始标签
        .replace(/<\/div>/gi, '\n')              // </div> 转换为换行
        .replace(/<[^>]*>/g, '')                 // 移除其他所有HTML标签
        .replace(/&nbsp;/g, ' ')                 // 替换空格实体
        .replace(/&lt;/g, '<')                   // 替换小于号实体
        .replace(/&gt;/g, '>')                   // 替换大于号实体
        .replace(/&amp;/g, '&')                  // 替换&符号实体
        .replace(/&quot;/g, '"')                 // 替换引号实体
        .replace(/ +/g, ' ')                     // 合并多个空格为一个
        .replace(/\n\s+\n/g, '\n\n')             // 清理空白行
        .replace(/^\s+|\s+$/g, '');              // 移除首尾空白，但保留中间的换行
    } else {
      return text.replace(/<[^>]*>/g, '').trim();
    }
  }

  /**
   * 标准化章节内容格式
   * @param content 原始章节内容
   * @returns 格式化后的内容
   */
  private normalizeChapterContent(content: string): string {
    if (!content) {
      return '';
    }

    // 0. 处理WebView返回的字面量换行符（runJavaScript返回的字符串中\n是字面量文本）
    //    将字面量 \n 转换为真正的换行符
    let normalized = content.replace(/\\n/g, '\n');

    // 1. 先处理残留的HTML标签（HTTP回退路径可能还有HTML标签）
    normalized = normalized
      .replace(/<p[^>]*>\s*<\/p>/gi, '')             // 移除空的<p></p>标签
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n')    // 双<br>转换为单个换行
      .replace(/<br\s*\/?>/gi, '\n')                  // 单个<br>转换为换行
      .replace(/<\/p>/gi, '\n')                       // </p>转换为换行
      .replace(/<p[^>]*>/gi, '')                      // 移除<p>开始标签
      .replace(/<div[^>]*>/gi, '\n')                  // <div>转换为换行
      .replace(/<\/div>/gi, '')                       // 移除</div>
      .replace(/<[^>]*>/g, '');                       // 移除其他残留HTML标签

    // 2. 清理HTML实体
    normalized = normalized
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    // 3. 清理多余的空白字符
    normalized = normalized
      .replace(/\r\n/g, '\n')                     // 统一换行符为 \n
      .replace(/\r/g, '\n')                       // 统一换行符为 \n
      .replace(/[ \t]+/g, ' ')                    // 将多个空格/制表符合并为一个空格
      .replace(/\n{2,}/g, '\n')                   // 将2个及以上连续换行符替换为1个
      .replace(/^\n+|\n+$/g, '');                 // 移除开头和结尾的换行符

    // 4. 过滤广告和无关内容
    normalized = this.filterAdvertisements(normalized);

    // 5. 按换行分割，每行作为一个段落处理
    const lines = normalized.split('\n');
    const formattedParagraphs: string[] = [];

    for (const line of lines) {
      // 移除段落首尾空白
      const trimmed = line.trim();
      
      if (trimmed.length === 0) {
        continue; // 跳过空行
      }

      // 检查段落是否已经有缩进（全角空格或多个空格开头）
      const hasIndent = trimmed.startsWith('　') || trimmed.startsWith('  ');
      
      // 如果没有缩进，添加两个全角空格
      const formatted = hasIndent ? trimmed : `　　${trimmed}`;
      formattedParagraphs.push(formatted);
    }

    // 6. 用双换行符连接所有段落（段落间保留一个空行用于视觉分隔）
    return formattedParagraphs.join('\n\n');
  }

  /**
   * 过滤广告和无关内容
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
   * 构建完整URL
   * @param baseUrl 基础URL
   * @param relativeUrl 相对URL
   * @returns 完整URL
   */
  private buildFullUrl(baseUrl: string, relativeUrl: string): string {
    if (relativeUrl.startsWith('http')) {
      return relativeUrl;
    }
    
    const urlParts = baseUrl.split('/');
    const baseUrlRoot = urlParts.slice(0, 3).join('/');
    
    if (relativeUrl.startsWith('/')) {
      return baseUrlRoot + relativeUrl;
    } else {
      return baseUrlRoot + '/' + relativeUrl;
    }
  }

  /**
   * 解析推荐小说列表
   * @param url 推荐页面URL
   * @returns Promise<ParseResult<NovelInfo[]>> 解析结果
   */
  async parseRecommendNovels(url?: string): Promise<ParseResult<NovelInfo[]>> {
    try {
      const targetUrl = url || this.source.bookSourceUrl;
      const rule = this.source.ruleExplore;

      if (!rule.bookList) {
        throw new Error('书源缺少书籍列表规则');
      }

      // 判断规则类型，选择不同的解析路径
      if (this.isRuleSetCss(rule)) {
        return await this.parseRecommendNovelsByCss(targetUrl, rule);
      } else {
        return await this.parseRecommendNovelsByRegex(targetUrl, rule);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `解析推荐小说失败: ${error}`);
      return {
        success: false,
        error: error.toString(),
        source: this.source.bookSourceName
      };
    }
  }

  /**
   * CSS选择器模式：解析推荐小说列表
   */
  private async parseRecommendNovelsByCss(targetUrl: string, rule: BookSourceRule): Promise<ParseResult<NovelInfo[]>> {
    const itemRules: CssSelectorRule[] = [];

    if (rule.name) itemRules.push(this.parseCssField('title', rule.name));
    if (rule.author) itemRules.push(this.parseCssField('author', rule.author));
    if (rule.coverUrl) itemRules.push(this.parseCssField('cover', rule.coverUrl));
    if (rule.intro) itemRules.push(this.parseCssField('description', rule.intro));
    if (rule.bookUrl) itemRules.push(this.parseCssField('link', rule.bookUrl));
    if (rule.kind) itemRules.push(this.parseCssField('category', rule.kind));
    if (rule.lastChapter) itemRules.push(this.parseCssField('lastChapter', rule.lastChapter));

    hilog.info(0x0000, TAG, `[CSS模式] 解析推荐列表: ${targetUrl}, 列表选择器: ${rule.bookList}`);

    const result = await webViewContentFetcher.fetchBySelectorAll(targetUrl, rule.bookList || '', itemRules);

    if (!result.success) {
      throw new Error(result.error || 'CSS选择器提取列表失败');
    }

    const novels: NovelInfo[] = [];
    for (const item of result.data) {
      const title = (item['title'] || '').trim();
      const cover = (item['cover'] || '').trim();

      if (title && cover) {
        novels.push({
          title: title,
          author: (item['author'] || '未知作者').trim(),
          cover: this.buildFullUrl(targetUrl, cover),
          description: (item['description'] || '暂无简介').trim(),
          link: this.buildFullUrl(targetUrl, item['link'] || ''),
          category: (item['category'] || '').trim(),
          latestChapter: (item['lastChapter'] || '').trim(),
          hotValue: Math.floor(Math.random() * 50 + 10) + '万热度'
        });
      }
    }

    hilog.info(0x0000, TAG, `[CSS模式] 成功解析 ${novels.length} 本推荐小说`);

    return {
      success: true,
      data: novels,
      source: this.source.bookSourceName
    };
  }

  /**
   * 正则表达式模式：解析推荐小说列表（原有逻辑）
   */
  private async parseRecommendNovelsByRegex(targetUrl: string, rule: BookSourceRule): Promise<ParseResult<NovelInfo[]>> {
    const html = await this.fetchHtml(targetUrl);

    const bookItems = this.parseByRule(html, rule.bookList || '', true) as string[];
    const novels: NovelInfo[] = [];

    for (const item of bookItems) {
      try {
        const title = this.cleanHtmlTags(this.parseByRule(item, rule.name || '', false) as string);
        const author = this.cleanHtmlTags(this.parseByRule(item, rule.author || '', false) as string);
        const cover = this.parseByRule(item, rule.coverUrl || '', false) as string;
        const description = this.cleanHtmlTags(this.parseByRule(item, rule.intro || '', false) as string);
        const link = this.parseByRule(item, rule.bookUrl || '', false) as string;
        const category = this.cleanHtmlTags(this.parseByRule(item, rule.kind || '', false) as string);
        const lastChapter = this.cleanHtmlTags(this.parseByRule(item, rule.lastChapter || '', false) as string);

        if (title && cover) {
          novels.push({
            title: title,
            author: author || '未知作者',
            cover: this.buildFullUrl(targetUrl, cover),
            description: description || '暂无简介',
            link: this.buildFullUrl(targetUrl, link),
            category: category,
            latestChapter: lastChapter,
            hotValue: Math.floor(Math.random() * 50 + 10) + '万热度'
          });
        }
      } catch (error) {
        hilog.warn(0x0000, TAG, `解析单个书籍项目失败: ${error}`);
      }
    }

    return {
      success: true,
      data: novels,
      source: this.source.bookSourceName
    };
  }

  /**
   * 解析书籍详情
   * @param bookUrl 书籍详情页URL
   * @returns Promise<ParseResult<BookDetailInfo>> 解析结果
   */
  async parseBookDetail(bookUrl: string): Promise<ParseResult<BookDetailInfo>> {
    try {
      const rule = this.source.ruleBookInfo;

      // JSON API 优先级最高
      if (this.isJsonApiSource()) {
        return await this.parseBookDetailByJsonApi(bookUrl, rule);
      } else if (this.isRuleSetCss(rule)) {
        return await this.parseBookDetailByCss(bookUrl, rule);
      } else {
        return await this.parseBookDetailByRegex(bookUrl, rule);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `解析书籍详情失败: ${error}`);
      return {
        success: false,
        error: error.toString(),
        source: this.source.bookSourceName
      };
    }
  }

  /**
   * CSS选择器模式：解析书籍详情
   */
  private async parseBookDetailByCss(bookUrl: string, rule: BookSourceRule): Promise<ParseResult<BookDetailInfo>> {
    const rules: CssSelectorRule[] = [];

    if (rule.name) rules.push(this.parseCssField('title', rule.name));
    if (rule.author) rules.push(this.parseCssField('author', rule.author));
    if (rule.coverUrl) rules.push(this.parseCssField('cover', rule.coverUrl));
    if (rule.intro) rules.push(this.parseCssField('description', rule.intro));
    if (rule.kind) rules.push(this.parseCssField('category', rule.kind));
    if (rule.lastChapter) rules.push(this.parseCssField('lastChapter', rule.lastChapter));
    if (rule.wordCount) rules.push(this.parseCssField('wordCount', rule.wordCount));
    if (rule.tocUrl) rules.push(this.parseCssField('tocUrl', rule.tocUrl));
    // 状态和更新时间
    if (rule.status) rules.push(this.parseCssField('status', rule.status));
    if (rule.updateTime) rules.push(this.parseCssField('updateTime', rule.updateTime));

    hilog.info(0x0000, TAG, `[CSS模式] 解析书籍详情: ${bookUrl}, 规则数: ${rules.length}`);

    const result = await webViewContentFetcher.fetchBySelector(bookUrl, rules);

    if (!result.success) {
      throw new Error(result.error || 'CSS选择器提取书籍详情失败');
    }

    const data = result.data;
    const bookDetail: BookDetailInfo = {
      title: (data['title'] || '未知书名').trim(),
      author: (data['author'] || '未知作者').trim(),
      cover: data['cover'] ? this.buildFullUrl(bookUrl, data['cover'].trim()) : '',
      description: (data['description'] || '暂无简介').trim(),
      status: (data['status'] || '未知状态').trim(),
      updateTime: (data['updateTime'] || '未知时间').trim(),
      latestChapter: (data['lastChapter'] || '未知章节').trim(),
      category: (data['category'] || '').trim(),
      wordCount: (data['wordCount'] || '').trim(),
      tocUrl: data['tocUrl'] ? this.buildFullUrl(bookUrl, data['tocUrl'].trim()) : ''
    };

    hilog.info(0x0000, TAG, `[CSS模式] 成功解析书籍详情: ${bookDetail.title}`);

    return {
      success: true,
      data: bookDetail,
      source: this.source.bookSourceName
    };
  }

  /**
   * 正则表达式模式：解析书籍详情（原有逻辑）
   */
  private async parseBookDetailByRegex(bookUrl: string, rule: BookSourceRule): Promise<ParseResult<BookDetailInfo>> {
    const html = await this.fetchHtml(bookUrl);

    const title = this.cleanHtmlTags(this.parseByRule(html, rule.name || '', false) as string);
    const author = this.cleanHtmlTags(this.parseByRule(html, rule.author || '', false) as string);
    const cover = this.parseByRule(html, rule.coverUrl || '', false) as string;
    const description = this.cleanHtmlTags(this.parseByRule(html, rule.intro || '', false) as string);
    const category = this.cleanHtmlTags(this.parseByRule(html, rule.kind || '', false) as string);
    const lastChapter = this.cleanHtmlTags(this.parseByRule(html, rule.lastChapter || '', false) as string);
    const wordCount = this.cleanHtmlTags(this.parseByRule(html, rule.wordCount || '', false) as string);
    const tocUrl = this.parseByRule(html, rule.tocUrl || '', false) as string;

    let status = '未知状态';
    let updateTime = '未知时间';

    const statusMatch = html.match(/<meta property="og:novel:status" content="([^"]+)"/);
    if (statusMatch) {
      status = statusMatch[1];
    }

    const updateMatch = html.match(/<meta property="og:novel:update_time" content="([^"]+)"/);
    if (updateMatch) {
      updateTime = updateMatch[1];
    }

    const bookDetail: BookDetailInfo = {
      title: title || '未知书名',
      author: author || '未知作者',
      cover: cover ? this.buildFullUrl(bookUrl, cover) : '',
      description: description || '暂无简介',
      status: status,
      updateTime: updateTime,
      latestChapter: lastChapter || '未知章节',
      category: category,
      wordCount: wordCount,
      tocUrl: tocUrl ? this.buildFullUrl(bookUrl, tocUrl) : ''
    };

    return {
      success: true,
      data: bookDetail,
      source: this.source.bookSourceName
    };
  }

  /**
   * 构建搜索URL
   * @param searchUrl 搜索URL模板
   * @param keyword 搜索关键词
   * @returns 完整的搜索URL
   */
  private buildSearchUrl(searchUrl: string, keyword: string): string {
    // 对关键词进行URL编码
    const encodedKeyword = encodeURIComponent(keyword);
    
    // 替换URL模板中的占位符，支持多种格式
    return searchUrl
      .replace('${keyword}', encodedKeyword)
      .replace('{{key}}', encodedKeyword)
      .replace('{{keyword}}', encodedKeyword);
  }

  /**
   * 解析章节列表
   * @param tocUrl 目录页面URL
   * @returns Promise<ParseResult<ChapterInfo[]>> 解析结果
   */
  async parseChapterList(tocUrl: string): Promise<ParseResult<ChapterInfo[]>> {
    try {
      const rule = this.source.ruleToc;

      // JSON API 优先级最高
      if (this.isJsonApiSource()) {
        return await this.parseChapterListByJsonApi(tocUrl, rule);
      }

      if (!rule.chapterList) {
        throw new Error('书源缺少章节列表规则');
      }

      if (this.isRuleSetCss(rule)) {
        return await this.parseChapterListByCss(tocUrl, rule);
      } else {
        return await this.parseChapterListByRegex(tocUrl, rule);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `解析章节列表失败: ${error}`);
      return {
        success: false,
        error: error.toString(),
        source: this.source.bookSourceName
      };
    }
  }

  /**
   * CSS选择器模式：解析章节列表
   */
  private async parseChapterListByCss(tocUrl: string, rule: BookSourceRule): Promise<ParseResult<ChapterInfo[]>> {
    // 章节列表的CSS选择器：chapterList 是列表项选择器
    // chapterName 和 chapterUrl 是每个列表项内的子选择器
    const itemRules: CssSelectorRule[] = [];

    if (rule.chapterName) itemRules.push(this.parseCssField('title', rule.chapterName));
    if (rule.chapterUrl) itemRules.push(this.parseCssField('url', rule.chapterUrl));

    hilog.info(0x0000, TAG, `[CSS模式] 解析章节列表: ${tocUrl}, 选择器: ${rule.chapterList}`);

    const result = await webViewContentFetcher.fetchBySelectorAll(tocUrl, rule.chapterList || '', itemRules);

    if (!result.success) {
      throw new Error(result.error || 'CSS选择器提取章节列表失败');
    }

    const chapters: ChapterInfo[] = [];
    for (let i = 0; i < result.data.length; i++) {
      const item = result.data[i];
      const title = (item['title'] || '').trim();
      const chapterUrl = (item['url'] || '').trim();

      if (title && chapterUrl) {
        chapters.push({
          title: title,
          url: this.buildFullUrl(tocUrl, chapterUrl),
          index: i + 1
        });
      }
    }

    // 按章节顺序排序
    chapters.sort((a, b) => {
      const aNum = this.extractChapterNumber(a.url);
      const bNum = this.extractChapterNumber(b.url);
      return aNum - bNum;
    });

    hilog.info(0x0000, TAG, `[CSS模式] 成功解析 ${chapters.length} 个章节`);

    return {
      success: true,
      data: chapters,
      source: this.source.bookSourceName
    };
  }

  /**
   * 正则表达式模式：解析章节列表（原有逻辑）
   */
  private async parseChapterListByRegex(tocUrl: string, rule: BookSourceRule): Promise<ParseResult<ChapterInfo[]>> {
    const html = await this.fetchHtml(tocUrl);

    const chapterContainer = this.parseByRule(html, rule.chapterList || '', false) as string;
    const chapters: ChapterInfo[] = [];

    if (chapterContainer) {
      const chapterLinks = this.parseByRule(chapterContainer, rule.chapterUrl || 'a@href', true) as string[];
      const chapterNames = this.parseByRule(chapterContainer, rule.chapterName || 'a@text', true) as string[];

      for (let i = 0; i < Math.min(chapterLinks.length, chapterNames.length); i++) {
        const chapterUrl = chapterLinks[i];
        const chapterName = this.cleanHtmlTags(chapterNames[i]);

        if (chapterName && chapterUrl && chapterUrl.includes('.html')) {
          chapters.push({
            title: chapterName,
            url: this.buildFullUrl(tocUrl, chapterUrl),
            index: i + 1
          });
        }
      }
    }

    chapters.sort((a, b) => {
      const aNum = this.extractChapterNumber(a.url);
      const bNum = this.extractChapterNumber(b.url);
      return aNum - bNum;
    });

    return {
      success: true,
      data: chapters,
      source: this.source.bookSourceName
    };
  }

  /**
   * 从URL中提取章节编号
   * @param url 章节URL
   * @returns 章节编号
   */
  private extractChapterNumber(url: string): number {
    const match = url.match(/\/(\d+)\.html$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 解析章节内容
   * @param chapterUrl 章节URL
   * @returns Promise<ParseResult<string>> 解析结果
   */
  async parseChapterContent(chapterUrl: string): Promise<ParseResult<string>> {
    try {
      const rule = this.source.ruleContent;

      // JSON API 优先级最高
      if (this.isJsonApiSource()) {
        return await this.parseChapterContentByJsonApi(chapterUrl, rule);
      }

      if (!rule.content) {
        throw new Error('书源缺少章节内容规则');
      }

      let content = '';
      let useMethod = '';

      // 判断内容规则是CSS选择器还是正则
      if (this.isCssRule(rule.content)) {
        // CSS选择器模式：使用专门的正文提取方法
        try {
          hilog.info(0x0000, TAG, `[CSS模式] 提取章节正文: ${chapterUrl}, 选择器: ${rule.content}`);
          // 解析CSS选择器，可能包含结束标记
          const contentSelector = rule.content.includes('@') ? rule.content.split('@')[0] : rule.content;
          content = await webViewContentFetcher.fetchContentBySelector(chapterUrl, contentSelector);
          useMethod = 'WebView-CSS';
          hilog.info(0x0000, TAG, `[CSS模式] 成功提取正文，长度: ${content.length}`);
        } catch (cssError) {
          hilog.warn(0x0000, TAG, `[CSS模式] 提取正文失败，降级到通用WebView: ${cssError}`);
          // 降级到通用WebView提取
          try {
            content = await webViewContentFetcher.fetchContent(chapterUrl, rule.content);
            useMethod = 'WebView-fallback';
          } catch (fallbackError) {
            throw new Error(`CSS选择器和WebView都失败: ${cssError}, ${fallbackError}`);
          }
        }
      } else {
        // 正则模式：保持原有逻辑
        try {
          hilog.info(0x0000, TAG, `[正则模式] 使用WebView获取章节内容: ${chapterUrl}`);
          content = await webViewContentFetcher.fetchContent(chapterUrl, rule.content);
          useMethod = 'WebView';
          hilog.info(0x0000, TAG, `WebView成功获取内容，长度: ${content.length}`);
        } catch (webViewError) {
          hilog.warn(0x0000, TAG, `WebView获取内容失败，尝试HTTP请求: ${webViewError}`);
          try {
            const html = await this.fetchHtml(chapterUrl);
            content = this.parseByRule(html, rule.content, false) as string;
            content = this.cleanHtmlTags(content, true);
            useMethod = 'HTTP';
            hilog.info(0x0000, TAG, `HTTP请求获取内容，长度: ${content.length}`);
          } catch (httpError) {
            throw new Error(`无法获取章节内容: WebView失败(${webViewError}), HTTP失败(${httpError})`);
          }
        }
      }

      if (!content || content.trim().length === 0) {
        throw new Error('获取到的章节内容为空');
      }

      // 应用替换规则（正则和CSS模式通用）
      if (rule.replaceRegex && content) {
        try {
          const replaceRules = rule.replaceRegex.split('||');
          for (const replaceRule of replaceRules) {
            const ruleParts = replaceRule.split('##');
            const pattern = ruleParts[0];
            const replacement = ruleParts[1];
            if (pattern) {
              const regex = new RegExp(pattern, 'g');
              content = content.replace(regex, replacement || '');
            }
          }
        } catch (error) {
          hilog.warn(0x0000, TAG, `应用替换规则失败: ${error}`);
        }
      }

      content = this.normalizeChapterContent(content);

      if (content.trim().length < 10) {
        hilog.warn(0x0000, TAG, `章节内容过短(${content.length}字符)，可能解析失败`);
        return {
          success: false,
          error: '章节内容过短，可能解析失败',
          source: this.source.bookSourceName
        };
      }

      hilog.info(0x0000, TAG, `章节内容已标准化，最终长度: ${content.length}，方式: ${useMethod}`);

      return {
        success: true,
        data: content,
        source: this.source.bookSourceName
      };
    } catch (error) {
      hilog.error(0x0000, TAG, `解析章节内容失败: ${error}`);
      return {
        success: false,
        error: error.toString(),
        source: this.source.bookSourceName
      };
    }
  }

  /**
   * 搜索小说
   * @param keyword 搜索关键词
   * @returns Promise<ParseResult<NovelInfo[]>> 解析结果
   */
  async searchNovels(keyword: string): Promise<ParseResult<NovelInfo[]>> {
    try {
      if (!this.source.searchUrl) {
        throw new Error('书源缺少搜索URL');
      }

      const searchUrl = this.source.searchUrl.replace('{{key}}', encodeURIComponent(keyword));
      const rule = this.source.ruleSearch;

      if (!rule.bookList) {
        throw new Error('书源缺少搜索结果列表规则');
      }

      if (this.isRuleSetCss(rule)) {
        return await this.searchNovelsByCss(searchUrl, rule);
      } else {
        return await this.searchNovelsByRegex(searchUrl, rule);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `搜索小说失败: ${error}`);
      return {
        success: false,
        error: error.toString(),
        source: this.source.bookSourceName
      };
    }
  }

  /**
   * CSS选择器模式：搜索小说
   */
  private async searchNovelsByCss(searchUrl: string, rule: BookSourceRule): Promise<ParseResult<NovelInfo[]>> {
    const itemRules: CssSelectorRule[] = [];

    if (rule.name) itemRules.push(this.parseCssField('title', rule.name));
    if (rule.author) itemRules.push(this.parseCssField('author', rule.author));
    if (rule.coverUrl) itemRules.push(this.parseCssField('cover', rule.coverUrl));
    if (rule.intro) itemRules.push(this.parseCssField('description', rule.intro));
    if (rule.bookUrl) itemRules.push(this.parseCssField('link', rule.bookUrl));
    if (rule.kind) itemRules.push(this.parseCssField('category', rule.kind));
    if (rule.lastChapter) itemRules.push(this.parseCssField('lastChapter', rule.lastChapter));

    hilog.info(0x0000, TAG, `[CSS模式] 搜索小说: ${searchUrl}`);

    const result = await webViewContentFetcher.fetchBySelectorAll(searchUrl, rule.bookList || '', itemRules);

    if (!result.success) {
      throw new Error(result.error || 'CSS选择器搜索失败');
    }

    const novels: NovelInfo[] = [];
    for (const item of result.data) {
      const title = (item['title'] || '').trim();

      if (title) {
        novels.push({
          title: title,
          author: (item['author'] || '未知作者').trim(),
          cover: item['cover'] ? this.buildFullUrl(searchUrl, item['cover'].trim()) : '',
          description: (item['description'] || '暂无简介').trim(),
          link: this.buildFullUrl(searchUrl, item['link'] || ''),
          category: (item['category'] || '').trim(),
          latestChapter: (item['lastChapter'] || '').trim()
        });
      }
    }

    hilog.info(0x0000, TAG, `[CSS模式] 搜索到 ${novels.length} 本小说`);

    return {
      success: true,
      data: novels,
      source: this.source.bookSourceName
    };
  }

  /**
   * 正则表达式模式：搜索小说（原有逻辑）
   */
  private async searchNovelsByRegex(searchUrl: string, rule: BookSourceRule): Promise<ParseResult<NovelInfo[]>> {
    const html = await this.fetchHtml(searchUrl);

    const bookItems = this.parseByRule(html, rule.bookList || '', true) as string[];
    const novels: NovelInfo[] = [];

    for (const item of bookItems) {
      try {
        const title = this.cleanHtmlTags(this.parseByRule(item, rule.name || '', false) as string);
        const author = this.cleanHtmlTags(this.parseByRule(item, rule.author || '', false) as string);
        const cover = this.parseByRule(item, rule.coverUrl || '', false) as string;
        const description = this.cleanHtmlTags(this.parseByRule(item, rule.intro || '', false) as string);
        const link = this.parseByRule(item, rule.bookUrl || '', false) as string;
        const category = this.cleanHtmlTags(this.parseByRule(item, rule.kind || '', false) as string);
        const lastChapter = this.cleanHtmlTags(this.parseByRule(item, rule.lastChapter || '', false) as string);

        if (title) {
          novels.push({
            title: title,
            author: author || '未知作者',
            cover: cover ? this.buildFullUrl(searchUrl, cover) : '',
            description: description || '暂无简介',
            link: this.buildFullUrl(searchUrl, link),
            category: category,
            latestChapter: lastChapter
          });
        }
      } catch (error) {
        hilog.warn(0x0000, TAG, `解析搜索结果项目失败: ${error}`);
      }
    }

    return {
      success: true,
      data: novels,
      source: this.source.bookSourceName
    };
  }

  // ==================== JSON API 解析方法 ====================

  /**
   * JSON API模式：解析书籍详情
   * @param bookUrl 书籍URL（从中提取bookId）
   * @param rule 书籍信息规则
   * @returns Promise<ParseResult<BookDetailInfo>> 解析结果
   */
  private async parseBookDetailByJsonApi(bookUrl: string, rule: BookSourceRule): Promise<ParseResult<BookDetailInfo>> {
    const bookId = this.extractBookId(bookUrl);
    if (!bookId) {
      throw new Error(`无法从URL中提取bookId: ${bookUrl}`);
    }

    const apiUrl = rule.apiUrl || this.source.ruleBookInfo.apiUrl || '';
    const apiBookPath = rule.apiBookPath || 'book?id={{bookId}}';

    if (!apiUrl) {
      throw new Error('JSON API书源缺少apiUrl配置');
    }

    const fullUrl = apiUrl + apiBookPath.replace('{{bookId}}', bookId);
    hilog.info(0x0000, TAG, `[JSON API] 请求书籍详情: ${fullUrl}`);

    const json = await this.fetchJson(fullUrl);

    const bookDetail: BookDetailInfo = {
      title: String(json[rule.jsonTitle || 'title'] || '未知书名'),
      author: String(json[rule.jsonAuthor || 'author'] || '未知作者'),
      cover: rule.jsonCover ? String(json[rule.jsonCover] || '') : '',
      description: String(json[rule.jsonIntro || 'intro'] || '暂无简介'),
      status: String(json[rule.jsonStatus || 'full'] || '未知状态'),
      updateTime: String(json[rule.jsonUpdateTime || 'lastupdate'] || '未知时间'),
      latestChapter: String(json[rule.jsonLastChapter || 'lastchapter'] || '未知章节'),
      category: rule.jsonCategory ? String(json[rule.jsonCategory] || '') : '',
      wordCount: '',
      tocUrl: bookUrl
    };

    hilog.info(0x0000, TAG, `[JSON API] 成功解析书籍详情: ${bookDetail.title}, 作者: ${bookDetail.author}`);

    return {
      success: true,
      data: bookDetail,
      source: this.source.bookSourceName
    };
  }

  /**
   * JSON API模式：解析章节列表
   * @param tocUrl 目录URL（从中提取bookId）
   * @param rule 目录规则
   * @returns Promise<ParseResult<ChapterInfo[]>> 解析结果
   */
  private async parseChapterListByJsonApi(tocUrl: string, rule: BookSourceRule): Promise<ParseResult<ChapterInfo[]>> {
    const bookId = this.extractBookId(tocUrl);
    if (!bookId) {
      throw new Error(`无法从URL中提取bookId: ${tocUrl}`);
    }

    const apiUrl = rule.apiUrl || this.source.ruleBookInfo.apiUrl || '';
    const apiChapterListPath = rule.apiChapterListPath || 'booklist?id={{bookId}}';

    if (!apiUrl) {
      throw new Error('JSON API书源缺少apiUrl配置');
    }

    const fullUrl = apiUrl + apiChapterListPath.replace('{{bookId}}', bookId);
    hilog.info(0x0000, TAG, `[JSON API] 请求章节列表: ${fullUrl}`);

    const json = await this.fetchJson(fullUrl);

    // 获取章节列表字段名，默认为 "list"
    const listFieldName = rule.jsonChapterList || 'list';
    const chapterListRaw = json[listFieldName];

    if (!chapterListRaw || !Array.isArray(chapterListRaw)) {
      throw new Error(`JSON API返回的章节列表字段 "${listFieldName}" 不是数组`);
    }

    const chapterList = chapterListRaw as string[];
    const chapters: ChapterInfo[] = [];

    // 构建章节内容URL模板
    const contentApiUrl = this.source.ruleContent.apiUrl || apiUrl;
    const apiChapterPath = this.source.ruleContent.apiChapterPath || 'chapter?id={{bookId}}&chapterid={{chapterId}}';

    for (let i = 0; i < chapterList.length; i++) {
      const chapterName = String(chapterList[i]);
      // chapterId 从 1 开始
      const chapterId = String(i + 1);
      const chapterUrl = contentApiUrl + apiChapterPath
        .replace('{{bookId}}', bookId)
        .replace('{{chapterId}}', chapterId);

      chapters.push({
        title: chapterName,
        url: chapterUrl,
        index: i + 1
      });
    }

    hilog.info(0x0000, TAG, `[JSON API] 成功解析 ${chapters.length} 个章节`);

    return {
      success: true,
      data: chapters,
      source: this.source.bookSourceName
    };
  }

  /**
   * JSON API模式：解析章节内容
   * @param chapterUrl 章节URL（已包含完整API地址）
   * @param rule 内容规则
   * @returns Promise<ParseResult<string>> 解析结果
   */
  private async parseChapterContentByJsonApi(chapterUrl: string, rule: BookSourceRule): Promise<ParseResult<string>> {
    hilog.info(0x0000, TAG, `[JSON API] 请求章节内容: ${chapterUrl}`);

    const json = await this.fetchJson(chapterUrl);

    // 获取正文字段名，默认为 "txt"
    const contentFieldName = rule.jsonContent || 'txt';
    let content = String(json[contentFieldName] || '');

    if (!content || content.trim().length === 0) {
      throw new Error('JSON API返回的章节内容为空');
    }

    // 标准化章节内容格式
    content = this.normalizeChapterContent(content);

    if (content.trim().length < 10) {
      hilog.warn(0x0000, TAG, `[JSON API] 章节内容过短(${content.length}字符)，可能解析失败`);
      return {
        success: false,
        error: '章节内容过短，可能解析失败',
        source: this.source.bookSourceName
      };
    }

    hilog.info(0x0000, TAG, `[JSON API] 成功获取章节内容，长度: ${content.length}`);

    return {
      success: true,
      data: content,
      source: this.source.bookSourceName
    };
  }
}
