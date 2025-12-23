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
import { common, Want } from '@kit.AbilityKit';
import { bookSourceManager } from '../managers/BookSourceManager';
import { NovelInfo } from '../models/BookSourceModel';

const TAG: string = 'RecommendPage';

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
    // 初始化书源管理器
    await this.initializeBookSourceManager();
    // 加载推荐小说
    await this.loadRecommendNovels();
  }

  /**
   * 初始化书源管理器
   */
  private async initializeBookSourceManager(): Promise<void> {
    try {
      const context = getContext(this) as common.UIAbilityContext;
      await bookSourceManager.initialize(context);
      hilog.info(0x0000, TAG, '书源管理器初始化成功');
    } catch (error) {
      hilog.error(0x0000, TAG, '书源管理器初始化失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 使用书源管理器加载推荐小说
   */
  private async loadRecommendNovels(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      hilog.info(0x0000, TAG, '开始通过书源管理器获取推荐小说');
      
      // 使用书源管理器获取推荐小说
      const result = await bookSourceManager.getRecommendNovels();
      
      if (result.success && result.data) {
        this.novelList = result.data.slice(0, 8); // 取前8本小说用于轮播
        hilog.info(0x0000, TAG, `成功获取 ${this.novelList.length} 本推荐小说，来源: ${result.source || '未知'}`);
        
        // 打印获取到的小说信息
        this.novelList.forEach((novel, index) => {
          hilog.info(0x0000, TAG, `小说${index + 1}: ${novel.title} - ${novel.author}`);
        });
      } else {
        this.errorMessage = result.error || '获取推荐小说失败';
        hilog.error(0x0000, TAG, '获取推荐小说失败: ' + this.errorMessage);
      }
      
    } catch (error) {
      hilog.error(0x0000, TAG, '加载推荐小说异常: ' + JSON.stringify(error));
      this.errorMessage = '加载失败，请重试';
    } finally {
      this.isLoading = false;
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
        // 使用 Swiper 组件替代自定义轮播图
        Swiper() {
          ForEach(this.novelList, (novel: NovelInfo, index: number) => {
            // 轮播图内容
            Stack({ alignContent: Alignment.Bottom }) {
              // 小说封面
              Image(novel.cover)
                .width('100%')
                .height(480)
                .objectFit(ImageFit.Cover)
                .borderRadius(12)

              // 小说信息遮罩 - 与封面底部对齐
              Column() {
                Text(novel.title)
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#FFFFFF')
                  .margin({ bottom: 8 })
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })

                Text('作者: ' + novel.author)
                  .fontSize(14)
                  .fontColor('#FFFFFF')
                  .margin({ bottom: 8 })
                  .opacity(0.9)

                Text(novel.description)
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
              this.openNovelDetail(novel);
            })
          }, (novel: NovelInfo) => novel.link)
        }
        .width('90%')
        .height(480)
        .vertical(false) // 水平滑动
        .autoPlay(true) // 自动播放
        .interval(4000) // 自动播放间隔4秒
        .displayArrow(false) // 不显示箭头
        .effectMode(EdgeEffect.None) // 无边缘效果
        .indicator(new DotIndicator()
          .itemWidth(8)
          .itemHeight(8)
          .selectedItemWidth(12)
          .selectedItemHeight(8)
          .color('#80808080') // 未选中指示器颜色
          .selectedColor('#FFFF0000')) // 选中指示器颜色（红色）
        .onChange((index: number) => {
          this.currentIndex = index;
        })

        // 刷新按钮
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
      // 顶部标题
      Row() {
        Text('小说推荐')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2D3748')
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .justifyContent(FlexAlign.Start)
      .alignItems(VerticalAlign.Center)


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
          .fontColor('#9F6548')
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
    //.justifyContent(FlexAlign.Center)
    //.alignItems(HorizontalAlign.Center)
    .backgroundColor('#F1F3F5')
  }
}

export { RecommendPage };
