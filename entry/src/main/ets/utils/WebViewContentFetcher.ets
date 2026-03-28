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

import { webview } from '@kit.ArkWeb';
import { hilog } from '@kit.PerformanceAnalysisKit';

const TAG: string = 'WebViewContentFetcher';

/**
 * CSS选择器查询规则接口
 * 用于批量提取页面数据
 */
export interface CssSelectorRule {
  /** 字段名称 */
  field: string;
  /** CSS选择器 */
  selector: string;
  /** 提取的属性：'text' | 'html' | 'href' | 'src' | 'content' | 其他属性名 */
  attr: string;
}

/**
 * CSS选择器查询结果
 */
export interface CssSelectorResult {
  /** 是否成功 */
  success: boolean;
  /** 提取的数据，key为字段名 */
  data: Record<string, string>;
  /** 错误信息 */
  error?: string;
}

/**
 * CSS选择器批量查询结果（列表）
 */
export interface CssSelectorListResult {
  /** 是否成功 */
  success: boolean;
  /** 提取的数据列表，每个元素是一个记录 */
  data: Record<string, string>[];
  /** 错误信息 */
  error?: string;
}

/**
 * WebView内容获取器
 * 使用隐藏的WebView加载页面并提取内容
 * 支持多个WebView实例以实现并发下载
 * 支持CSS选择器和正则表达式两种解析模式
 */
export class WebViewContentFetcher {
  private controllers: webview.WebviewController[] = [];
  private loadingStates: boolean[] = [];
  private loadTimeout: number = 30000; // 30秒超时

  /**
   * 设置WebView控制器（兼容旧接口）
   * @param controller WebView控制器
   */
  setController(controller: webview.WebviewController): void {
    if (this.controllers.length === 0) {
      this.controllers.push(controller);
      this.loadingStates.push(false);
    }
  }

  /**
   * 添加WebView控制器（支持多实例）
   * @param controller WebView控制器
   */
  addController(controller: webview.WebviewController): void {
    this.controllers.push(controller);
    this.loadingStates.push(false);
    hilog.info(0x0000, TAG, `添加WebView控制器，当前总数: ${this.controllers.length}`);
  }

