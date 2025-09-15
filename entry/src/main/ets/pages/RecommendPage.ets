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

import { http } from '@kit.NetworkKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { common, Want } from '@kit.AbilityKit';

const TAG: string = 'RecommendPage';

/**
 * 小说信息接口
 */
interface NovelInfo {
  cover: string; // 封面图片URL
  title: string; // 小说标题
  author: string; // 作者
  description: string; // 简介
  link: string; // 详情链接
}

@Entry
@Component
struct RecommendPage {
  @State novelList: NovelInfo[] = []; // 小说列表
  @State currentIndex: number = 0; // 当前轮播图索引
  @State isLoading: boolean = true; // 加载状态
  @State errorMessage: string = ''; // 错误信息

  /**
   * 页面显示时加载推荐小说
   */
  async aboutToAppear() {
    await this.loadRecommendNovels();
  }

  /**
   * 从笔趣阁网站加载推荐小说
   */
  private async loadRecommendNovels() {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      // 创建HTTP请求
      let httpRequest = http.createHttp();
      let response = await httpRequest.request(
        'https://www.bqg128.com/',
        {
          method: http.RequestMethod.GET,
          header: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (response.responseCode === 200) {
        const htmlContent = response.result.toString();
        this.parseNovelList(htmlContent);
      } else {
        hilog.error(0x0000, TAG, 'HTTP请求失败: ' + response.responseCode);
        this.errorMessage = '网络请求失败，请检查网络连接';
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '加载推荐小说失败: ' + JSON.stringify(error));
      this.errorMessage = '加载失败，请重试';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 使用正则表达式解析HTML内容，提取热门小说信息
   * @param html HTML内容
   */
  private parseNovelList(html: string) {
    try {
      // 先打印HTML内容的一部分用于调试
      hilog.info(0x0000, TAG, 'HTML内容长度: ' + html.length);
      
      // 匹配 <div class="hot"> 区域内容，使用更精确的匹配
      const hotRegex = /<div class="hot">([\s\S]*?)<\/div>\s*<div class="top">/;
      const hotMatch = hotRegex.exec(html);
      
      if (!hotMatch) {
        hilog.warn(0x0000, TAG, '未找到热门小说区域，尝试备用匹配');
        // 备用匹配方案
        const hotRegexAlt = /<div class="hot">([\s\S]*?)(?=<div class="top"|$)/;
        const hotMatchAlt = hotRegexAlt.exec(html);
        if (!hotMatchAlt) {
          this.errorMessage = '未找到热门小说数据';
          return;
        }
        this.parseHotContent(hotMatchAlt[1]);
        return;
      }

      this.parseHotContent(hotMatch[1]);
      
    } catch (error) {
      hilog.error(0x0000, TAG, '解析HTML失败: ' + JSON.stringify(error));
      this.errorMessage = '解析数据失败';
    }
  }

  /**
   * 解析热门区域内容
   * @param hotContent 热门区域HTML内容
   */
  private parseHotContent(hotContent: string) {
    try {
      hilog.info(0x0000, TAG, '热门区域内容长度: ' + hotContent.length);
      
      const novels: NovelInfo[] = [];

      // 使用更精确的正则表达式匹配完整的item结构
      const itemRegex = /<div class="item">[\s\S]*?<div class="image">[\s\S]*?<\/div>[\s\S]*?<dl>[\s\S]*?<\/dl>[\s\S]*?<\/div>/g;
      let itemMatch: RegExpExecArray | null;
      let count = 0;

      while ((itemMatch = itemRegex.exec(hotContent)) !== null && count < 4) {
        const itemContent = itemMatch[0]; // 使用完整匹配内容
        
        hilog.info(0x0000, TAG, `解析第${count + 1}个item，内容长度: ${itemContent.length}`);
        
        // 提取封面图片
        const coverRegex = /<img[^>]+src="([^"]+)"[^>]*>/;
        const coverMatch = coverRegex.exec(itemContent);
        const cover = coverMatch ? coverMatch[1] : '';
        
        // 提取小说标题和链接
        const titleRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        let titleMatch: RegExpExecArray | null;
        let link = '';
        let title = '';
        
        // 找到dt标签内的a标签（第二个a标签通常是标题）
        let matchCount = 0;
        while ((titleMatch = titleRegex.exec(itemContent)) !== null) {
          matchCount++;
          if (matchCount === 2) { // 第二个a标签是标题
            link = titleMatch[1];
            title = titleMatch[2].trim();
            break;
          }
        }
        
        // 如果没找到第二个a标签，使用第一个
        if (!title && !link) {
          titleRegex.lastIndex = 0; // 重置正则表达式
          titleMatch = titleRegex.exec(itemContent);
          if (titleMatch) {
            link = titleMatch[1];
            title = titleMatch[2].trim();
          }
        }
        
        // 提取作者
        const authorRegex = /<span[^>]*>([^<]+)<\/span>/;
        const authorMatch = authorRegex.exec(itemContent);
        const author = authorMatch ? authorMatch[1].trim() : '未知作者';
        
        // 提取简介
        const descRegex = /<dd[^>]*>([^<]+)<\/dd>/;
        const descMatch = descRegex.exec(itemContent);
        const description = descMatch ? descMatch[1].trim() : '暂无简介';

        hilog.info(0x0000, TAG, `解析结果 - 标题: ${title}, 作者: ${author}, 链接: ${link}`);

        if (title && link) {
          novels.push({
            cover: cover.startsWith('http') ? cover : 'https://www.bqg128.com' + cover,
            title: title,
            author: author,
            description: description,
            link: link.startsWith('http') ? link : 'https://www.bqg128.com' + link
          } as NovelInfo);
          count++;
        }
      }

      this.novelList = novels.slice(0, 4); // 只取4本小说
      hilog.info(0x0000, TAG, '成功解析 ' + this.novelList.length + ' 本热门小说');
      
      // 打印解析结果用于调试
      this.novelList.forEach((novel, index) => {
        hilog.info(0x0000, TAG, `小说${index + 1}: ${novel.title} - ${novel.author}`);
      });
      
    } catch (error) {
      hilog.error(0x0000, TAG, '解析热门内容失败: ' + JSON.stringify(error));
      this.errorMessage = '解析数据失败';
    }
  }

  /**
   * 构建轮播图组件
   */
  @Builder
  private buildCarousel() {
    if (this.novelList.length === 0) {
      Column() {
        Text('暂无数据')
      }
    } else {
      Column() {
        // 轮播图指示器
        Row() {
          ForEach(this.novelList, (item: NovelInfo, index: number) => {
            Circle({ width: 8, height: 8 })
              .fill(index === this.currentIndex ? '#FF0000' : '#808080')
              .margin({ right: 4 })
          })
        }
        .justifyContent(FlexAlign.Center)
        .margin({ bottom: 16 })

        // 轮播图内容
        Stack({ alignContent: Alignment.Bottom }) {
          // 小说封面
          Image(this.novelList[this.currentIndex].cover)
            .width('100%')
            .height(480)
            .objectFit(ImageFit.Cover)
            .borderRadius(12)

          // 小说信息遮罩 - 与封面底部对齐
          Column() {
            Text(this.novelList[this.currentIndex].title)
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor('#FFFFFF')
              .margin({ bottom: 8 })
              .maxLines(1)
              .textOverflow({ overflow: TextOverflow.Ellipsis })

            Text('作者: ' + this.novelList[this.currentIndex].author)
              .fontSize(14)
              .fontColor('#FFFFFF')
              .margin({ bottom: 8 })
              .opacity(0.9)

            Text(this.novelList[this.currentIndex].description)
              .fontSize(12)
              .fontColor('#FFFFFF')
              .maxLines(2)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .opacity(0.8)
          }
          .padding(16)
          .width('100%')
          .align(Alignment.Top)
          .backgroundColor('#80000000') // 半透明黑色背景
          .alignSelf(ItemAlign.End) // 与Stack底部对齐
          .borderRadius({ bottomLeft: 12, bottomRight: 12 }) // 与封面底部圆角保持一致
        }
        .height(480) // 与封面高度一致
        .width('90%')
        .onClick(() => {
          // 点击跳转到小说详情
          this.openNovelDetail(this.novelList[this.currentIndex]);
        })

        // 左右切换按钮 - 移动到图片下方，增加间距
        Row() {
          Button('←')
            .onClick(() => {
              this.prevNovel();
            })
            .backgroundColor('#E0E0E0')
            .fontColor('#333333')
            .borderRadius(8)
            .width(50)
            .height(40)

          Blank() // 使用Blank组件填充中间空间，让按钮分布在两端

          Button('→')
            .onClick(() => {
              this.nextNovel();
            })
            .backgroundColor('#E0E0E0')
            .fontColor('#333333')
            .borderRadius(8)
            .width(50)
            .height(40)
        }
        .width('90%')
        .justifyContent(FlexAlign.SpaceBetween) // 两端对齐，最大化间距
        .margin({ top: 16 })

        // 刷新按钮 - 移动到图片下方
        Button('刷新推荐')
          .onClick(() => {
            this.loadRecommendNovels();
          })
          .margin({ top: 16 })
          .backgroundColor('#007AFF')
          .fontColor('#FFFFFF')
          .borderRadius(8)
          .width(120)
          .height(40)
      }
    }
  }

  /**
   * 切换到上一本小说
   */
  private prevNovel() {
    this.currentIndex = (this.currentIndex - 1 + this.novelList.length) % this.novelList.length;
  }

  /**
   * 切换到下一本小说
   */
  private nextNovel() {
    this.currentIndex = (this.currentIndex + 1) % this.novelList.length;
  }

  /**
   * 打开小说详情
   * @param novel 小说信息
   */
  private async openNovelDetail(novel: NovelInfo) {
    try {
      hilog.info(0x0000, TAG, '准备打开小说详情: ' + novel.title + ', 链接: ' + novel.link);
      
      // 获取应用上下文
      const context = getContext(this) as common.UIAbilityContext;
      
      // 创建Intent，使用系统浏览器打开小说详情页面
      const wantInfo: Want = {
        action: 'ohos.want.action.viewData',
        entities: ['entity.system.browsable'],
        uri: novel.link
      };
      
      // 启动浏览器
      await context.startAbility(wantInfo);
      hilog.info(0x0000, TAG, '成功打开小说详情页面');
      
    } catch (error) {
      hilog.error(0x0000, TAG, '打开小说详情失败: ' + JSON.stringify(error));
      
      // 如果系统浏览器打开失败，尝试显示提示信息
      this.errorMessage = '无法打开浏览器，请检查系统设置';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  build() {
    Column() {
      // 标题
      Text('小说推荐')
        .fontSize(24)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 20, bottom: 20 })

      if (this.isLoading) {
        // 加载中状态
        Column() {
          Progress({ value: 0, total: 100, type: ProgressType.Ring })
            .width(40)
            .height(40)
          Text('正在加载推荐小说...')
            .margin({ top: 16 })
        }
      } else if (this.errorMessage) {
        // 错误状态
        Text(this.errorMessage)
          .fontColor('#FF0000')
          .margin({ bottom: 16 })
        Button('重试')
          .onClick(() => {
            this.loadRecommendNovels();
          })
      } else if (this.novelList.length === 0) {
        // 空状态
        Column() {
          Text('暂无推荐小说')
            .fontSize(16)
            .fontColor('#808080')
        }
      } else {
        // 显示轮播图
        this.buildCarousel()
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor('#F1F3F5')
  }
}

export { RecommendPage };
