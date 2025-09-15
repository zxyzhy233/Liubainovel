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
import { MinePage } from './Mine';
import { RecommendPage } from './RecommendPage';

@Entry
@Component
struct MainPage {
  @State currentIndex: number = 0;

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
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }

  build() {
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
  }
}
