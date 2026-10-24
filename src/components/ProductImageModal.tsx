import { useEffect, useRef, useState } from "react";
import { useResource } from "../hooks/useResource";
import { productEditService } from "../services/productEditService";
import {
  productImageService,
  productImageSource,
  validateProductImage,
  imageTypes,
} from "../services/productImageService";
import { Modal, Feedback } from "./ui";
import type { Role } from "../types/user";
export default function ProductImageModal({
  id,
  role,
  onClose,
  onSaved,
}: {
  id: string;
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const resource = useResource(
    () => productEditService.get(role, id),
    [role, id],
  );
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function save() {
    if (!file || !resource.data || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await productImageService.upload(role, resource.data, file);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Tải ảnh sản phẩm"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && resource.data && (
        <div className="recipe-editor">
          <div className="detail-name">{resource.data.productName}</div>
          <p>
            Chọn ảnh JPG, PNG, WebP hoặc GIF, tối đa 10 MB. Ảnh mới sẽ thay thế
            ảnh hiện tại sau khi lưu.
          </p>
          {productImageSource(resource.data.image) && (
            <figure>
              <img
                src={resource.data.image}
                alt="Ảnh sản phẩm hiện tại"
                style={{ width: "100%", maxHeight: 220, objectFit: "contain" }}
              />
              <figcaption>Ảnh hiện tại</figcaption>
            </figure>
          )}
          <label>
            Chọn ảnh mới
            <input
              type="file"
              accept={imageTypes.join(",")}
              disabled={busy || blocked}
              onChange={(e) => {
                setFile(undefined);
                setError("");
                const next = e.target.files?.[0];
                if (!next) return;
                try {
                  validateProductImage(next);
                  setFile(next);
                } catch (err) {
                  setError((err as Error).message);
                  e.target.value = "";
                }
              }}
            />
          </label>
          {file && preview && (
            <figure>
              <img
                src={preview}
                alt="Xem trước ảnh mới"
                style={{ width: "100%", maxHeight: 260, objectFit: "contain" }}
                onError={() => {
                  setFile(undefined);
                  setError("Không đọc được ảnh. Vui lòng chọn tệp ảnh khác.");
                }}
              />
              <figcaption>
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </figcaption>
            </figure>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={onClose}
            >
              Đóng
            </button>
            <button
              className="button primary"
              disabled={!file || busy || blocked || role !== "ADMIN"}
              onClick={() => void save()}
            >
              {busy ? "Đang tải ảnh…" : "Lưu ảnh sản phẩm"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