  /**
   * 获取一个空闲的WebView控制器索引
   * @returns 控制器索引，如果都在使用则返回-1
   */
  private getAvailableControllerIndex(): number {
    for (let i = 0; i < this.loadingStates.length; i++) {
      if (!this.loadingStates[i]) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 等待获取空闲的WebView控制器
   * @returns Promise<number> 控制器索引
   */
  private async waitForAvailableController(): Promise<number> {
    return new Promise<number>((resolve) => {
      const checkInterval = setInterval(() => {
        const index = this.getAvailableControllerIndex();
        if (index >= 0) {
          clearInterval(checkInterval);
          resolve(index);
        }
      }, 100); // 每100ms检查一次
    });
  }

  /**
   * 获取章节内容（支持多WebView并发）
   * @param url 章节URL
   * @param contentRule 内容规则（CSS选择器、ID或正则表达式）
   * @returns Promise<string> 章节内容
   */
  async fetchContent(url: string, contentRule: string = '#content'): Promise<string> {
    if (this.controllers.length === 0) {
      throw new Error('WebView控制器未初始化');
    }

    // 等待获取空闲的控制器
    const controllerIndex = await this.waitForAvailableController();
    const controller = this.controllers[controllerIndex];

    return new Promise<string>((resolve, reject) => {
      this.loadingStates[controllerIndex] = true;
      let timeoutId: number = -1;
      let hasResolved = false;

      // 设置超时
      timeoutId = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          this.loadingStates[controllerIndex] = false;
          hilog.error(0x0000, TAG, `[WebView${controllerIndex}] 加载超时: ${url}`);
          reject(new Error('加载超时'));
        }
      }, this.loadTimeout);

      try {
        // 加载URL
        hilog.info(0x0000, TAG, `[WebView${controllerIndex}] 开始加载: ${url}`);
        controller.loadUrl(url);
        
        // 等待页面加载完成
        setTimeout(async () => {
          if (hasResolved) return;

          try {
            // 判断是否为正则表达式规则
            const isRegexRule = contentRule.includes('[^>]*>') || contentRule.includes('([\\s\\S]*?)');
            
            if (isRegexRule) {
              // 对于正则表达式规则，直接在JavaScript中使用DOM操作
              const script = this.buildRegexExtractScript();
              controller.runJavaScript(script, (error: Error, result: string) => {
                if (hasResolved) return;
                
                clearTimeout(timeoutId);
                hasResolved = true;
                this.loadingStates[controllerIndex] = false;

                if (error) {
                  hilog.error(0x0000, TAG, `[WebView${controllerIndex}] 执行JavaScript失败: ${error.message}`);
                  reject(new Error(`执行JavaScript失败: ${error.message}`));
                  return;
                }

                if (result && typeof result === 'string' && result.length > 0 && !result.startsWith('ERROR:')) {
                  hilog.info(0x0000, TAG, `[WebView${controllerIndex}] 成功提取内容，长度: ${result.length}`);
                  resolve(result);
                } else {
                  hilog.warn(0x0000, TAG, `[WebView${controllerIndex}] 提取的内容为空或出错: ${result}`);
                  reject(new Error('提取的内容为空'));
                }
              });
            } else {
              // 对于CSS选择器，使用JavaScript直接提取
              const script = this.buildExtractScript(contentRule);
              controller.runJavaScript(script, (error: Error, result: string) => {
                if (hasResolved) return;
                
                clearTimeout(timeoutId);
                hasResolved = true;
                this.loadingStates[controllerIndex] = false;

                if (error) {
                  hilog.error(0x0000, TAG, `[WebView${controllerIndex}] 执行JavaScript失败: ${error.message}`);
                  reject(new Error(`执行JavaScript失败: ${error.message}`));
                  return;
                }

                if (result && typeof result === 'string' && result.length > 0) {
                  hilog.info(0x0000, TAG, `[WebView${controllerIndex}] 成功提取内容，长度: ${result.length}`);
                  resolve(result);
                } else {
                  hilog.warn(0x0000, TAG, `[WebView${controllerIndex}] 提取的内容为空`);
                  reject(new Error('提取的内容为空'));
                }
              });
            }
          } catch (error) {
            clearTimeout(timeoutId);
            hasResolved = true;
            this.loadingStates[controllerIndex] = false;
            hilog.error(0x0000, TAG, `[WebView${controllerIndex}] 执行JavaScript失败: ${error}`);
            reject(new Error(`执行JavaScript失败: ${error}`));
          }
        }, 3000); // 等待3秒让页面完全加载
      } catch (error) {
        clearTimeout(timeoutId);
        hasResolved = true;
        this.loadingStates[controllerIndex] = false;
        hilog.error(0x0000, TAG, `[WebView${controllerIndex}] 加载URL失败: ${error}`);
        reject(new Error(`加载URL失败: ${error}`));
      }
    });
  }

  /**
   * 使用正则表达式提取内容（在ArkTS端执行）
   * @param html HTML内容
   * @param pattern 正则表达式模式
   * @returns 提取的内容
   */
  private extractContentByRegex(html: string, pattern: string): string {
    try {
      hilog.info(0x0000, TAG, `开始正则匹配，HTML长度: ${html.length}, 模式: ${pattern.substring(0, 100)}...`);
      
      // 将 [\s\S] 替换为 [^] 以匹配任意字符（包括换行符）
      // 因为 ArkTS 可能不支持 's' 标志
      const normalizedPattern = pattern.replace(/\[\\s\\S\]/g, '[^]');
      hilog.info(0x0000, TAG, `标准化后的模式: ${normalizedPattern.substring(0, 100)}...`);
      
      // 创建正则表达式，不使用 's' 标志
      const regex = new RegExp(normalizedPattern);
      const match = regex.exec(html);
      
      if (match) {
        hilog.info(0x0000, TAG, `正则匹配成功，捕获组数量: ${match.length}`);
        
        if (match[1]) {
          let content = match[1];
          hilog.info(0x0000, TAG, `提取到原始内容，长度: ${content.length}`);
          
          // 移除HTML标签
          content = content.replace(/<[^>]*>/g, '');
          
          // 清理内容
          content = content.trim();
          // 移除常见的广告文本
          content = content.replace(/笔趣阁|www\.|https?:\/\/[^\s]+/gi, '');
          // 规范化换行
          content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          // 移除多余的空行
          content = content.replace(/\n{3,}/g, '\n\n');
          
          hilog.info(0x0000, TAG, `清理后的内容长度: ${content.length}`);
          return content;
        } else {
          hilog.warn(0x0000, TAG, '正则匹配成功但没有捕获组1');
        }
      } else {
        hilog.warn(0x0000, TAG, '正则匹配失败，未找到匹配项');
        
        // 尝试使用备用方案：直接查找 chaptercontent 元素
        hilog.info(0x0000, TAG, '尝试备用方案：查找 #chaptercontent 元素');
        const chapterMatch = html.match(/<div[^>]*id\s*=\s*["']chaptercontent["'][^>]*>([\s\S]*?)<\/div>/i);
        if (chapterMatch && chapterMatch[1]) {
          let content = chapterMatch[1];
          // 移除HTML标签
          content = content.replace(/<[^>]*>/g, '');
          content = content.trim();
          hilog.info(0x0000, TAG, `备用方案成功，内容长度: ${content.length}`);
          return content;
        }
      }
      
      return '';
    } catch (error) {
      hilog.error(0x0000, TAG, `正则表达式执行失败: ${error}`);
      return '';
    }
  }

  /**
   * 构建正则表达式内容提取脚本
   * 直接在JavaScript中使用DOM操作，避免在ArkTS端处理复杂正则
   * @returns JavaScript代码
   */
  private buildRegexExtractScript(): string {
    return `
      (function() {
        try {
          let content = '';
          
          // 方式1: 尝试获取 #chaptercontent 元素
          let element = document.getElementById('chaptercontent');
          if (element) {
            // 获取元素的HTML内容
            let html = element.innerHTML;
            
            // 查找 <p class="readinline"> 标签的位置
            let endIndex = html.indexOf('<p class="readinline">');
            if (endIndex > 0) {
              // 截取到该标签之前的内容
              html = html.substring(0, endIndex);
            }
            
            // 先移除空的<p></p>标签（网站常用空段落做间距，会导致多余换行）
            html = html.replace(/<p[^>]*>\\s*<\\/p>/gi, '');
            
            // 保持段落结构：将有内容的段落标签转换为换行符
            html = html.replace(/<\\/p>/gi, '\\n');     // 段落结束标记一个换行
            html = html.replace(/<p[^>]*>/gi, '');       // 移除段落开始标签
            html = html.replace(/<br\\s*\\/?>/gi, '\\n');  // 将br标签转换为换行符
            html = html.replace(/<div[^>]*>/gi, '\\n');  // div开始标签转换为换行符
            html = html.replace(/<\\/div>/gi, '');       // div结束标签直接移除

            // 创建临时div来解析HTML
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            content = tempDiv.innerText || tempDiv.textContent || '';
          }
          
          // 方式2: 如果方式1失败，尝试其他常见选择器
          if (!content) {
            let selectors = ['#content', '.content', '.chapter-content', 'article'];
            for (let sel of selectors) {
              element = document.querySelector(sel);
              if (element) {
                let html = element.innerHTML;
                html = html.replace(/<p[^>]*>\\s*<\\/p>/gi, '');
                html = html.replace(/<\\/p>/gi, '\\n');
                html = html.replace(/<p[^>]*>/gi, '');
                html = html.replace(/<br\\s*\\/?>/gi, '\\n');
                html = html.replace(/<div[^>]*>/gi, '\\n');
                html = html.replace(/<\\/div>/gi, '');

                let tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                content = tempDiv.innerText || tempDiv.textContent || '';
                if (content) break;
              }
            }
          }
          
          // 清理内容
          if (content) {
            content = content.trim();
            // 移除常见的广告文本
            content = content.replace(/笔趣阁|www\\.|https?:\\/\\/[^\\s]+/gi, '');
            content = content.replace(/请收藏本站.*?$/gm, '');
            content = content.replace(/最⊥新⊥小⊥说.*?$/gm, '');

            // 规范化换行符：将多个连续空格替换为单个空格，但保持换行符
            content = content.replace(/[ \\t]+/g, ' ');
            // 规范化换行：将2个及以上连续换行统一为1个（段落分隔由后续处理负责）
            content = content.replace(/\\n{2,}/g, '\\n');
            // 移除换行符周围的多余空白
            content = content.replace(/\\n\\s+\\n/g, '\\n');
          }
          
          return content || 'ERROR: 未找到章节内容';
        } catch (e) {
          return 'ERROR: ' + e.toString();
        }
      })();
    `;
  }

  /**
   * 构建内容提取脚本（仅用于CSS选择器）
   * @param rule CSS选择器规则
   * @returns JavaScript代码
   */
  private buildExtractScript(rule: string): string {
    // 使用CSS选择器提取内容
    return `
      (function() {
        try {
          let content = '';
          
          // 方式1: 使用querySelector
          let element = document.querySelector('${rule}');
          if (element) {
            let html = element.innerHTML;
            html = html.replace(/<p[^>]*>\\s*<\\/p>/gi, '');
            html = html.replace(/<\\/p>/gi, '\\n');
            html = html.replace(/<p[^>]*>/gi, '');
            html = html.replace(/<br\\s*\\/?>/gi, '\\n');
            html = html.replace(/<div[^>]*>/gi, '\\n');
            html = html.replace(/<\\/div>/gi, '');

            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            content = tempDiv.innerText || tempDiv.textContent || '';
          }
          
          // 方式2: 如果是ID选择器，尝试getElementById
          if (!content && '${rule}'.startsWith('#')) {
            let id = '${rule}'.substring(1);
            element = document.getElementById(id);
            if (element) {
              let html = element.innerHTML;
              html = html.replace(/<p[^>]*>\\s*<\\/p>/gi, '');
              html = html.replace(/<\\/p>/gi, '\\n');
              html = html.replace(/<p[^>]*>/gi, '');
              html = html.replace(/<br\\s*\\/?>/gi, '\\n');
              html = html.replace(/<div[^>]*>/gi, '\\n');
              html = html.replace(/<\\/div>/gi, '');

              let tempDiv = document.createElement('div');
              tempDiv.innerHTML = html;
              content = tempDiv.innerText || tempDiv.textContent || '';
            }
          }
          
          // 方式3: 尝试常见的内容容器
          if (!content) {
            let selectors = ['#chaptercontent', '#content', '.content', '.chapter-content', 'article'];
            for (let sel of selectors) {
              element = document.querySelector(sel);
              if (element) {
                let html = element.innerHTML;
                html = html.replace(/<p[^>]*>\\s*<\\/p>/gi, '');
                html = html.replace(/<\\/p>/gi, '\\n');
                html = html.replace(/<p[^>]*>/gi, '');
                html = html.replace(/<br\\s*\\/?>/gi, '\\n');
                html = html.replace(/<div[^>]*>/gi, '\\n');
                html = html.replace(/<\\/div>/gi, '');

                let tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                content = tempDiv.innerText || tempDiv.textContent || '';
                if (content) break;
              }
            }
          }
          
          // 清理内容
          if (content) {
            content = content.trim();
            // 移除常见的广告文本
            content = content.replace(/笔趣阁|www\\.|https?:\\/\\/[^\\s]+/gi, '');
            // 规范化换行符和空格
            content = content.replace(/[ \\t]+/g, ' ');
            // 规范化换行：将2个及以上连续换行统一为1个
            content = content.replace(/\\n{2,}/g, '\\n');
            // 移除换行符周围的多余空白
            content = content.replace(/\\n\\s+\\n/g, '\\n');
          }
          
          return content;
        } catch (e) {
          return 'ERROR: ' + e.toString();
        }
      })();
    `;
  }

  /**
   * 通用WebView执行器：加载URL并执行JS脚本
   * 封装了控制器获取、超时、状态管理等通用逻辑
   * @param url 要加载的URL
   * @param script 要执行的JavaScript脚本
   * @param waitTime 页面加载等待时间（毫秒）
   * @returns Promise<string> JS执行结果
   */
  private async executeOnWebView(url: string, script: string, waitTime: number = 3000): Promise<string> {
    if (this.controllers.length === 0) {
      throw new Error('WebView控制器未初始化');
    }

    const controllerIndex = await this.waitForAvailableController();
    const controller = this.controllers[controllerIndex];

    return new Promise<string>((resolve, reject) => {
      this.loadingStates[controllerIndex] = true;
      let timeoutId: number = -1;
      let hasResolved = false;

      timeoutId = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          this.loadingStates[controllerIndex] = false;
          hilog.error(0x0000, TAG, `[WebView${controllerIndex}] 执行超时: ${url}`);
          reject(new Error('WebView执行超时'));
        }
      }, this.loadTimeout);

      try {
        controller.loadUrl(url);

        setTimeout(() => {
          if (hasResolved) return;

          try {
            controller.runJavaScript(script, (error: Error, result: string) => {
              if (hasResolved) return;

              clearTimeout(timeoutId);
              hasResolved = true;
              this.loadingStates[controllerIndex] = false;

              if (error) {
                hilog.error(0x0000, TAG, `[WebView${controllerIndex}] JS执行失败: ${error.message}`);
                reject(new Error(`JS执行失败: ${error.message}`));
                return;
              }

              resolve(result || '');
            });
          } catch (error) {
            clearTimeout(timeoutId);
            hasResolved = true;
            this.loadingStates[controllerIndex] = false;
            reject(new Error(`JS执行异常: ${error}`));
          }
        }, waitTime);
      } catch (error) {
        clearTimeout(timeoutId);
        hasResolved = true;
        this.loadingStates[controllerIndex] = false;
        reject(new Error(`加载URL失败: ${error}`));
      }
    });
  }

  /**
   * 使用CSS选择器从页面提取单条数据（多个字段）
   * 适用于：书籍详情页（提取书名、作者、封面等）
   * @param url 页面URL
   * @param rules CSS选择器规则数组
   * @returns Promise<CssSelectorResult> 提取结果
   */
  async fetchBySelector(url: string, rules: CssSelectorRule[]): Promise<CssSelectorResult> {
    try {
      const script = this.buildSingleExtractScript(rules);
      hilog.info(0x0000, TAG, `CSS选择器提取单条数据: ${url}, 规则数: ${rules.length}`);

      const resultStr = await this.executeOnWebView(url, script);

      // 解析JSON结果
      if (resultStr && resultStr.length > 2) {
        // WebView runJavaScript 返回的字符串可能被引号包裹，需要处理
        let jsonStr = resultStr;
        // 如果结果被双引号包裹且内部有转义，先去掉外层引号
        if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
          jsonStr = jsonStr.substring(1, jsonStr.length - 1);
          // 反转义
          jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
        }

        const parsed: Record<string, string | boolean> = JSON.parse(jsonStr);
        if (parsed['__success__'] === true) {
          // 移除内部标记字段
          const data: Record<string, string> = {};
          const keys = Object.keys(parsed);
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key !== '__success__' && key !== '__error__') {
              data[key] = String(parsed[key] || '');
            }
          }
          return { success: true, data: data };
        } else {
          return { success: false, data: {}, error: String(parsed['__error__'] || '提取失败') };
        }
      }

      return { success: false, data: {}, error: '返回结果为空' };
    } catch (error) {
      hilog.error(0x0000, TAG, `CSS选择器提取单条数据失败: ${error}`);
      return { success: false, data: {}, error: String(error) };
    }
  }

  /**
   * 使用CSS选择器从页面提取列表数据
   * 适用于：推荐列表、搜索结果、章节目录
   * @param url 页面URL
   * @param listSelector 列表容器的CSS选择器（选中所有列表项）
   * @param itemRules 每个列表项内部的提取规则
   * @returns Promise<CssSelectorListResult> 提取结果
   */
  async fetchBySelectorAll(url: string, listSelector: string, itemRules: CssSelectorRule[]): Promise<CssSelectorListResult> {
    try {
      const script = this.buildListExtractScript(listSelector, itemRules);
      hilog.info(0x0000, TAG, `CSS选择器提取列表数据: ${url}, 列表选择器: ${listSelector}, 规则数: ${itemRules.length}`);

      const resultStr = await this.executeOnWebView(url, script);

      if (resultStr && resultStr.length > 2) {
        let jsonStr = resultStr;
        if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
          jsonStr = jsonStr.substring(1, jsonStr.length - 1);
          jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
        }

        const parsed: Record<string, Object> = JSON.parse(jsonStr);
        if (parsed['success'] === true) {
          const items = parsed['data'] as Record<string, string>[];
          return { success: true, data: items || [] };
        } else {
          return { success: false, data: [], error: String(parsed['error'] || '提取失败') };
        }
      }

      return { success: false, data: [], error: '返回结果为空' };
    } catch (error) {
      hilog.error(0x0000, TAG, `CSS选择器提取列表数据失败: ${error}`);
      return { success: false, data: [], error: String(error) };
    }
  }

  /**
   * 使用CSS选择器提取章节正文内容
   * 专门优化了正文提取的逻辑（保留段落结构、过滤广告等）
   * @param url 章节URL
   * @param contentSelector 正文容器的CSS选择器
   * @param endSelector 可选，正文结束标记的CSS选择器（截断用）
   * @returns Promise<string> 章节正文
   */
  async fetchContentBySelector(url: string, contentSelector: string, endSelector?: string): Promise<string> {
    const script = this.buildContentExtractScript(contentSelector, endSelector);
    hilog.info(0x0000, TAG, `CSS选择器提取正文: ${url}, 选择器: ${contentSelector}`);

    const result = await this.executeOnWebView(url, script);

    if (result && result.length > 0 && !result.startsWith('ERROR:')) {
      // 处理WebView返回的字符串（可能被引号包裹）
      let content = result;
      if (content.startsWith('"') && content.endsWith('"')) {
        content = content.substring(1, content.length - 1);
        content = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      return content;
    }

    throw new Error('CSS选择器提取正文为空');
  }

  /**
   * 构建单条数据提取的JS脚本
   * @param rules 提取规则
   * @returns JavaScript代码
   */
  private buildSingleExtractScript(rules: CssSelectorRule[]): string {
    // 将规则序列化为JSON传入JS
    const rulesJson = JSON.stringify(rules).replace(/'/g, "\\'").replace(/\\/g, '\\\\');

    return `
      (function() {
        try {
          var rules = ${JSON.stringify(rules)};
          var result = { '__success__': true };

          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var el = document.querySelector(rule.selector);
            var value = '';

            if (el) {
              if (rule.attr === 'text') {
                value = (el.innerText || el.textContent || '').trim();
              } else if (rule.attr === 'html') {
                value = el.innerHTML || '';
              } else if (rule.attr === 'href') {
                value = el.href || el.getAttribute('href') || '';
              } else if (rule.attr === 'src') {
                value = el.src || el.getAttribute('src') || '';
              } else {
                value = el.getAttribute(rule.attr) || '';
              }
            }

            result[rule.field] = value;
          }

          return JSON.stringify(result);
        } catch (e) {
          return JSON.stringify({ '__success__': false, '__error__': e.toString() });
        }
      })();
    `;
  }

  /**
   * 构建列表数据提取的JS脚本
   * @param listSelector 列表项选择器
   * @param itemRules 每个列表项的提取规则
   * @returns JavaScript代码
   */
  private buildListExtractScript(listSelector: string, itemRules: CssSelectorRule[]): string {
    return `
      (function() {
        try {
          var items = document.querySelectorAll('${listSelector.replace(/'/g, "\\'")}');
          var rules = ${JSON.stringify(itemRules)};
          var dataList = [];

          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var record = {};

            for (var j = 0; j < rules.length; j++) {
              var rule = rules[j];
              var el = null;

              // 如果选择器为空或为'.'，表示从当前item自身提取
              if (!rule.selector || rule.selector === '.' || rule.selector === ':self') {
                el = item;
              } else {
                el = item.querySelector(rule.selector);
              }

              var value = '';
              if (el) {
                if (rule.attr === 'text') {
                  value = (el.innerText || el.textContent || '').trim();
                } else if (rule.attr === 'html') {
                  value = el.innerHTML || '';
                } else if (rule.attr === 'href') {
                  value = el.href || el.getAttribute('href') || '';
                } else if (rule.attr === 'src') {
                  value = el.src || el.getAttribute('src') || '';
                } else {
                  value = el.getAttribute(rule.attr) || '';
                }
              }

              record[rule.field] = value;
            }

            dataList.push(record);
          }

          return JSON.stringify({ success: true, data: dataList });
        } catch (e) {
          return JSON.stringify({ success: false, error: e.toString(), data: [] });
        }
      })();
    `;
  }

  /**
   * 构建正文内容提取的JS脚本（CSS选择器版本）
   * 专门优化了段落结构保留和广告过滤
   * @param contentSelector 正文容器选择器
   * @param endSelector 可选的结束标记选择器
   * @returns JavaScript代码
   */
  private buildContentExtractScript(contentSelector: string, endSelector?: string): string {
    return `
      (function() {
        try {
          var el = document.querySelector('${contentSelector.replace(/'/g, "\\'")}');
          if (!el) {
            // 降级：尝试常见选择器
            var fallbacks = ['#chaptercontent', '#content', '.content', '.chapter-content', 'article'];
            for (var i = 0; i < fallbacks.length; i++) {
              el = document.querySelector(fallbacks[i]);
              if (el) break;
            }
          }

          if (!el) {
            return 'ERROR: 未找到正文容器';
          }

          var html = el.innerHTML;

          // 如果有结束标记，截断内容
          ${endSelector ? `
          var endEl = el.querySelector('${endSelector.replace(/'/g, "\\'")}');
          if (endEl) {
            var endHtml = endEl.outerHTML;
            var endIdx = html.indexOf(endHtml);
            if (endIdx > 0) {
              html = html.substring(0, endIdx);
            }
          }
          ` : ''}

          // 移除空段落
          html = html.replace(/<p[^>]*>\\s*<\\/p>/gi, '');
          // 段落标签转换行
          html = html.replace(/<\\/p>/gi, '\\n');
          html = html.replace(/<p[^>]*>/gi, '');
          // br转换行
          html = html.replace(/<br\\s*\\/?>/gi, '\\n');
          // div转换行
          html = html.replace(/<div[^>]*>/gi, '\\n');
          html = html.replace(/<\\/div>/gi, '');

          // 用临时元素解析剩余HTML实体
          var tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          var content = tempDiv.innerText || tempDiv.textContent || '';

          // 清理
          content = content.trim();
          content = content.replace(/[ \\t]+/g, ' ');
          content = content.replace(/\\n{2,}/g, '\\n');
          content = content.replace(/\\n\\s+\\n/g, '\\n');

          return content || 'ERROR: 正文内容为空';
        } catch (e) {
          return 'ERROR: ' + e.toString();
        }
      })();
    `;
  }

  /**
   * 停止所有加载
   */
  stopLoading(): void {
    for (let i = 0; i < this.controllers.length; i++) {
      if (this.loadingStates[i]) {
        try {
          this.controllers[i].stop();
          this.loadingStates[i] = false;
          hilog.info(0x0000, TAG, `[WebView${i}] 停止加载`);
        } catch (error) {
          hilog.error(0x0000, TAG, `[WebView${i}] 停止加载失败: ${error}`);
        }
      }
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopLoading();
    this.controllers = [];
    this.loadingStates = [];
    hilog.info(0x0000, TAG, 'WebViewContentFetcher已销毁');
  }
}

/**
 * 全局WebView内容获取器实例
 */
export const webViewContentFetcher = new WebViewContentFetcher();
