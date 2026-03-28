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
import { common } from '@kit.AbilityKit';
import { bookDataManager } from '../utils/BookDataManager';
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { preferences } from '@kit.ArkData';

const TAG: string = 'MinePage';

/**
 * 菜单项接口
 */
interface MenuItem {
  title: string;
  icon: string;
  action: () => void;
}

@Entry
@Component
struct MinePage {
  @State currentBookCount: number = 0;  // 当前书架数量
  @State totalBookCount: number = 0;    // 历史添加总数
  @State usageTimeText: string = '0h';  // 使用时长文本
  private appStartTime: number = 0;
  private prefs: preferences.Preferences | null = null;

  async aboutToAppear() {
    this.appStartTime = Date.now();
    const context = getContext(this) as common.UIAbilityContext;
    // 初始化 preferences
    this.prefs = await preferences.getPreferences(context, 'MinePageStats');
    await this.loadStats();
  }

  async aboutToDisappear() {
    await this.saveUsageTime();
  }

  private async loadStats(): Promise<void> {
    try {
      // 获取当前书架数量
      const localBooks = await bookDataManager.queryAllBooks();
      const onlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
      this.currentBookCount = localBooks.length + onlineBooks.length;

      // 获取历史总添加数
      if (this.prefs) {
        const total = await this.prefs.get('totalBookCount', 0) as number;
        // 如果当前数量大于历史记录，更新历史记录
        if (this.currentBookCount > total) {
          this.totalBookCount = this.currentBookCount;
          await this.prefs.put('totalBookCount', this.totalBookCount);
          await this.prefs.flush();
        } else {
          this.totalBookCount = total;
        }

        // 获取累计使用时长（分钟）
        const totalMinutes = await this.prefs.get('totalUsageMinutes', 0) as number;
        this.usageTimeText = this.formatUsageTime(totalMinutes);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '加载统计数据失败: ' + JSON.stringify(error));
    }
  }

  private async saveUsageTime(): Promise<void> {
    if (!this.prefs || this.appStartTime === 0) return;
    try {
      const sessionMinutes = Math.floor((Date.now() - this.appStartTime) / 60000);
      if (sessionMinutes > 0) {
        const totalMinutes = await this.prefs.get('totalUsageMinutes', 0) as number;
        await this.prefs.put('totalUsageMinutes', totalMinutes + sessionMinutes);
        await this.prefs.flush();
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '保存使用时长失败: ' + JSON.stringify(error));
    }
  }

