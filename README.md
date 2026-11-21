# fuck-ctrl-h

LiteLoaderQQNT 插件：取消 QQ 内置的 **Ctrl+H 隐藏所有窗口**，把原始 Ctrl+H 留给输入法。
不重映射成 Backspace，不拦截输入事件。

## 安装

需要 Linux QQ 和已正常加载的 LiteLoaderQQNT 1.x。

1. 下载 Releases 中的 `no_ctrl_h.zip`。
2. 解压到 LiteLoader **当前数据目录**的 `plugins/no_ctrl_h/`。
3. 确认目录内直接包含 `manifest.json`、`main.js` 和 `discovery.js`。
4. 完全退出 QQ（包括托盘），重新启动。

也可以将本仓库源码放入上述目录，不需要安装 npm 依赖或编译。
升级旧版时覆盖这三个文件；保留 `no_ctrl_h` slug，避免重复安装。

## 多版本识别

QQ 更新会改变 webpack 模块编号、导出名及快捷键枚举值。本插件通过 QQ 实际加载的
模块动态识别快捷键服务和 `HideAllWindow` 枚举，不写死 QQ 版本或模块编号。
只在动作类型、Ctrl 修饰键、H 键及快捷键名称均匹配时移除内置注册项。
每次内置表重新初始化、以及注册快捷键前都会处理，其他快捷键继续注册。
发现模块后会恢复临时模块发现钩子；无法识别时停止处理并记录状态。

这减少了对具体构建的依赖，**不保证未来所有 QQ 版本均兼容**。
如果 QQ 改动接口名、打包结构或加载顺序，仍可能需要适配。
插件只在启动早期工作，安装后必须完全重启 QQ。

## 状态和验证

查看 LiteLoader 数据目录内的 `data/no_ctrl_h/status.json`：

- `disabled`：已移除内置隐藏快捷键。
- `unexpected-shortcut-model`：模型不匹配，保留原行为。
- `service-not-found`：没有识别到快捷键服务。
- `waiting-for-initialization`：已找到服务，尚未观察到目标项移除。

状态不包含聊天内容或账号数据。禁用插件并完全重启 QQ 可恢复原行为。

自动测试：`npm test`（Node.js 内置测试，无第三方依赖）。
覆盖模块编号、导出名、枚举值变化、延迟加载、重复初始化和错误模型保护。
真实 QQ 集成测试结果见 `COMPATIBILITY.md`。

## 许可证

MIT。此仓库仅含插件自身代码，不包含 QQ 二进制、聊天数据或 LiteLoader 本体。
