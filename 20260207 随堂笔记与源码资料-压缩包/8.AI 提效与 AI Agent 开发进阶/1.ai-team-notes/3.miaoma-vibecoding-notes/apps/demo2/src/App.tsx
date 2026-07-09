import { useMemo, useState, type FormEvent } from "react";
import { Button, Card, Input, Modal } from "@miaoma/ui";

type FieldName = "name" | "phone" | "email" | "company" | "role" | "goal";
type FormErrors = Partial<Record<FieldName, string>>;

const practicalProjects = [
  "企业级权限后台",
  "低代码表单搭建器",
  "可视化数据大屏",
  "在线协作文档",
  "组件库工程化",
  "支付订单工作台",
  "实时消息中心",
  "前端监控平台",
  "跨端课程 App",
  "自动化测试平台"
];

const aiProjects = [
  {
    title: "AI 简历与面试官",
    detail: "把岗位画像、简历解析、追问策略和评分报告串成完整招聘辅助链路。"
  },
  {
    title: "企业 RAG 知识库",
    detail: "完成文档切分、向量检索、权限隔离、答案溯源和运营评估闭环。"
  },
  {
    title: "多智能体研发助手",
    detail: "围绕需求拆解、代码生成、评审和测试修复构建可落地的 AI 工作流。"
  }
];

const outcomes = [
  "10 个完整项目从需求到上线拆解",
  "3 个 AI 项目覆盖 RAG、Agent 与面试评估",
  "配套源码、架构图和工程规范模板"
];

function getValue(formData: FormData, name: FieldName) {
  return String(formData.get(name) ?? "").trim();
}

function validateForm(formData: FormData): FormErrors {
  const nextErrors: FormErrors = {};
  const phone = getValue(formData, "phone");
  const email = getValue(formData, "email");

  if (!getValue(formData, "name")) {
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

  if (!getValue(formData, "company")) {
    nextErrors.company = "请填写公司或团队";
  }

  if (!getValue(formData, "role")) {
    nextErrors.role = "请填写当前角色";
  }

  if (!getValue(formData, "goal")) {
    nextErrors.goal = "请填写你最想提升的方向";
  }

  return nextErrors;
}

export function App() {
  const [errors, setErrors] = useState<FormErrors>({});
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendeeName, setAttendeeName] = useState("");

  const seatStatus = useMemo(() => {
    const total = 120;
    const remaining = 28;
    return {
      total,
      remaining,
      used: total - remaining,
      percent: Math.round(((total - remaining) / total) * 100)
    };
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
      setAttendeeName(getValue(formData, "name"));
      setSubmitting(false);
      setOpen(true);
      form.reset();
    }, 450);
  };

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__content">
          <p className="eyebrow">妙码项目实战训练营</p>
          <h1 id="page-title">10 大项目实战，补齐工程能力与 AI 产品竞争力</h1>
          <p className="hero__summary">
            面向想系统提升的前端工程师，用真实业务项目训练架构、组件化、协作交付和 AI 应用落地能力。
          </p>
          <div className="hero__actions">
            <Button size="lg" onClick={() => document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" })}>
              立即报名
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
              查看课程亮点
            </Button>
          </div>
          <div className="hero__metrics" aria-label="训练营信息">
            <span>8 周强化训练</span>
            <span>源码与作业评审</span>
            <span>限额 {seatStatus.total} 人</span>
          </div>
        </div>

        <figure className="hero__visual">
          <img src="/course-workbench.png" alt="妙码项目实战训练营课程工作台" />
        </figure>
      </section>

      <section className="section-grid" aria-label="课程亮点">
        {outcomes.map((item) => (
          <div className="outcome" key={item}>
            {item}
          </div>
        ))}
      </section>

      <section className="content-grid" aria-label="项目实战与报名">
        <div className="detail-stack">
          <Card title="10 大项目实战" extra="从 0 到 1 交付">
            <div className="project-grid">
              {practicalProjects.map((project, index) => (
                <div className="project-item" key={project}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{project}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="3 个 AI 竞争力项目" extra="可写进作品集">
            <div className="ai-grid">
              {aiProjects.map((project) => (
                <article className="ai-item" key={project.title}>
                  <strong>{project.title}</strong>
                  <p>{project.detail}</p>
                </article>
              ))}
            </div>
          </Card>
        </div>

        <Card title="妙码报名表单" extra={`${seatStatus.remaining} 个名额剩余`}>
          <div className="seat-panel" aria-label={`已预约 ${seatStatus.percent}%`}>
            <div className="seat-panel__header">
              <span>报名进度</span>
              <strong>
                {seatStatus.used}/{seatStatus.total}
              </strong>
            </div>
            <div className="seat-panel__track">
              <span style={{ width: `${seatStatus.percent}%` }} />
            </div>
          </div>

          <form className="signup-form" id="signup" onSubmit={handleSubmit} noValidate>
            <Input label="姓名" name="name" placeholder="请输入姓名" error={errors.name} />
            <Input label="手机号" name="phone" type="tel" placeholder="用于接收报名通知" error={errors.phone} />
            <Input label="邮箱" name="email" type="email" placeholder="name@example.com" error={errors.email} />
            <Input label="公司 / 团队" name="company" placeholder="请输入公司或团队名称" error={errors.company} />
            <Input label="当前角色" name="role" placeholder="前端工程师 / 技术负责人 / 产品经理" error={errors.role} />
            <Input label="学习目标" name="goal" placeholder="例如：补齐 AI 项目经验" error={errors.goal} />
            <Button type="submit" size="lg" loading={submitting}>
              提交报名
            </Button>
          </form>
        </Card>
      </section>

      <Modal
        open={open}
        title={attendeeName ? "报名已提交" : "课程亮点"}
        onOpenChange={setOpen}
        footer={<Button onClick={() => setOpen(false)}>知道了</Button>}
      >
        {attendeeName
          ? `${attendeeName}，你的报名信息已提交。妙码顾问会通过手机号或邮箱与你确认学习计划。`
          : "训练营围绕 10 个业务实战项目与 3 个 AI 竞争力项目展开，重点训练可复用的工程方法、项目表达和作品集沉淀。"}
      </Modal>
    </main>
  );
}
