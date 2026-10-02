import { useEffect, useState } from "react";
import type { DataExportDto, DeletionStatusDto } from "@plan-checkin/contracts";
import {
  createDataExport,
  forgetWebSession,
  getDataExportDownloadUrl,
  getDeletionStatus,
  listDataExports,
  requestAccountDeletion,
} from "../data/api";
import { cleanupWebPushAfterLogout } from "./NotificationSettings";

function problem(error: unknown): string {
  return error instanceof Error ? error.message : "请求未完成，请稍后重试";
}

function localTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("zh-CN") : "—";
}

function exportStatus(item: DataExportDto): string {
  if (item.status === "queued") return "等待生成";
  if (item.status === "running") return "正在打包";
  if (item.status === "ready") return "可下载";
  if (item.status === "expired") return "已过期";
  return "生成失败";
}

function ExportsSection() {
  const [items, setItems] = useState<DataExportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setItems(await listDataExports());
  }

  useEffect(() => {
    let cancelled = false;
    void listDataExports()
      .then((value) => {
        if (!cancelled) setItems(value);
      })
      .catch((caught) => {
        if (!cancelled) setError(problem(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !items.some(
        (item) => item.status === "queued" || item.status === "running",
      )
    )
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh().catch((caught) => setError(problem(caught)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [items]);

  async function create() {
    if (busy) return;
    setBusy("create");
    setError("");
    setNotice("");
    try {
      const task = await createDataExport();
      await refresh();
      setNotice(`导出任务已受理（${task.id.slice(0, 8)}），可在本页查看进度。`);
    } catch (caught) {
      setError(problem(caught));
    } finally {
      setBusy("");
    }
  }

  async function download(item: DataExportDto) {
    if (busy) return;
    setBusy(item.id);
    setError("");
    setNotice("");
    try {
      const link = await getDataExportDownloadUrl(item.id);
      if (!/^https?:\/\//.test(link.url)) throw new Error("下载地址无效");
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setNotice(
        `已打开下载。该链接至 ${localTime(link.expiresAt)} 有效，文件 SHA-256：${link.sha256}。`,
      );
    } catch (caught) {
      setError(`${problem(caught)}。如文件已过期，可重新发起导出。`);
      await refresh().catch(() => {});
    } finally {
      setBusy("");
    }
  }

  return (
    <section
      className="social-card data-management"
      data-page-key="data-export"
      aria-labelledby="export-heading"
    >
      <h2 id="export-heading">导出个人数据</h2>
      <p>
        生成的 ZIP 包含计划、历史记录、照片和关系数据，请保存到可信设备。每 24
        小时最多发起 5 次。
      </p>
      <div className="social-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => void create()}
          disabled={Boolean(busy)}
        >
          {" "}
          {busy === "create" ? "正在提交…" : "创建导出"}{" "}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            void refresh().catch((caught) => setError(problem(caught)))
          }
          disabled={Boolean(busy)}
        >
          刷新进度
        </button>
      </div>
      {loading && <p role="status">正在读取导出任务…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-note" role="status">
          {notice}
        </p>
      )}
      {!loading && items.length === 0 && <p>暂无导出任务。</p>}
      {items.length > 0 && (
        <ul className="data-export-list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{exportStatus(item)}</strong>
                <span>创建于 {localTime(item.createdAt)}</span>
                {item.status === "ready" && (
                  <span>
                    文件有效期至 {localTime(item.expiresAt)} ·{" "}
                    {item.fileCount ?? 0} 个文件 · {item.fileBytes ?? 0} 字节
                  </span>
                )}
                {item.status === "failed" && (
                  <span>生成失败，可稍后重新发起导出。</span>
                )}
                {item.status === "expired" && (
                  <span>文件已失效，可重新发起导出。</span>
                )}
              </div>
              {item.status === "ready" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void download(item)}
                  disabled={Boolean(busy)}
                >
                  {busy === item.id ? "正在获取…" : "获取下载链接"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeletionSection({ onDeleted }: { onDeleted: () => void }) {
  const [status, setStatus] = useState<DeletionStatusDto | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getDeletionStatus()
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch((caught) => {
        if (!cancelled) setError(problem(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!confirmChecked || confirmText.trim() !== "注销账号" || busy) return;
    setBusy(true);
    setError("");
    try {
      await requestAccountDeletion();
      forgetWebSession();
      onDeleted();
      void cleanupWebPushAfterLogout();
    } catch (caught) {
      setError(problem(caught));
      setBusy(false);
    }
  }

  return (
    <section
      className="social-card data-management danger-card"
      data-page-key="account-deletion"
      aria-labelledby="deletion-heading"
    >
      <h2 id="deletion-heading">注销账号</h2>
      <p>
        确认后将立即停止所有设备登录，好友也将失去你共享计划的访问权，浏览器通知订阅会关闭。你可在
        30
        天内使用原手机号通过“撤销账号注销”恢复；到期后将清理账号、记录和照片。
      </p>
      {status?.status === "deletion_pending" && (
        <p>
          账号正在注销等待期，截止 {localTime(status.dueAt)}
          。请退出后在登录页撤销。
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label className="deletion-checkbox">
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(event) => setConfirmChecked(event.target.checked)}
        />
        我已了解 30 天撤销期以及到期删除的影响
      </label>
      <label htmlFor="deletion-confirm-text">输入“注销账号”以再次确认</label>
      <input
        id="deletion-confirm-text"
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        autoComplete="off"
      />
      <button
        type="button"
        className="danger-button"
        disabled={
          busy ||
          !confirmChecked ||
          confirmText.trim() !== "注销账号" ||
          status?.status === "deletion_pending"
        }
        onClick={() => void submit()}
      >
        {busy ? "正在提交…" : "确认注销账号"}
      </button>
    </section>
  );
}

export function DataManagement({
  onDeleted,
  section,
}: {
  onDeleted: () => void;
  section?: "exports" | "deletion";
}) {
  return (
    <>
      {section !== "deletion" && <ExportsSection />}
      {section !== "exports" && <DeletionSection onDeleted={onDeleted} />}
    </>
  );
}
