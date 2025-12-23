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
 * WebView内容获取器
 * 使用隐藏的WebView加载页面并提取内容
 */
export class WebViewContentFetcher {
  private controller: webview.WebviewController | null = null;
  private isLoading: boolean = false;
  private loadTimeout: number = 30000; // 30秒超时

  /**
   * 设置WebView控制器
   * @param controller WebView控制器
   */
  setController(controller: webview.WebviewController): void {
    this.controller = controller;
  }

  /**
   * 获取章节内容
   * @param url 章节URL
   * @param contentRule 内容规则（CSS选择器、ID或正则表达式）
   * @returns Promise<string> 章节内容
   */
  async fetchContent(url: string, contentRule: string = '#content'): Promise<string> {
    if (!this.controller) {
      throw new Error('WebView控制器未初始化');
    }

    if (this.isLoading) {
      throw new Error('WebView正在加载其他内容');
    }

    return new Promise<string>((resolve, reject) => {
      this.isLoading = true;
      let timeoutId: number = -1;
      let hasResolved = false;

      // 设置超时
      timeoutId = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          this.isLoading = false;
          hilog.error(0x0000, TAG, `加载超时: ${url}`);
          reject(new Error('加载超时'));
        }
      }, this.loadTimeout);

      try {
        if (!this.controller) {
          throw new Error('WebView控制器未初始化');
        }
        
        // 加载URL
        hilog.info(0x0000, TAG, `开始加载: ${url}`);
        this.controller.loadUrl(url);
        
        // 等待页面加载完成
        setTimeout(async () => {
          if (hasResolved || !this.controller) return;

          try {
            // 判断是否为正则表达式规则
            const isRegexRule = contentRule.includes('[^>]*>') || contentRule.includes('([\\s\\S]*?)');
            
            if (isRegexRule) {
              // 对于正则表达式规则，直接在JavaScript中使用DOM操作
              // 这比在ArkTS端使用正则表达式更可靠
              const script = this.buildRegexExtractScript();
              this.controller.runJavaScript(script, (error: Error, result: string) => {
                if (hasResolved) return;
                
                clearTimeout(timeoutId);
                hasResolved = true;
                this.isLoading = false;

                if (error) {
                  hilog.error(0x0000, TAG, `执行JavaScript失败: ${error.message}`);
                  reject(new Error(`执行JavaScript失败: ${error.message}`));
                  return;
                }

                if (result && typeof result === 'string' && result.length > 0 && !result.startsWith('ERROR:')) {
                  hilog.info(0x0000, TAG, `成功提取内容，长度: ${result.length}`);
                  resolve(result);
                } else {
                  hilog.warn(0x0000, TAG, '提取的内容为空或出错: ' + result);
                  reject(new Error('提取的内容为空'));
                }
              });
            } else {
              // 对于CSS选择器，使用JavaScript直接提取
              const script = this.buildExtractScript(contentRule);
              this.controller.runJavaScript(script, (error: Error, result: string) => {
                if (hasResolved) return;
                
                clearTimeout(timeoutId);
                hasResolved = true;
                this.isLoading = false;

                if (error) {
                  hilog.error(0x0000, TAG, `执行JavaScript失败: ${error.message}`);
                  reject(new Error(`执行JavaScript失败: ${error.message}`));
                  return;
                }

                if (result && typeof result === 'string' && result.length > 0) {
                  hilog.info(0x0000, TAG, `成功提取内容，长度: ${result.length}`);
                  resolve(result);
                } else {
                  hilog.warn(0x0000, TAG, '提取的内容为空');
                  reject(new Error('提取的内容为空'));
                }
              });
            }
          } catch (error) {
            clearTimeout(timeoutId);
            hasResolved = true;
            this.isLoading = false;
            hilog.error(0x0000, TAG, `执行JavaScript失败: ${error}`);
            reject(new Error(`执行JavaScript失败: ${error}`));
          }
        }, 3000); // 等待3秒让页面完全加载
      } catch (error) {
        clearTimeout(timeoutId);
        hasResolved = true;
        this.isLoading = false;
        hilog.error(0x0000, TAG, `加载URL失败: ${error}`);
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
            
            // 保持段落结构：先将HTML中的段落标签转换为换行符
            html = html.replace(/<\\/p>/gi, '</p>\\n\\n');  // 段落结束后添加两个换行符
            html = html.replace(/<p[^>]*>/gi, '');  // 移除段落开始标签
            html = html.replace(/<br\\s*\\/?>/gi, '\\n');  // 将br标签转换为换行符
            html = html.replace(/<div[^>]*>/gi, '\\n');  // div开始标签转换为换行符
            html = html.replace(/<\\/div>/gi, '\\n');  // div结束标签转换为换行符

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
                // 同样保持段落结构
                let html = element.innerHTML;
                html = html.replace(/<\\/p>/gi, '</p>\\n\\n');
                html = html.replace(/<p[^>]*>/gi, '');
                html = html.replace(/<br\\s*\\/?>/gi, '\\n');
                html = html.replace(/<div[^>]*>/gi, '\\n');
                html = html.replace(/<\\/div>/gi, '\\n');

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
            // 规范化换行：移除过多的空行，但保持段落分隔
            content = content.replace(/\\n{4,}/g, '\\n\\n\\n');
            content = content.replace(/\\n{2}\\s+\\n/g, '\\n\\n');

            // 确保段落之间有适当的间距
            content = content.replace(/([。！？])\\s*([^\\n])/g, '$1\\n\\n$2');

            // 为每个段落开头添加两个全角空格（中文排版格式）
            content = content.split('\\n').map(line => {
              line = line.trim();
              if (line.length > 0) {
                return '　　' + line;
              }
              return line;
            }).join('\\n');
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
            // 保持段落结构
            let html = element.innerHTML;
            html = html.replace(/<\\/p>/gi, '</p>\\n\\n');
            html = html.replace(/<p[^>]*>/gi, '');
            html = html.replace(/<br\\s*\\/?>/gi, '\\n');
            html = html.replace(/<div[^>]*>/gi, '\\n');
            html = html.replace(/<\\/div>/gi, '\\n');

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
              html = html.replace(/<\\/p>/gi, '</p>\\n\\n');
              html = html.replace(/<p[^>]*>/gi, '');
              html = html.replace(/<br\\s*\\/?>/gi, '\\n');
              html = html.replace(/<div[^>]*>/gi, '\\n');
              html = html.replace(/<\\/div>/gi, '\\n');

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
                html = html.replace(/<\\/p>/gi, '</p>\\n\\n');
                html = html.replace(/<p[^>]*>/gi, '');
                html = html.replace(/<br\\s*\\/?>/gi, '\\n');
                html = html.replace(/<div[^>]*>/gi, '\\n');
                html = html.replace(/<\\/div>/gi, '\\n');

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
            content = content.replace(/\\n{4,}/g, '\\n\\n\\n');
            content = content.replace(/\\n{2}\\s+\\n/g, '\\n\\n');
            // 确保句子结束后有适当的段落分隔
            content = content.replace(/([。！？])\\s*([^\\n])/g, '$1\\n\\n$2');

            // 为每个段落开头添加两个全角空格（中文排版格式）
            content = content.split('\\n').map(line => {
              line = line.trim();
              if (line.length > 0) {
                return '　　' + line;
              }
              return line;
            }).join('\\n');
          }
          
          return content;
        } catch (e) {
          return 'ERROR: ' + e.toString();
        }
      })();
    `;
  }

  /**
   * 停止加载
   */
  stopLoading(): void {
    if (this.controller && this.isLoading) {
      try {
        this.controller.stop();
        this.isLoading = false;
        hilog.info(0x0000, TAG, '停止加载');
      } catch (error) {
        hilog.error(0x0000, TAG, `停止加载失败: ${error}`);
      }
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopLoading();
    this.controller = null;
    hilog.info(0x0000, TAG, 'WebViewContentFetcher已销毁');
  }
}

/**
 * 全局WebView内容获取器实例
 */
export const webViewContentFetcher = new WebViewContentFetcher();