  private formatUsageTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }

  // 菜单项数据
  private menuItems: MenuItem[] = [
    {
      title: '鹿析管理',
      icon: '🦌‌',
      action: () => {
        this.navigateToBookSource();
      }
    },
    // {
    //   title: '主题模式',
    //   icon: '🎨',
    //   action: () => {
    //     hilog.info(0x0000, TAG, '点击主题模式');
    //     // TODO: 实现主题模式功能
    //   }
    // },
    // {
    //   title: '备份与恢复',
    //   icon: '💾',
    //   action: () => {
    //     hilog.info(0x0000, TAG, '点击备份与恢复');
    //     // TODO: 实现备份与恢复功能
    //   }
    // },
    {
      title: '捐赠',
      icon: '❤️',
      action: () => {
        this.navigateToDonatePage();
      }
    },
    {
      title: '关于',
      icon: 'ℹ️',
      action: () => {
        this.navigateToAboutPage();
      }
    }
  ];

  /**
   * 跳转到鹿析管理页面
   */
  private navigateToBookSource(): void {
    try {
      this.getUIContext().getRouter().pushUrl({ url: 'pages/BookSourcePage' });
      hilog.info(0x0000, TAG, '跳转到鹿析管理页面');
    } catch (error) {
      hilog.error(0x0000, TAG, '跳转失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 跳转到捐赠页面
   */
  private navigateToDonatePage(): void {
    try {
      this.getUIContext().getRouter().pushUrl({ url: 'pages/DonatePage' });
      hilog.info(0x0000, TAG, '跳转到捐赠页面');
    } catch (error) {
      hilog.error(0x0000, TAG, '跳转失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 跳转到关于页面
   */
  private navigateToAboutPage(): void {
    try {
      this.getUIContext().getRouter().pushUrl({ url: 'pages/AboutPage' });
      hilog.info(0x0000, TAG, '跳转到关于页面');
    } catch (error) {
      hilog.error(0x0000, TAG, '跳转失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 构建菜单项
   */
  @Builder
  private buildMenuItem(item: MenuItem): void {
    Row() {
      // 图标
      Text(item.icon)
        .fontSize(22)
        .margin({ right: 14 })
      
      // 标题
      Text(item.title)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor($r('app.color.text_primary'))
        .layoutWeight(1)
      
      // 右箭头
      Text('>')
        .fontSize(16)
        .fontColor($r('app.color.text_tertiary'))
    }
    .width('100%')
    .height(52)
    .padding({ left: 18, right: 18 })
    .onClick(() => {
      item.action();
    })
  }

  build() {
    Column() {
      // 顶部标题
      Row() {
        Text('我的')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
        Image($r('app.media.shezhi'))
          .width(22)
          .height(22)
          .fillColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Center)

      // 用户头像区
      Row() {
        // 头像
        Column() {
          Text('🌿')
            .fontSize(28)
        }
        .width(64)
        .height(64)
        .borderRadius(100)
        .linearGradient({
          angle: 135,
          colors: [[$r('app.color.primary_green'), 0], [$r('app.color.dark_green'), 1]]
        })
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text('书友')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
          Text('阅读让心灵自由')
            .fontSize(13)
            .fontColor($r('app.color.text_tertiary'))
            .margin({ top: 4 })
        }
        .alignItems(HorizontalAlign.Start)
        .margin({ left: 16 })
      }
      .width('100%')
      .padding({ left: 24, right: 24, top: 20, bottom: 20 })
      .alignItems(VerticalAlign.Center)

      // 阅读统计
      Row() {
        // 在读
        Column() {
          Text(`${this.currentBookCount}`)
            .fontSize(32)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_green'))
          Text('在读')
            .fontSize(12)
            .fontColor($r('app.color.text_tertiary'))
            .margin({ top: 4 })
        }
        .layoutWeight(1)
        .padding(16)
        .backgroundColor($r('app.color.card_bg'))
        .borderRadius(16)
        .alignItems(HorizontalAlign.Center)
        .shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 })

        // 已读
        Column() {
          Text(`${this.totalBookCount}`)
            .fontSize(32)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.warm_coral'))
          Text('已读')
            .fontSize(12)
            .fontColor($r('app.color.text_tertiary'))
            .margin({ top: 4 })
        }
        .layoutWeight(1)
        .padding(16)
        .backgroundColor($r('app.color.card_bg'))
        .borderRadius(16)
        .alignItems(HorizontalAlign.Center)
        .margin({ left: 12 })
        .shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 })

        // 阅读时长
        Column() {
          Text(this.usageTimeText)
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.dark_green'))
          Text('阅读时长')
            .fontSize(12)
            .fontColor($r('app.color.text_tertiary'))
            .margin({ top: 4 })
        }
        .layoutWeight(1)
        .padding(16)
        .backgroundColor($r('app.color.card_bg'))
        .borderRadius(16)
        .alignItems(HorizontalAlign.Center)
        .margin({ left: 12 })
        .shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 })
      }
      .width('100%')
      .padding({ left: 24, right: 24 })

      // 菜单列表
      Column() {
        ForEach(this.menuItems, (item: MenuItem, index: number) => {
          this.buildMenuItem(item)
          if (index < this.menuItems.length - 1) {
            Divider()
              .color($r('app.color.border_subtle'))
              .margin({ left: 18, right: 18 })
          }
        })
      }
      .width('100%')
      .padding({ left: 24, right: 24, top: 16 })
      .backgroundColor($r('app.color.card_bg'))
      .borderRadius(16)
      .margin({ left: 24, right: 24, top: 16 })
      .shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 })

      Blank()

      // 底部版本信息
      Column() {
        Text('留白阅读 v2.0')
          .fontSize(12)
          .fontColor($r('app.color.text_tertiary'))
        Text('用留白，读好书 🌿')
          .fontSize(11)
          .fontColor($r('app.color.text_tertiary'))
          .margin({ top: 4 })
      }
      .width('100%')
      .padding({ bottom: 100 })
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background'))
  }
}

export { MinePage };
