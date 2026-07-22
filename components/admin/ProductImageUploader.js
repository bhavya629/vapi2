import Image from "next/image";
import { useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import styles from "@/styles/productImageUploader.module.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const ENDPOINT = "/api/admin/uploads/products";

function upload(file, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", ENDPOINT);
    request.setRequestHeader("Content-Type", file.type);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) request.setRequestHeader(key, value);
    });
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let body;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        reject(new Error("The upload server returned an invalid response."));
        return;
      }
      if (request.status >= 200 && request.status < 300) resolve(body.data);
      else reject(new Error(body.error?.message || "Image upload failed."));
    };
    request.onerror = () =>
      reject(new Error("Could not connect to the upload server."));
    request.send(file);
  });
}

export default function ProductImageUploader({
  value,
  onChange,
  productSlug,
  colourSlug = "default",
  imageType = "FRONT",
  imageKey = "image",
  alt = "Product image preview",
  className = "",
  onRemove,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const hasImage = Boolean(value);

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Images must be 10 MB or smaller.");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const result = await upload(
        file,
        {
          "x-product-slug": productSlug || "draft-product",
          "x-colour-slug": colourSlug,
          "x-image-type": imageType,
          "x-image-key": imageKey,
          ...(value?.startsWith("/uploads/products/")
            ? { "x-replace-url": value }
            : {}),
        },
        setProgress,
      );
      onChange(result.url);
      setProgress(100);
      toast.success(hasImage ? "Image replaced." : "Image uploaded.");
    } catch (error) {
      toast.error(error.message);
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      if (value?.startsWith("/uploads/products/")) {
        const response = await fetch(
          `${ENDPOINT}?url=${encodeURIComponent(value)}`,
          {
            method: "DELETE",
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message || "Could not remove image.");
      }
      if (onRemove) onRemove();
      else onChange("");
      setProgress(0);
      toast.success("Image removed.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${styles.uploader} ${className}`}>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.fileInput}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={choose}
        disabled={busy}
      />
      <div className={styles.preview}>
        {hasImage ? (
          <Image src={value} alt={alt} width={180} height={150} unoptimized />
        ) : (
          <span>No image selected</span>
        )}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {hasImage ? "Replace Image" : "Choose Image"}
        </button>
        {hasImage && (
          <button
            type="button"
            className={styles.remove}
            disabled={busy}
            onClick={remove}
          >
            Remove Image
          </button>
        )}
      </div>
      {busy && (
        <div className={styles.progress} role="status" aria-live="polite">
          <div>
            <span style={{ width: `${progress}%` }} />
          </div>
          <small>Uploading {progress}%</small>
        </div>
      )}
    </div>
  );
}
