import { useMemo, useState, type FormEvent } from "react";
import { Button, Card, Input, Modal } from "@demo/ui";

type FieldName = "name" | "phone" | "email" | "company" | "role";
type FormErrors = Partial<Record<FieldName, string>>;

const eventStats = [
  { label: "5 月 28 日", value: "周四 14:00" },
  { label: "120 人", value: "现场席位" },
  { label: "3 小时", value: "实战交流" }
];

const agenda = [
  {
    time: "14:00",
    title: "签到与自由交流",
    detail: "领取活动资料，和同城技术团队建立初步连接。"
  },
  {
    time: "14:30",
    title: "前端工程效率主题分享",
    detail: "围绕组件库、AI 编码工作流和团队协作规范展开。"
  },
  {
    time: "15:40",
    title: "圆桌讨论",
    detail: "讨论从个人提效到团队资产沉淀的落地路径。"
  },
  {
    time: "16:30",
    title: "Demo 体验与答疑",
    detail: "现场演示活动页、表单组件与私有组件库接入方式。"
  }
];

const benefits = ["一线团队工程化实践复盘", "活动资料与 Demo 源码", "现场技术答疑与人脉交流"];

const initialErrors: FormErrors = {};

function getRequiredValue(formData: FormData, name: FieldName) {
  return String(formData.get(name) ?? "").trim();
}

function validateForm(formData: FormData): FormErrors {
  const nextErrors: FormErrors = {};
  const email = getRequiredValue(formData, "email");
  const phone = getRequiredValue(formData, "phone");

  if (!getRequiredValue(formData, "name")) {
    nextErrors.name = "请填写姓名";
  }

  if (!phone) {
    nextErrors.phone = "请填写手机号";
  } else if (!/^1[3-9]\d{9}$/.test(phone)) {
    nextErrors.phone = "请输入有效的中国大陆手机号";
  }

  if (!email) {
    nextErrors.email = "请填写邮箱";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    nextErrors.email = "请输入有效的邮箱地址";
  }

  if (!getRequiredValue(formData, "company")) {
    nextErrors.company = "请填写公司或团队";
  }

  if (!getRequiredValue(formData, "role")) {
    nextErrors.role = "请填写当前角色";
  }

  return nextErrors;
}

export function App() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(initialErrors);
  const [attendeeName, setAttendeeName] = useState("");

  const seatStatus = useMemo(() => {
    const total = 120;
    const remaining = 36;
    return { total, remaining, percent: Math.round(((total - remaining) / total) * 100) };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextErrors = validateForm(formData);

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      setAttendeeName(getRequiredValue(formData, "name"));
      setSubmitting(false);
      setOpen(true);
      form.reset();
    }, 500);
  };

  const openRegistrationInfo = () => {
    setAttendeeName("");
    setOpen(true);
  };

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="event-title">
        <div className="hero__content">
          <p className="eyebrow">团队技术开放日</p>
          <h1 id="event-title">前端工程效率共创会</h1>
          <p className="hero__summary">
            面向前端工程师、技术负责人和产品研发团队的线下活动，集中交流组件库建设、AI 编码协作和研发效能提升。
          </p>
          <div className="event-meta" aria-label="活动基本信息">
            <span>2026.05.28</span>
            <span>上海 · 张江创新中心</span>
            <span>免费报名，审核制入场</span>
          </div>
          <div className="hero__actions">
            <Button size="lg" onClick={() => document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" })}>
              立即报名
            </Button>
            <Button variant="secondary" size="lg" onClick={openRegistrationInfo}>
              查看报名说明
            </Button>
          </div>
        </div>
        <figure className="hero__visual">
          <img src="/course-workbench.png" alt="前端工程效率共创会活动视觉图" />
        </figure>
      </section>

      <section className="metrics" aria-label="活动关键信息">
        {eventStats.map((item) => (
          <div className="metric" key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.value}</span>
          </div>
        ))}
      </section>

      <section className="content-grid" aria-label="活动详情与报名表单">
        <div className="detail-stack">
          <Card title="活动议程" extra="线下交流">
            <ol className="agenda-list">
              {agenda.map((item) => (
                <li key={item.time}>
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="你将获得" extra="适合团队共学">
            <ul className="benefit-list">
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="报名信息" extra={`${seatStatus.remaining} 个名额剩余`}>
          <div className="seat-panel" aria-label={`报名进度 ${seatStatus.percent}%`}>
            <div className="seat-panel__header">
              <span>已预约席位</span>
              <strong>
                {seatStatus.total - seatStatus.remaining}/{seatStatus.total}
              </strong>
            </div>
            <div className="seat-panel__track">
              <span style={{ width: `${seatStatus.percent}%` }} />
            </div>
          </div>

          <form className="signup-form" id="signup" onSubmit={handleSubmit} noValidate>
            <Input label="姓名" name="name" placeholder="请输入姓名" error={errors.name} />
            <Input label="手机号" name="phone" type="tel" placeholder="用于接收入场通知" error={errors.phone} />
            <Input label="邮箱" name="email" type="email" placeholder="name@example.com" error={errors.email} />
            <Input label="公司 / 团队" name="company" placeholder="请输入公司或团队名称" error={errors.company} />
            <Input label="当前角色" name="role" placeholder="前端工程师 / 技术负责人 / 产品研发" error={errors.role} />
            <Button type="submit" size="lg" loading={submitting}>
              提交报名
            </Button>
          </form>
        </Card>
      </section>

      <Modal
        open={open}
        title={attendeeName ? "报名已提交" : "报名说明"}
        onOpenChange={setOpen}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => setOpen(false)}>知道了</Button>
          </>
        }
      >
        {attendeeName
          ? `${attendeeName}，你的报名信息已提交。审核结果和入场二维码会发送到报名邮箱。`
          : "本活动使用 @demo/ui 的 Button、Card、Input、Modal 组件搭建，报名通过后会邮件通知具体入场安排。"}
      </Modal>
    </main>
  );
}
