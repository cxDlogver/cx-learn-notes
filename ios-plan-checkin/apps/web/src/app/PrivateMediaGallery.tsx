import { useEffect, useState } from "react";
import { getPrivateMediaDownload } from "../data/api";

interface PrivateImage {
  id: string;
  url: string;
}

export function PrivateMediaGallery({ mediaIds }: { mediaIds: string[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<PrivateImage[]>([]);
  const [error, setError] = useState("");
  const mediaKey = mediaIds.join(",");

  useEffect(() => {
    setOpen(false);
    setImages([]);
    setError("");
  }, [mediaKey]);

  async function load() {
    if (loading || mediaIds.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const downloads = await Promise.all(
        mediaIds.map((id) => getPrivateMediaDownload(id)),
      );
      setImages(
        downloads.map((item, index) => ({
          id: mediaIds[index]!,
          url: item.url,
        })),
      );
      setOpen(true);
    } catch {
      setImages([]);
      setError("照片暂时无法显示，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (mediaIds.length === 0) return null;
  return (
    <div className="private-media-gallery">
      <button
        className="text-button"
        type="button"
        disabled={loading}
        onClick={() => {
          if (open) {
            setOpen(false);
            setImages([]);
          } else void load();
        }}
      >
        {open ? "收起私人照片" : loading ? "正在读取照片…" : "查看已保存照片"}
      </button>
      {error && <p role="alert">{error}</p>}
      {open && (
        <>
          <p>仅你可查看，照片预览链接会短时失效。</p>
          <ul className="private-media-grid">
            {images.map((image, index) => (
              <li key={image.id}>
                <img
                  src={image.url}
                  alt={`私人照片 ${index + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setError("照片链接已失效，请刷新预览")}
                />
              </li>
            ))}
          </ul>
          <button
            className="text-button"
            type="button"
            onClick={() => void load()}
          >
            刷新照片预览
          </button>
        </>
      )}
    </div>
  );
}
