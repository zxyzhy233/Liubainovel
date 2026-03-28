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
import { webview } from '@kit.ArkWeb';

const TAG: string = 'AboutPage';

/**
 * 关于页面
 */
@Entry
@Component
struct AboutPage {
  // 应用版本号
  private appVersion: string = '1.0.0';
  // 应用名称
  private appName: string = '留白阅读';
  
  // 控制服务条款弹窗显示
  @State showTermsDialog: boolean = false;
  
  // WebView控制器
  private webViewController: webview.WebviewController = new webview.WebviewController();

  /**
   * 返回上一页
   */
  private goBack(): void {
    try {
      this.getUIContext().getRouter().back();
      hilog.info(0x0000, TAG, '返回上一页');
    } catch (error) {
      hilog.error(0x0000, TAG, '返回失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 显示服务条款弹窗
   */
  private showTerms(): void {
    this.showTermsDialog = true;
    hilog.info(0x0000, TAG, '显示服务条款');
  }

  /**
   * 构建信息列表项
   */
  @Builder
  private buildInfoItem(title: string, value: string, showArrow: boolean = false, onClick?: () => void): void {
    Row() {
      // 标题
      Text(title)
        .fontSize(16)
        .fontColor('#2D3748')
        .layoutWeight(1)
      
      // 值
      Text(value)
        .fontSize(14)
        .fontColor('#718096')
        .margin({ right: showArrow ? 8 : 0 })
      
      // 右箭头
      if (showArrow) {
        Text('>')
          .fontSize(16)
          .fontColor('#A0AEC0')
      }
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
      if (onClick) {
        onClick();
      }
    })
  }

  /**
   * 构建服务条款弹窗
   */
  @Builder
  private buildTermsDialog(): void {
    Column() {
      // 弹窗标题栏
      Row() {
        Text('用户服务条款与条件')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
          .layoutWeight(1)
        
      }
      .width('100%')
      .height(56)
      .padding({ left: 20, right: 20 })
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Center)
      .borderRadius({ topLeft: 12, topRight: 12 })
      .backgroundColor(Color.White)

      // WebView内容区域
      Web({ src: $rawfile('terms_of_service.html'), controller: this.webViewController })
        .width('100%')
        .layoutWeight(1)
        .backgroundColor(Color.White)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 12, topRight: 12 })
  }

  build() {
    Column() {
      // 顶部标题栏
      Row() {
        // 返回按钮
        Row() {
          Text('👈')
            .fontSize(24)
            .fontColor('#2D3748')
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          this.goBack();
        })

        // 标题
        Text('关于')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#2D3748')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        // 占位，保持标题居中
        Row()
          .width(40)
          .height(40)
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Center)

      // 应用信息区域
      Column() {
        // 应用图标
        Image($r('app.media.startIcon'))
          .width(80)
          .height(80)
          .borderRadius(16)
          .margin({ bottom: 16 })

        // 应用名称
        Text(this.appName)
          .fontSize(20)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
      }
      .width('100%')
      .padding({ top: 40, bottom: 40 })
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)

      // 信息列表
      Column({ space: 12 }) {
        // 版本信息
        this.buildInfoItem('版本', this.appVersion, false)
        
        // 用户服务条款
        this.buildInfoItem('用户服务条款与条件', '', true, () => {
          this.showTerms();
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16 })

      Blank()
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background'))
    .bindSheet($$this.showTermsDialog, this.buildTermsDialog(), {
      height: SheetSize.LARGE,
      dragBar: false,
      backgroundColor: Color.Transparent,
      onAppear: () => {
        hilog.info(0x0000, TAG, '服务条款弹窗出现');
      },
      onDisappear: () => {
        hilog.info(0x0000, TAG, '服务条款弹窗消失');
      }
    })
  }
}

export { AboutPage };
