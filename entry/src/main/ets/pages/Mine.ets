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
  // 菜单项数据
  private menuItems: MenuItem[] = [
    {
      title: '书源管理',
      icon: '📚',
      action: () => {
        this.navigateToBookSource();
      }
    },
    {
      title: '主题模式',
      icon: '🎨',
      action: () => {
        hilog.info(0x0000, TAG, '点击主题模式');
        // TODO: 实现主题模式功能
      }
    },
    {
      title: '备份与恢复',
      icon: '💾',
      action: () => {
        hilog.info(0x0000, TAG, '点击备份与恢复');
        // TODO: 实现备份与恢复功能
      }
    },
    {
      title: '捐赠',
      icon: '❤️',
      action: () => {
        hilog.info(0x0000, TAG, '点击捐赠');
        // TODO: 实现捐赠功能
      }
    },
    {
      title: '关于',
      icon: 'ℹ️',
      action: () => {
        hilog.info(0x0000, TAG, '点击关于');
        // TODO: 实现关于功能
      }
    }
  ];

  /**
   * 跳转到书源管理页面
   */
  private navigateToBookSource(): void {
    try {
      this.getUIContext().getRouter().pushUrl({ url: 'pages/BookSourcePage' });
      hilog.info(0x0000, TAG, '跳转到书源管理页面');
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
        .fontSize(24)
        .margin({ right: 16 })
      
      // 标题
      Text(item.title)
        .fontSize(16)
        .fontColor('#2D3748')
        .layoutWeight(1)
      
      // 右箭头
      Text('>')
        .fontSize(16)
        .fontColor('#A0AEC0')
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .backgroundColor(Color.White)
    .borderRadius(8)
    .shadow({
      radius: 2,
      color: '#10000000',
      offsetY: 1
    })
    .onClick(() => {
      item.action();
    })
  }

  build() {
    Column() {
      // 顶部标题
      Row() {
        Text('我的')
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

      // 菜单列表
      Column({ space: 12 }) {
        ForEach(this.menuItems, (item: MenuItem, index: number) => {
          this.buildMenuItem(item)
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 20 })

      Blank()
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background'))
  }
}

export { MinePage };
