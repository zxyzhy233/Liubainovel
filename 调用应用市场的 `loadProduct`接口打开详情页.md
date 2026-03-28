**使用应用市场专属接口 `loadProduct`**直接调用应用市场的 `loadProduct`接口打开详情页：

import { productViewManager } from '@kit.StoreKit'; 
import { common, Want } from '@kit.AbilityKit';  

let wantParam: Want = {   parameters: { bundleName: 'com.liubai.ainovelasst' } // 目标应用包名 }; 
productViewManager.loadProduct(context, wantParam);

* * *


