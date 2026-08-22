# Custom manifests

Pass `model` as a manifest URL or validated manifest object. The manifest must declare float32 input `[batch,3,224,224]`, logits output `[batch,4]`, ordered labels `0/90/180/270`, official preprocessing, a positive `maxBatchSize`, an ONNX URL, byte size, and a SHA-256 digest. The SDK rejects incompatible contracts before creating a session.
