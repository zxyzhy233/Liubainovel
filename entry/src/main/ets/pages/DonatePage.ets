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

const TAG: string = 'DonatePage';

/**
 * 捐赠页面
 */
@Entry
@Component
struct DonatePage {
  // 微信收款码URL
  private wechatQRCode: string = 'https://gitee.com/zxyzhy233/online-information-storage/raw/master/weixin.png';
  // 支付宝收款码URL
  private alipayQRCode: string = 'https://gitee.com/zxyzhy233/online-information-storage/raw/master/zhifubao.jpg';
  
  // 当前显示的收款码类型
  @State currentPaymentType: 'wechat' | 'alipay' = 'wechat';

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
   * 构建支付按钮
   */
  @Builder
  private buildPaymentButton(type: 'wechat' | 'alipay', label: string, icon: string): void {
    Button() {
      Row() {
        Text(icon)
          .fontSize(24)
          .margin({ right: 8 })
        Text(label)
          .fontSize(16)
          .fontColor(this.currentPaymentType === type ? Color.White : '#2D3748')
      }
    }
    .width('45%')
    .height(48)
    .backgroundColor(this.currentPaymentType === type ? '#07C160' : Color.White)
    .borderRadius(8)
    .shadow({
      radius: 2,
      color: '#10000000',
      offsetY: 1
    })
    .onClick(() => {
      this.currentPaymentType = type;
      hilog.info(0x0000, TAG, `切换到${label}`);
    })
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
        Text('捐赠')
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

      // 支付方式选择按钮
      Row({ space: 16 }) {
        this.buildPaymentButton('wechat', '微信支付', '💚')
        this.buildPaymentButton('alipay', '支付宝', '💙')
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 20 })
      .justifyContent(FlexAlign.Center)

      // 收款码显示区域
      Column() {
        // 提示文字
        Text(this.currentPaymentType === 'wechat' ? '您的认可，是我坚持的动力❤️' : '点滴心意，汇成温暖长河🌊')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
          .margin({ bottom: 20 })

        // 收款码图片
        Image(this.currentPaymentType === 'wechat' ? this.wechatQRCode : this.alipayQRCode)
          .width('80%')
          .aspectRatio(1)
          .objectFit(ImageFit.Contain)
          .borderRadius(8)
          .backgroundColor(Color.White)
          .shadow({
            radius: 8,
            color: '#20000000',
            offsetY: 2
          })

        // 感谢文字
        Text('感谢您的支持！')
          .fontSize(14)
          .fontColor('#718096')
          .margin({ top: 20 })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 40 })
      .justifyContent(FlexAlign.Center)

      Blank()
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background'))
  }
}

export { DonatePage };
