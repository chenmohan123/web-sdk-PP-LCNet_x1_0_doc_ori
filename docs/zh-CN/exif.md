# EXIF 处理

Blob/File 输入会读取 JPEG EXIF Orientation 1-8，并关闭 ImageBitmap 自动旋转后由 SDK 只归一化一次。Canvas、ImageBitmap、OffscreenCanvas 输入视为调用方已经完成解码和方向处理。
