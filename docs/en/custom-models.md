# Custom manifests

[中文](../zh-CN/custom-models.md)

Pass `model` as a manifest URL, validated manifest object, or `{ manifest, data }` with an in-memory ONNX `ArrayBuffer`. The manifest must declare float32 input `[batch,3,224,224]`, logits output `[batch,4]`, ordered labels `0/90/180/270`, official preprocessing, a positive `maxBatchSize`, an ONNX URL, byte size, and a SHA-256 digest. In-memory bytes are verified before creating a session; the SDK rejects incompatible contracts before creating a session.
