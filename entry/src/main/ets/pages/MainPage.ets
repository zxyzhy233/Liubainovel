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
  private webViewController: webview.WebviewController = new webview.WebviewController();

  aboutToAppear(): void {
    // 初始化WebView控制器
    webViewContentFetcher.setController(this.webViewController);
  }

  @Builder TabBuilder(title: string, targetIndex: number, icon: Resource) {
    Column() {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor(this.currentIndex === targetIndex ? '#243154' : $r('app.color.black_60_opacity'))
      Text(title)
        .fontColor(this.currentIndex === targetIndex ? '#243154' : $r('app.color.black_60_opacity'))
        .fontSize(12)
    }
    .width('100%')
    .justifyContent(FlexAlign.Center)
  }

  build() {
    Stack() {
      Tabs({ barPosition: BarPosition.End }) {
        TabContent() {
          Index()
        }
        .tabBar(this.TabBuilder('书架', 0, $r('app.media.bookshelf')))

        TabContent() {
          RecommendPage()
        }
        .tabBar(this.TabBuilder('推荐', 1, $r('app.media.faxian')))

        TabContent() {
          MinePage()
        }
        .tabBar(this.TabBuilder('我的', 2, $r('app.media.usercenter')))
      }
      .onChange((index: number) => {
        this.currentIndex = index;
      })
      .width('100%')
      .height('100%')
      .barHeight(76)
      
      // 隐藏的WebView组件，用于获取章节内容
      Web({ src: 'about:blank', controller: this.webViewController })
        .width(1)
        .height(1)
        .position({ x: -1000, y: -1000 })
        .visibility(Visibility.Hidden)
    }
    .width('100%')
    .height('100%')
  }
}
