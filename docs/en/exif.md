# EXIF behavior

[中文](../zh-CN/exif.md)

Blob and File inputs are parsed for JPEG EXIF Orientation 1-8. The SDK requests `imageOrientation: "none"` from `createImageBitmap`, applies the EXIF transform to pixels, and gives the model one normalized raster. This prevents browser display behavior from causing double rotation. Canvas, ImageBitmap, and OffscreenCanvas inputs are assumed to have already been decoded by the caller.
