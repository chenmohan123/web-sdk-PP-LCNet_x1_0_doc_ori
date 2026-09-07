# 性能

[English](../en/performance.md)

单张默认使用 WASM/CPU；批量可以显式选择 WebGPU。`loadTimings` 和结果 `timings` 分别记录模型加载、Session 创建、解码、预处理、推理和后处理耗时。

`loadTimings.modelDownloadMs` 仅覆盖网络获取模型字节；`modelCacheReadMs` 覆盖缓存查找及读取（包括未命中）；`integrityMs` 覆盖 SHA-256 与长度校验。损坏缓存重试时累计两次校验。`sessionMs` 是会话创建，`manifestMs` 是清单加载，`totalMs` 是整个初始化耗时，包含缓存写入和必要调度开销。缓存命中时下载为 0；直接传入模型字节时下载与缓存读取为 0，但仍计校验。

旧 `downloadMs` 保持兼容：网络加载时合计下载、校验、缓存写入，缓存命中和直接字节输入时为 0；请勿用它代替标准纯下载耗时。结果 `timings` 的 `decodeMs`、`preprocessMs`、`inferenceMs`、`postprocessMs` 与 `totalMs` 只描述本次检测，不包含初始化。

冷启动指创建检测器并完成首次检测，需分别展示加载与检测耗时、`source`。缓存命中仍属于新建会话的冷启动。热运行指复用同一检测器会话调用 `detect()`；不要把缓存加载称为热推理。Demo 的“加载模型并检测”每次重新创建会话，展示来源、独立耗时、实际后端、执行模式、运行时版本、浏览器与测试日期。复用会话的热运行由公共 SDK API 支持。

模型缓存大小由 `estimateModelCache()` 统计，同一模型的持久化与内存副本只算一份。性能证据仅适用于注明的浏览器、系统、设备、后端和日期；本次标准整改不增加设备或后端兼容承诺。
