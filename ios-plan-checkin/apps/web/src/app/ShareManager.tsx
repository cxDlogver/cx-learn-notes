import { useEffect, useState } from "react";
import type {
  PlanDto,
  PlanShareDto,
  SharePreviewDto,
  SocialUserDto,
} from "@plan-checkin/contracts";
import {
  getSharePreview,
  grantPlanShare,
  listFriends,
  listPlanShares,
  revokePlanShare,
} from "../data/api";
import { PageHeader } from "./MobileUI";
import { ModalDialog } from "./ModalDialog";

const label = (user: SocialUserDto) => user.nickname || user.username;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "分享操作未完成";

function planMonth(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function ShareManager({
  plan,
  onBack,
}: {
  plan: PlanDto;
  onBack: () => void;
}) {
  const [stage, setStage] = useState<"permissions" | "select" | "preview">(
    "permissions",
  );
  const [friends, setFriends] = useState<SocialUserDto[]>([]);
  const [shares, setShares] = useState<PlanShareDto[]>([]);
  const [friendId, setFriendId] = useState("");
  const [month, setMonth] = useState(() => planMonth(plan.timezone));
  const [preview, setPreview] = useState<SharePreviewDto | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listFriends(), listPlanShares(plan.id)])
      .then(([nextFriends, nextShares]) => {
        if (!cancelled) {
          setFriends(nextFriends);
          setShares(nextShares);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(message(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  async function loadPreview() {
    if (!friendId) return;
    setBusy("preview");
    setError("");
    setNotice("");
    setPreview(null);
    try {
      setPreview(await getSharePreview(plan.id, friendId, month));
      setStage("preview");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  async function grant() {
    if (!preview || !friendId) return;
    setBusy("grant");
    setError("");
    try {
      await grantPlanShare(plan.id, friendId, preview.previewToken);
      setShares(await listPlanShares(plan.id));
      setPreview(null);
      setStage("permissions");
      setNotice("已授权这项计划，朋友现在可以查看共享内容。");
    } catch (caught) {
      setError(message(caught));
      setPreview(null);
    } finally {
      setBusy("");
    }
  }

  async function revoke() {
    if (!revokeId) return;
    setBusy("revoke");
    setError("");
    try {
      await revokePlanShare(plan.id, revokeId);
      setShares(await listPlanShares(plan.id));
      setRevokeId(null);
      setNotice("分享已撤销，旧链接不再开放。");
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader
        title={
          stage === "permissions"
            ? "分享权限"
            : stage === "select"
              ? "选择朋友"
              : "分享预览"
        }
        onBack={() => {
          if (stage === "permissions") onBack();
          else {
            setStage(stage === "preview" ? "select" : "permissions");
            setPreview(null);
          }
        }}
      />
      <section
        className="social-card share-manager"
        data-page-key="share-manager"
        aria-labelledby="share-heading"
      >
        <h2 id="share-heading" tabIndex={-1} className="sr-only">
          与朋友分享
        </h2>
        <p>
          只共享这项计划的规则、进度、历史状态及文字。照片、数值和私人统计不开放。
        </p>
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
        {stage === "permissions" && (
          <>
            <h3>已授权的人</h3>
            {shares.length === 0 && (
              <p className="muted">尚未向任何朋友开放这项计划。</p>
            )}
            {shares.map((share) => (
              <div className="social-person" key={share.friend.id}>
                <div>
                  <strong>{label(share.friend)}</strong>
                  <span>@{share.friend.username}</span>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setRevokeId(share.friend.id)}
                >
                  撤销分享
                </button>
              </div>
            ))}
            {revokeId && (
              <ModalDialog
                className="share-confirm"
                labelledBy="revoke-share-heading"
                fallbackFocusId="share-heading"
                onClose={() => {
                  if (!busy) setRevokeId(null);
                }}
              >
                <h3 id="revoke-share-heading">确认撤销分享？</h3>
                <p>朋友将立即无法通过旧链接查看当前和历史内容。</p>
                <div className="social-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setRevokeId(null)}
                    disabled={Boolean(busy)}
                    data-initial-focus
                  >
                    返回
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void revoke()}
                    disabled={Boolean(busy)}
                  >
                    确认撤销
                  </button>
                </div>
              </ModalDialog>
            )}
            <button
              type="button"
              className="secondary-button full-width"
              onClick={() => setStage("select")}
            >
              添加分享
            </button>
          </>
        )}
        {stage === "select" && (
          <>
            <h3>选择分享好友</h3>
            {friends.length === 0 ? (
              <p className="muted">添加朋友后可以按计划分别授权。</p>
            ) : (
              <div className="share-selectors">
                <label htmlFor="share-friend">选择朋友</label>
                <select
                  id="share-friend"
                  value={friendId}
                  onChange={(event) => {
                    setFriendId(event.target.value);
                    setPreview(null);
                  }}
                >
                  <option value="">请选择</option>
                  {friends
                    .filter(
                      (friend) =>
                        !shares.some((share) => share.friend.id === friend.id),
                    )
                    .map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {label(friend)} (@{friend.username})
                      </option>
                    ))}
                </select>
                <label htmlFor="share-month">预览月份</label>
                <input
                  id="share-month"
                  type="month"
                  value={month}
                  onChange={(event) => {
                    setMonth(event.target.value);
                    setPreview(null);
                  }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!friendId || Boolean(busy)}
                  onClick={() => void loadPreview()}
                >
                  先看朋友能看到什么
                </button>
              </div>
            )}
          </>
        )}
        {stage === "preview" && preview && (
          <div className="share-preview" data-page-key="share-preview">
            <h3>给 {label(preview.friend)} 的分享预览</h3>
            <p>{preview.disclosure}</p>
            <p>
              {preview.plan.title} · {preview.plan.timezone} · {preview.month}
            </p>
            <ul className="share-entry-list">
              {preview.entries.map((entry) => (
                <li key={`${entry.businessDate}-${entry.checkinId ?? "due"}`}>
                  {entry.businessDate} · {entry.status}
                  {entry.note ? ` · ${entry.note}` : ""}
                  {entry.failureReason ? ` · ${entry.failureReason}` : ""}
                </li>
              ))}
            </ul>
            {preview.entries.length === 0 && (
              <p className="muted">这个月没有可见记录。</p>
            )}
            <div className="social-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setPreview(null);
                  setStage("select");
                }}
              >
                返回修改
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={Boolean(busy)}
                onClick={() => void grant()}
              >
                确认授权这项计划
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
