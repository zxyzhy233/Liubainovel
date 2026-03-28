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

import { Index } from './Index';
import { RecommendPage } from './RecommendPage';
import { MinePage } from './Mine';
import { webview } from '@kit.ArkWeb';
import { webViewContentFetcher } from '../utils/WebViewContentFetcher';

@Entry
@Component
struct MainPage {
  @State currentIndex: number = 0;
  private tabsController: TabsController = new TabsController();
  private webViewController1: webview.WebviewController = new webview.WebviewController();
  private webViewController2: webview.WebviewController = new webview.WebviewController();
  private webViewController3: webview.WebviewController = new webview.WebviewController();

  aboutToAppear(): void {
    // 初始化多个WebView控制器以支持并发下载
    webViewContentFetcher.setController(this.webViewController1);
    webViewContentFetcher.addController(this.webViewController2);
    webViewContentFetcher.addController(this.webViewController3);
  }

  @Builder
  private buildTabItem(title: string, targetIndex: number, icon: Resource) {
    Column() {
      Image(icon)
        .width(18)
        .height(18)
        .fillColor(this.currentIndex === targetIndex ? '#FFFFFF' : '#A8A7A5')
      Text(title)
        .fontColor(this.currentIndex === targetIndex ? '#FFFFFF' : '#A8A7A5')
        .fontSize(10)
        .fontWeight(this.currentIndex === targetIndex ? FontWeight.Bold : FontWeight.Medium)
        .margin({ top: 4 })
    }
    .layoutWeight(1)
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .borderRadius(26)
    .backgroundColor(this.currentIndex === targetIndex ? '#3D8A5A' : Color.Transparent)
    .onClick(() => {
      this.currentIndex = targetIndex;
      this.tabsController.changeIndex(targetIndex);
    })
  }

  build() {
    Stack({ alignContent: Alignment.Bottom }) {
      // 主内容区域 - 使用 Tabs 但隐藏自带 bar
      Tabs({ barPosition: BarPosition.End, controller: this.tabsController }) {
        TabContent() {
          Index()
        }

        TabContent() {
          RecommendPage()
        }

        TabContent() {
          MinePage()
        }
      }
      .onChange((index: number) => {
        this.currentIndex = index;
      })
      .width('100%')
      .height('100%')
      .barHeight(0)

      // 悬浮胶囊 Tab Bar — 绝对定位在底部
      Row() {
        this.buildTabItem('书架', 0, $r('app.media.bookshelf'))
        this.buildTabItem('推荐', 1, $r('app.media.faxian'))
        this.buildTabItem('我的', 2, $r('app.media.usercenter'))
      }
      .width('calc(100% - 42vp)')
      .height(54)
      .borderRadius(36)
      .padding(4)
      .backgroundColor('#FFFFFF')
      .shadow({ radius: 12, color: '#1A191815', offsetX: 0, offsetY: -2 })
      .border({ width: 1, color: '#E5E4E1' })
      .position({ x: 21, y: '100%' })
      .translate({ y: -82 })

      // 隐藏的WebView组件，用于获取章节内容（3个实例支持并发）
      Web({ src: 'about:blank', controller: this.webViewController1 })
        .width(1)
        .height(1)
        .position({ x: -1000, y: -1000 })
        .visibility(Visibility.Hidden)
      
      Web({ src: 'about:blank', controller: this.webViewController2 })
        .width(1)
        .height(1)
        .position({ x: -1100, y: -1000 })
        .visibility(Visibility.Hidden)
      
      Web({ src: 'about:blank', controller: this.webViewController3 })
        .width(1)
        .height(1)
        .position({ x: -1200, y: -1000 })
        .visibility(Visibility.Hidden)
    }
    .width('100%')
    .height('100%')
  }
}
