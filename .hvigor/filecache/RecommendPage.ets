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
import { common } from '@kit.AbilityKit';

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
   * 使用正则表达式解析HTML内容，提取小说信息
   * @param html HTML内容
   */
  private parseNovelList(html: string) {
    try {
      // 匹配包含小说信息的div块
      const wrapRegex = /<div class="wrap">([\s\S]*?)<\/div>/g;
      let wrapMatch: RegExpExecArray | null;
      const novels: NovelInfo[] = [];

      while ((wrapMatch = wrapRegex.exec(html)) !== null) {
        const wrapContent = wrapMatch[1];
        
        // 提取小说封面
        const coverRegex = /<img[^>]+src="([^"]+)"[^>]*>/;
        const coverMatch = coverRegex.exec(wrapContent);
        const cover = coverMatch ? coverMatch[1] : '';

        // 提取小说标题
        const titleRegex = /<h2[^>]*>([^<]+)<\/h2>/;
        const titleMatch = titleRegex.exec(wrapContent);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // 提取作者
        const authorRegex = /<p[^>]*>作者[：:]([^<]+)<\/p>/;
        const authorMatch = authorRegex.exec(wrapContent);
        const author = authorMatch ? authorMatch[1].trim() : '未知作者';

        // 提取简介
        const descRegex = /<p[^>]*>简介[：:]([^<]+)<\/p>/;
        const descMatch = descRegex.exec(wrapContent);
        const description = descMatch ? descMatch[1].trim() : '暂无简介';

        // 提取详情链接
        const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>/;
        const linkMatch = linkRegex.exec(wrapContent);
        const link = linkMatch ? 'https://www.bqg128.com' + linkMatch[1] : '';

        if (title && cover) {
          novels.push({
            cover: cover,
            title: title,
            author: author,
            description: description,
            link: link
          });
        }
      }

      this.novelList = novels.slice(0, 10); // 取前10本小说
      hilog.info(0x0000, TAG, '成功解析 ' + novels.length + ' 本小说');
      
    } catch (error) {
      hilog.error(0x0000, TAG, '解析HTML失败: ' + JSON.stringify(error));
      this.errorMessage = '解析数据失败';
    }
  }

  /**
   * 构建轮播图组件
   */
  @Builder
  private buildCarousel() {
    if (this.novelList.length === 0) {
      return;
    }

    Column() {
      // 轮播图指示器
      Row() {
        ForEach(this.novelList, (item: NovelInfo, index: number) => {
          Circle()
            .width(8)
            .height(8)
            .fill(index === this.currentIndex ? Color.Red : Color.Gray)
            .margin(4)
        })
      }
      .justifyContent(FlexAlign.Center)
      .margin({ bottom: 16 })

      // 轮播图内容
      Stack() {
        // 小说封面
        Image(this.novelList[this.currentIndex].cover)
          .width('100%')
          .height(200)
          .objectFit(ImageFit.Cover)
          .borderRadius(12)

        // 小说信息遮罩
        Column() {
          Text(this.novelList[this.currentIndex].title)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .margin({ bottom: 8 })
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })

          Text('作者: ' + this.novelList[this.currentIndex].author)
            .fontSize(14)
            .fontColor(Color.White)
            .margin({ bottom: 8 })
            .opacity(0.9)

          Text(this.novelList[this.currentIndex].description)
            .fontSize(12)
            .fontColor(Color.White)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .opacity(0.8)
        }
        .padding(16)
        .width('100%')
        .backgroundColor('#80000000') // 半透明黑色背景
        .align(Alignment.BottomStart)
      }
      .height(200)
      .width('90%')
      .onClick(() => {
        // 点击跳转到小说详情
        this.openNovelDetail(this.novelList[this.currentIndex]);
      })

      // 左右切换按钮
      Row() {
        Button('←')
          .onClick(() => {
            this.prevNovel();
          })
          .margin({ right: 20 })

        Button('→')
          .onClick(() => {
            this.nextNovel();
          })
      }
      .margin({ top: 16 })
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
  private openNovelDetail(novel: NovelInfo) {
    // 这里可以跳转到详情页面或者使用浏览器打开
    hilog.info(0x0000, TAG, '打开小说详情: ' + novel.title);
    // 实际项目中可以添加路由跳转逻辑
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
        Progress()
          .width(40)
          .height(40)
        Text('正在加载推荐小说...')
          .margin({ top: 16 })
      } else if (this.errorMessage) {
        // 错误状态
        Text(this.errorMessage)
          .fontColor(Color.Red)
          .margin({ bottom: 16 })
        Button('重试')
          .onClick(() => {
            this.loadRecommendNovels();
          })
      } else if (this.novelList.length === 0) {
        // 空状态
        Text('暂无推荐小说')
          .fontSize(16)
          .fontColor(Color.Gray)
      } else {
        // 显示轮播图
        this.buildCarousel()
      }

      // 刷新按钮
      Button('刷新推荐')
        .onClick(() => {
          this.loadRecommendNovels();
        })
        .margin({ top: 30 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor($r('app.color.page_background'))
  }
}

export { RecommendPage };