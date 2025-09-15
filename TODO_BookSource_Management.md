# 书源管理系统实现 TODO

## 目标
将现有代码中的正则表达式和网址按照书源格式进行管理，实现可配置的书源系统，支持全局调用启用的书源。

## 实现计划

### 1. 创建书源管理核心服务
- [x] 创建 `BookSourceManager.ets` - 书源管理服务类
- [x] 创建 `BookSourceParser.ets` - 书源解析器类
- [x] 实现书源的增删改查功能
- [x] 实现启用/禁用书源的管理
- [x] 提供全局访问接口

### 2. 提取现有正则表达式，创建默认书源
- [x] 分析 `BookDetailPage.ets` 中的正则表达式
- [x] 分析 `RecommendPage.ets` 中的正则表达式  
- [x] 创建笔趣阁(bqg128.com)的标准书源JSON文件
- [x] 将正则表达式转换为书源规则格式

### 3. 修改现有页面使用书源系统
- [ ] 修改 `BookDetailPage.ets` 使用书源解析器
- [ ] 修改 `RecommendPage.ets` 使用书源解析器
- [ ] 移除硬编码的正则表达式和URL
- [ ] 实现动态书源选择机制

### 4. 增强书源管理功能
- [ ] 实现书源测试功能
- [ ] 添加书源导入/导出功能
- [ ] 实现书源优先级管理
- [ ] 添加书源使用统计

### 5. 优化和测试
- [ ] 编译测试所有修改
- [ ] 验证书源切换功能
- [ ] 测试多书源支持
- [ ] 性能优化

## 当前状态
正在实现第1步：创建书源管理核心服务

## 文件结构
```
entry/src/main/ets/
├── managers/
│   ├── BookSourceManager.ets     # 书源管理服务
│   └── BookSourceParser.ets      # 书源解析器
├── models/
│   └── BookSourceModel.ets       # 书源数据模型
└── resources/
    └── default_sources.json      # 默认书源配置
```

## 书源JSON格式示例
```json
{
  "bookSourceName": "笔趣阁",
  "bookSourceUrl": "https://www.bqg128.com",
  "enabled": true,
  "ruleSearch": {
    "bookList": "div.item",
    "name": "a@text",
    "author": "span@text"
  },
  "ruleBookInfo": {
    "name": "meta[property='og:title']@content",
    "author": "meta[property='og:novel:author']@content"
  }
}
