# 邮件传输与邮件系统完整框架

> **学习目标**：先建立“应用如何发出一封邮件、邮件服务器如何转发、收件服务器如何存储、客户端如何读取、发送方如何判断结果”的完整生命周期，再把 SMTP、DNS MX、IMAP、Webhook、TLS、SPF / DKIM / DMARC 等知识挂到对应阶段。
>
> **学习边界**：本文关注工程开发需要掌握的邮件系统机制、角色、数据流、状态判断和可靠性，不深入 SMTP 命令语法、MIME 编码细节、邮件服务器内部队列算法等底层实现。
>
> **核心结论**：邮件系统不是“应用直接把邮件发送到用户客户端”。更常见的链路是：**业务应用 → 发送邮件服务 → 收件方邮件服务器 → Mailbox → 邮件客户端**。SMTP 主要解决邮件提交和邮件服务器之间的传输；IMAP 等协议解决客户端对服务器邮箱的读取和同步。

## 1. 邮件系统从一次完整生命周期建立整体框架

一封邮件从业务代码产生到用户看到，至少经过四类角色：

~~~text
业务应用
Application
    │
    │ 产生需要发送邮件的业务动作
    ↓
发送邮件服务
Mail Provider / Sending Mail Server
    │
    │ 找到目标域并转发
    ↓
收件方邮件服务器
Recipient Mail Server
    │
    │ 接受、检查并写入邮箱
    ↓
Mailbox
    │
    │ 客户端读取 / 同步
    ↓
邮件客户端
Mail Client / Webmail
~~~

这四层解决不同问题：

| 层次 | 核心职责 | 典型问题 |
| --- | --- | --- |
| 业务应用 | 决定为什么发、发给谁、发什么 | 注册验证、密码重置、通知 |
| 发送邮件服务 | 接受应用提交的邮件并负责后续发送 | SMTP Provider、邮件 API |
| 收件邮件服务 | 接收目标域邮件并进行投递策略判断 | Gmail、Outlook、自建域邮箱 |
| 邮件客户端 | 向服务器读取和同步邮件 | Webmail、Outlook、Apple Mail |

最重要的边界是：

~~~text
业务服务器
≠
邮件服务器
≠
邮件客户端
~~~

一个普通 Web API Server 可以调用邮件服务发送邮件，但它本身不会因此自动成为完整的互联网 Mail Server。

邮件生命周期是主流程；另有三类横切能力贯穿其中：**身份与安全**约束提交方身份、传输保护与发送域认证；**状态观测**区分提交响应、后续投递事件和用户行为；**可靠性**处理持久化任务、失败重试、重复执行与恢复。它们不是额外串行执行的三个步骤，而是分别作用于邮件提交、跨域传输、收件方处理及业务状态回写。

### 【邮件传输主链和邮件读取链是两条不同链路】

完整系统可以拆成：

~~~text
发送链

Application
   ↓
Sending Mail Server
   ↓
Recipient Mail Server
   ↓
Mailbox


读取链

Mail Client
   ↓
访问 / 同步
   ↓
Recipient Mail Server
   ↓
Mailbox
~~~

所以：

- **SMTP** 主要属于“把邮件送到下一台邮件服务器”的发送链。RFC 5321 将 SMTP 定义为 Internet 电子邮件传输的基础协议。[[1]](https://www.rfc-editor.org/rfc/rfc5321.html)
- **IMAP** 属于“客户端访问服务器上邮件”的读取链。IMAP4rev2 允许客户端访问和操作服务器上的消息与邮箱。[[2]](https://www.rfc-editor.org/rfc/rfc9051.html)

两者不是一前一后执行同一个协议，也不是“SMTP 发出去以后再用 SMTP 读回来”。

## 2. 应用发送邮件首先是把邮件交给一个发送服务

业务应用首先产生一个“发送邮件”的业务动作，而不是直接处理整个互联网邮件传输。

例如一个普通 Node.js API：

~~~ts
app.post('/register', async (req, res) => {
  const user = await userService.create(req.body);

  await mailService.send({
    to: user.email,
    subject: 'Verify your email',
    text: 'Open the verification link.',
  });

  res.status(201).json({ id: user.id });
});
~~~

这里真正属于业务层的是：

~~~text
Register API
   ↓
创建用户
   ↓
决定“给这个邮箱发送验证邮件”
   ↓
MailService.send(...)
~~~

API Server 并没有直接变成 Mail Server。

### 【MailService负责把业务语义和邮件传输隔开】

可以先定义一个稳定的业务接口：

~~~ts
interface MailService {
  send(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void>;
}
~~~

业务层只调用：

~~~ts
await mailService.send({
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Welcome to our application.',
});
~~~

至于 MailService 内部怎样真正发出去，可以有两种常见实现：

~~~text
                      MailService
                           │
             ┌─────────────┴─────────────┐
             ↓                           ↓
         SMTP Client                 HTTPS Client
             ↓                           ↓
        SMTP Server                 Provider API
             └─────────────┬─────────────┘
                           ↓
                     Mail Provider
~~~

因此“邮件发送能力”和“SMTP”不是同一个概念；SMTP 是 MailService 可以选择的一种 Transport。

### 【SMTP方式通过标准邮件协议连接发送服务器】

Node.js 可以使用 Nodemailer：

~~~ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'smtp-user',
    pass: 'smtp-password',
  },
});

await transporter.sendMail({
  from: 'Demo App <no-reply@example.com>',
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Welcome to our application.',
});
~~~

对应链路：

~~~text
Node.js Application
      ↓
Nodemailer SMTP Client
      ↓ SMTP
smtp.example.com
~~~

Nodemailer 的 SMTP Transport 使用 host、port、TLS 和 Authentication 等参数连接目标 SMTP Server。[[3]](https://nodemailer.com/smtp)

### 【HTTPS API方式把邮件发送转换成普通HTTP调用】

邮件服务商也可能提供：

~~~http
POST /v1/email/send
Authorization: Bearer API_KEY
Content-Type: application/json

{
  "from": "no-reply@example.com",
  "to": ["user@example.com"],
  "subject": "Welcome",
  "text": "Welcome to our application."
}
~~~

此时应用链路是：

~~~text
Application
    ↓ HTTPS
Mail Provider API
    ↓
Provider内部邮件系统
~~~

Amazon SES 同时提供 SMTP Interface 和 API 两种程序化发送方式。[[4]](https://docs.aws.amazon.com/ses/latest/dg/send-email.html)

所以选择接入方式时先判断：

| 方式 | 应用负责什么 | Provider负责什么 |
| --- | --- | --- |
| SMTP | 配置 SMTP Client 并提交邮件 | SMTP Server、队列和后续投递 |
| HTTPS API | 构造 HTTP 请求并认证 | API 接收、邮件构造/队列和后续投递 |

两种方式最终都把“互联网邮件投递”交给 Mail Provider。

## 3. SMTP模式通过连接配置建立Application到Mail Server的第一跳

SMTP 模式最需要先看懂的是“这一组配置到底建立了什么连接”。

常见环境变量：

~~~env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=my-app
SMTP_PASSWORD=secret
MAIL_FROM="Demo App <no-reply@example.com>"
~~~

代码：

~~~ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
~~~

这段配置最终建立：

~~~text
当前Application进程
        ↓
解析 SMTP_HOST
        ↓
连接 SMTP_PORT
        ↓
TLS / Authentication
        ↓
SMTP Server
~~~

而不是直接连接最终收件人的服务器。

### 【host、port、TLS和凭据分别控制不同部分】

| 配置 | 示例 | 对应动作 |
| --- | --- | --- |
| SMTP_HOST | smtp.example.com | 找到第一跳 SMTP Server |
| SMTP_PORT | 587 | 连接该 Server 的网络端口 |
| SMTP_SECURE | false | 决定 TLS 建立方式 |
| SMTP_USER | my-app | SMTP Client 身份 |
| SMTP_PASSWORD | secret | SMTP Client 凭据 |
| MAIL_FROM | no-reply@example.com | 示例应用配置的邮件头部 From；具体语义取决于发送 API 如何使用该变量 |

这里尤其要区分：

~~~text
SMTP_HOST
    是“连接哪台服务器”

MAIL_FROM
    在此示例中用于设置邮件头部 From（作者地址）
~~~

它们不是一类信息。

### 【SMTP登录身份、邮件头部与传输信封分别承担不同职责】

| 身份或字段 | 所属层次 | 主要职责 |
| --- | --- | --- |
| SMTP AUTH 用户名 | 提交连接 | 证明客户端有权使用发送服务，不等于作者地址 |
| `From:` | 邮件头部 | 声明邮件作者；DMARC 以此作者域作为对齐基准 |
| `Reply-To:` | 邮件头部 | 指定用户回复的目标地址 |
| SMTP `MAIL FROM` | 传输信封 | 指定退信反向路径，允许与头部 From 不同，也可能为空 |
| SMTP `RCPT TO` | 传输信封 | 指定本次 SMTP 交接的实际收件人 |

在 Nodemailer 中，`from` 设置邮件头部作者地址，`envelope` 可显式指定传输信封；未设置时由库推导。自定义环境变量 `MAIL_FROM` 不等于 SMTP 协议命令 `MAIL FROM`。[[6]](https://www.rfc-editor.org/rfc/rfc6409.html) [[7]](https://www.rfc-editor.org/rfc/rfc5322.html) [[11]](https://nodemailer.com/smtp/envelope)

~~~ts
await transporter.sendMail({
  from: '通知服务 <notice@example.com>',
  replyTo: 'support@example.com',
  to: 'alice@example.net',
  subject: '通知',
  text: '示例内容',
  envelope: { from: 'bounces@example.com', to: ['alice@example.net'] },
});
~~~

这里的头部作者、回复入口和传输退信路径相互独立；SMTP AUTH 成功也不代表发送域认证必然通过。

### 【host通常指向自己的Provider，不指向最终收件域】

假设收件地址：

~~~text
alice@gmail.com
~~~

应用仍然可能配置：

~~~env
SMTP_HOST=smtp.company-provider.com
~~~

实际链路：

~~~text
Application
     ↓
smtp.company-provider.com
     ↓
Provider后续再寻找gmail.com的邮件服务器
~~~

应用不需要因为收件人从 Gmail 换成 Outlook 就修改 SMTP_HOST。

### 【Docker环境中的host必须按容器网络理解】

如果 Mail Server 直接跑在宿主机，本机应用可以是：

~~~env
SMTP_HOST=localhost
SMTP_PORT=1025
~~~

如果 API 和 Mailpit 都运行在同一个 Docker Compose 中：

~~~yaml
services:
  api:
    environment:
      SMTP_HOST: mailpit
      SMTP_PORT: 1025

  mailpit:
    image: axllent/mailpit
~~~

API 容器应连接：

~~~text
mailpit:1025
~~~

而不是：

~~~text
localhost:1025
~~~

因为 API 容器中的 localhost 指向 API 容器自己。

这个例子说明 SMTP_HOST 本质仍然是网络地址，和数据库的 DATABASE_HOST、Redis 的 REDIS_HOST 具有相同的基础网络含义。

### 【verify可以单独验证配置和连接能力】

发送真实邮件前可以：

~~~ts
try {
  await transporter.verify();
  console.log('SMTP connection is ready');
} catch (error) {
  console.error('SMTP configuration failed', error);
}
~~~

Nodemailer 的 verify() 会测试 DNS Resolution、TCP Connection、TLS Upgrade 和 Authentication，但不会发送实际邮件。[[3]](https://nodemailer.com/smtp)

因此：

~~~text
verify()失败
  → 先查 Host / Port / DNS / TLS / Credentials

verify()成功但sendMail失败
  → 再查 Sender / Recipient / Message Policy
~~~

这比把所有问题都归结成“SMTP发送失败”更容易定位。

## 4. 发送服务器通过收件域和DNS找到下一台邮件服务器

应用把邮件交给自己的 SMTP Server 以后，后续 Routing 通常由发送服务完成。

假设收件地址：

~~~text
alice@gmail.com
~~~

发送服务首先拆出：

~~~text
Local Part = alice
Domain     = gmail.com
~~~

真正决定邮件应该发往哪里的，是 Domain。

### 【MX Record告诉发送服务器目标域由谁接收邮件】

逻辑：

~~~text
gmail.com
   ↓
DNS MX Query
   ↓
Gmail的Mail Exchanger
   ↓
SMTP Relay
~~~

可以直接在本地观察：

~~~bash
nslookup -type=mx gmail.com
~~~

或者：

~~~bash
dig MX gmail.com
~~~

这类命令不是业务系统发送邮件必须执行的代码，而是帮助开发者理解和排查“目标域邮件服务器是谁”。

职责边界：

~~~text
DNS MX
    解决“下一跳是谁”

SMTP
    解决“怎样把邮件交给下一跳”
~~~

RFC 5321 将 SMTP Routing 与 DNS MX 机制连接起来。[[1]](https://www.rfc-editor.org/rfc/rfc5321.html)

### 【普通Application通常不自己执行MX查询和跨域SMTP】

业务代码通常只是：

~~~ts
await transporter.sendMail({
  to: 'alice@gmail.com',
  subject: 'Hello',
  text: 'Hello Alice',
});
~~~

而不是：

~~~ts
const mx = await resolveMx('gmail.com');
const socket = await connectToSmtp(mx);
await relayMail(socket, message);
~~~

原因是后一种方案意味着业务服务开始承担 MTA 的职责：路由、队列、退信、重试、信誉等都会进入应用自身。

因此常见生产边界是：

~~~text
Application
   ↓
自己的Mail Provider
   ↓
Provider负责DNS MX + SMTP Relay
~~~

这也是为什么 SMTP_HOST 一般只配置一个 Provider，而不是为每个收件域配置不同服务器。

## 5. 收件服务器接受邮件后还要完成投递判断

邮件到达 Recipient Mail Server 后，并不是立刻进入 Inbox。

更完整的过程：

~~~text
Sending Mail Server
        ↓ SMTP
Recipient Mail Server
        ↓
Recipient是否存在？
        ↓
发送域是否可信？
        ↓
Spam / Security Policy
        ↓
Accept / Reject
        ↓
Mailbox
        ↓
Inbox / Spam / Other Folder
~~~

因此需要区分几个结果：

~~~text
发送方SMTP Server接受
        ≠
收件方Mail Server接受
        ≠
进入Inbox
        ≠
用户已经阅读
~~~

### 【一个SMTP成功响应只代表当前服务器的判断】

例如发送代码：

~~~ts
const info = await transporter.sendMail({
  from: 'no-reply@example.com',
  to: 'alice@example.net',
  subject: 'Test',
  text: 'Hello',
});

console.log(info.response);
~~~

可能看到：

~~~text
250 2.0.0 Message accepted
~~~

这个结果只能解释为：

~~~text
当前SMTP Server
接受了这次邮件提交
~~~

不能直接解释成：

~~~text
alice@example.net
已经在Inbox中看到邮件
~~~

### 【SPF、DKIM和DMARC挂在收件方可信判断这一段】

不要把这些机制与 SMTP Login 混在一起。

可以按问题定位：

| 机制 | 收件服务器主要判断什么 |
| --- | --- |
| SPF | 当前发送主机是否被某个域授权 |
| DKIM | 邮件是否带有可验证的域签名 |
| DMARC | 用户看到的 From 域是否与 SPF / DKIM 身份对齐 |

它们属于收件方判断发送域认证与策略的机制，但通过认证不等于内容安全，也不保证进入收件箱。

- **SPF** 检查发送 IP 是否被 SMTP 身份使用的域授权，通常涉及信封反向路径域，不必等于头部 `From`。[[8]](https://www.rfc-editor.org/rfc/rfc7208.html)
- **DKIM** 验证邮件签名及签名域 `d=`，不直接证明内容可信。[[9]](https://www.rfc-editor.org/rfc/rfc6376.html)
- **DMARC** 以头部 `From` 作者域为基准，要求至少一项成功的 SPF 或 DKIM 认证结果与其满足对齐要求；具体处置仍取决于域策略与收件方。[[10]](https://www.rfc-editor.org/rfc/rfc9989.html)

而 SMTP AUTH：

~~~ts
auth: {
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASSWORD,
}
~~~

解决的是：

~~~text
Application有没有权限使用自己的SMTP Server
~~~

所以：

~~~text
SMTP AUTH成功
    ≠
DMARC一定通过

邮件被Provider接受
    ≠
一定进入Inbox
~~~

这样才能把“发送权限”和“投递可信度”分开。

## 6. Mailbox保存邮件，客户端再读取或同步

邮件真正投递成功以后，数据最终进入服务器端 Mailbox。

~~~text
Recipient Mail Server
        ↓
Mailbox
        ↓
Inbox / Spam / Folder
~~~

Mailbox 可以理解成：

> **邮件服务器为某个用户维护的邮件集合与文件夹状态。**

这时发送链已经结束。

### 【邮件客户端通常主动连接服务器读取】

桌面客户端的逻辑可以理解为：

~~~text
Outlook / Apple Mail
        ↓
连接IMAP Server
        ↓
认证
        ↓
选择INBOX
        ↓
查询邮件列表
        ↓
读取邮件正文
        ↓
本地展示
~~~

概念代码可以写成：

~~~ts
const client = new ImapClient({
  host: 'imap.example.com',
  port: 993,
  secure: true,
  auth: {
    user: 'alice@example.com',
    pass: 'password',
  },
});

await client.connect();
await client.openMailbox('INBOX');

const messages = await client.listMessages();
~~~

这里重点不是某个库的具体 API，而是调用方向：

~~~text
Mail Client主动请求
        ↓
Mail Server返回Mailbox数据
~~~

IMAP4rev2 就是用来让客户端访问和操作服务器上的邮件与 Mailbox。[[2]](https://www.rfc-editor.org/rfc/rfc9051.html)

所以：

~~~text
SMTP
    发送 / 转发邮件

IMAP
    读取 / 同步Mailbox
~~~

不是“SMTP发出去，再用SMTP读回来”。

### 【Webmail通常走HTTPS而不是浏览器直接调用IMAP】

如果用户打开 Gmail Web：

~~~text
Browser
   ↓ HTTPS
Gmail Web Application
   ↓
Gmail内部Mailbox
~~~

浏览器只和 Web Application 通信。

因此用户“读邮件”常见两种入口：

| 客户端 | 常见接口 |
| --- | --- |
| Outlook / Apple Mail 等通用客户端 | IMAP |
| Gmail Web / Outlook Web | HTTPS |
| Provider 原生 App | Provider 内部 API / Sync |

### 【通知有新邮件和读取邮件内容不是同一个动作】

手机可能先收到：

~~~text
New mail notification
~~~

然后 App 再同步：

~~~text
通知
  ↓
App知道Mailbox发生变化
  ↓
发起同步请求
  ↓
读取新邮件
~~~

因此：

~~~text
Server通知“有新邮件”
    ≠
Server已经把完整邮件主动推到客户端
~~~

这也解释了为什么有时系统通知已经出现，但打开 App 后正文仍需要加载。

## 7. 邮件发送结果需要区分同步结果和最终投递结果

邮件系统不能只用：

~~~text
success / failed
~~~

两个状态描述。

邮件状态应区分**提交结果**、**传输与投递事件**、**用户行为观测**，不能视为一条严格顺序的状态机：

~~~text
业务产生发送意图
    ↓
发送服务接受提交（只证明当前交接）
    ↓
发送服务排队并尝试投递
    ├─ 收件服务器接受 → 可能报告 Delivery
    ├─ 临时失败 → 重试或延迟通知
    └─ 永久失败 → 可能报告 Bounce / Reject

独立的可选行为观测：打开 / 点击
~~~

输入是发送意图，同步响应只证明当前交接；后续事件用于观察每个收件人的投递情况。`Delivered` 通常表示收件服务器接受，不等于进入 Inbox 或用户已阅读。打开事件不是 Bounce 之后的下一状态。事件可能重复、延迟或乱序，不能按 Webhook 到达顺序盲目覆盖状态。[[12]](https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html)

### 【sendMail返回的是当前SMTP交接结果】

Nodemailer：

~~~ts
const info = await transporter.sendMail({
  from: 'no-reply@example.com',
  to: 'alice@example.com',
  subject: 'Test',
  text: 'Hello',
});

console.log({
  messageId: info.messageId,
  accepted: info.accepted,
  rejected: info.rejected,
  response: info.response,
});
~~~

可能得到：

~~~ts
{
  messageId: '<abc123@example.com>',
  accepted: ['alice@example.com'],
  rejected: [],
  response: '250 2.0.0 Message accepted'
}
~~~

这能证明：

~~~text
当前SMTP Server
接受了 alice@example.com 这个收件人
~~~

不能证明：

~~~text
目标Mail Server已经接收
邮件已经进入Inbox
用户已经打开
~~~

### 【accepted和rejected可以出现部分成功】

例如：

~~~ts
const info = await transporter.sendMail({
  from: 'no-reply@example.com',
  to: [
    'alice@example.com',
    'invalid@example.com',
  ],
  subject: 'Notice',
  text: 'Hello',
});

console.log(info.accepted);
console.log(info.rejected);
~~~

可能得到：

~~~text
accepted:
  alice@example.com

rejected:
  invalid@example.com
~~~

所以：

~~~text
Promise resolve
    ≠
所有Recipient全部成功
~~~

如果业务对多收件人结果敏感，应检查 accepted / rejected，而不是只判断有没有抛异常。

### 【最终投递通常通过Provider Webhook异步返回】

发送方同步调用结束以后，Provider 仍然需要继续：

~~~text
Mail Provider
    ↓
Recipient Mail Server
    ↓
Delivered / Bounce / Reject
~~~

因此生产系统经常额外提供一条回调链：

~~~text
发送：

Application
   ↓
Mail Provider


结果：

Mail Provider
   ↓ Webhook
Application
~~~

例如：

~~~http
POST /webhooks/mail

{
  "event": "delivered",
  "messageId": "msg_123",
  "recipient": "alice@example.com"
}
~~~

应用接收：

~~~ts
// 机制示意：签名和事件字段应按具体 Provider 规范实现。
app.post('/webhooks/mail', async (req, res) => {
  const event = await verifyAndParseProviderEvent(req);
  await mailDeliveryRepository.recordEventIdempotently({
    providerMessageId: event.messageId,
    recipient: event.recipient,
    event,
  });
  res.sendStatus(204);
});
~~~

上例 `verifyAndParseProviderEvent` 与 `recordEventIdempotently` 是需要业务实现的伪接口，不是框架内置 API。实际应按 Provider 规范验证来源及签名（某些实现需原始请求体），再以消息 ID、收件人和事件唯一标识去重，按事件发生时间与业务规则归并状态，保存原始事件供审计。以 SNS 承载 SES 通知为例，签名验证需遵循 SNS 官方规范。[[13]](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html)

数据库可记录 `submitted`、`delivered`、`bounced`、`rejected` 等观测结果，但应保留事件历史，不能仅凭到达先后认定状态必然单向迁移。

### 【4xx和5xx决定是否应该重试】

SMTP 错误第一阶段可以这样判断：

~~~text
2xx
    当前操作成功

4xx
    临时失败，通常可重试

5xx
    永久失败，通常不应盲目重试
~~~

例如：

~~~text
421
Server temporarily unavailable

450
Mailbox temporarily unavailable

550
Mailbox / Policy rejected
~~~

因此 Retry 不应简单写成“失败就无限重试”。

## 8. 用户Reply是一封新的反向邮件，不是发送API返回值

这里必须区分两个完全不同的“返回”。

### 【SMTP Response是协议结果】

应用发送：

~~~text
Application
   ↓ SMTP
Mail Server
~~~

Mail Server 返回：

~~~text
250 Message accepted
~~~

这是：

~~~text
SMTP Response
~~~

它说明当前 SMTP 交接结果。

### 【用户Reply会重新产生一条完整邮件链】

假设原邮件：

~~~text
support@example.com
       ↓
alice@gmail.com
~~~

Alice 点击 Reply 后：

~~~text
alice@gmail.com
       ↓
Gmail Sending Server
       ↓
DNS MX查询example.com
       ↓
example.com Recipient Mail Server
       ↓
support@example.com Mailbox
~~~

所以：

~~~text
SMTP Response
    ≠
User Reply
~~~

Reply 本质是一封新的 Email。

### 【Outbound Email和Inbound Email是两个独立能力】

如果系统只发送验证码、通知：

~~~text
Application
   ↓
Mail Provider
   ↓
User
~~~

只需要 Outbound Email。

如果业务要求：

~~~text
用户回复邮件
    ↓
系统自动处理
~~~

则需要另外建设 Inbound Email。

常见方案一：

~~~text
Mailbox
   ↓ IMAP
Application
~~~

概念代码：

~~~ts
await imapClient.connect();
await imapClient.openMailbox('INBOX');

const unreadMessages =
  await imapClient.fetchUnreadMessages();
~~~

常见方案二：

~~~text
Internet Email
   ↓
Mail Provider
   ↓ Inbound Webhook
Application API
~~~

例如：

~~~http
POST /webhooks/inbound-email

{
  "from": "alice@gmail.com",
  "to": "support@example.com",
  "subject": "Re: Order issue",
  "text": "I still need help."
}
~~~

因此“能发邮件”并不代表系统天然“能收用户回复”。

如果用户能收到邮件但 Reply 后业务系统没有任何反应，应排查：

~~~text
Reply-To
Inbound Route
Mailbox
IMAP Consumer
Inbound Webhook
~~~

而不是原来的 sendMail()。

## 9. 本地开发和生产环境使用不同的邮件服务器拓扑

开发阶段通常不应该每次测试都真的向 Gmail / Outlook 发信。

因此常用 Mail Catcher。

### 【Mailpit在本地扮演开发SMTP Server】

Docker Compose：

~~~yaml
services:
  api:
    environment:
      SMTP_HOST: mailpit
      SMTP_PORT: 1025

  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025"
      - "8025:8025"
~~~

应用 SMTP 配置：

~~~ts
const transporter = nodemailer.createTransport({
  host: 'mailpit',
  port: 1025,
  secure: false,
});
~~~

发送测试邮件：

~~~ts
await transporter.sendMail({
  from: 'test@example.test',
  to: 'alice@example.test',
  subject: 'Local test',
  text: 'Hello from local development',
});
~~~

链路：

~~~text
API Container
     ↓ SMTP :1025
Mailpit
     ↓
保存邮件
     ↓ HTTP :8025
Developer Browser
~~~

Mailpit 默认 SMTP 监听 1025，Web UI / API 使用 8025。[[5]](https://mailpit.axllent.org/docs/configuration/)

所以这两个端口不是重复的：

| 端口 | 谁访问 | 用途 |
| --- | --- | --- |
| 1025 | Application → Mailpit | SMTP发送测试邮件 |
| 8025 | Browser → Mailpit | 查看捕获到的邮件 |

### 【本地Mailpit默认会截断后续互联网链路】

开发链路：

~~~text
Application
   ↓
Mailpit
   ↓
结束
~~~

所以即使 to 写成：

~~~text
alice@gmail.com
~~~

开发者通常只是在 Mailpit UI 里看到这封邮件，而不是让它继续真实投递到 Gmail。

### 【生产环境把Mailpit替换为真实Provider】

生产：

~~~env
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=production-user
SMTP_PASSWORD=production-password
~~~

代码仍然可以保持：

~~~ts
await transporter.sendMail(message);
~~~

变化的是基础设施配置：

~~~text
开发
Application → Mailpit

生产
Application → Production Mail Provider
~~~

这体现了为什么 MailService 不应该把 Mailpit 或某一家 Provider 写死在业务代码中。

### 【Provider也可以使用HTTPS API而不是SMTP】

例如 Amazon SES API：

~~~ts
await sesClient.send(
  new SendEmailCommand({
    FromEmailAddress: 'no-reply@example.com',
    Destination: {
      ToAddresses: ['alice@example.com'],
    },
    Content: {
      Simple: {
        Subject: { Data: 'Welcome' },
        Body: {
          Text: { Data: 'Welcome to our service.' },
        },
      },
    },
  }),
);
~~~

对应：

~~~text
Application
   ↓ HTTPS
SES API
   ↓
SES Mail Infrastructure
~~~

所以生产环境的核心不是“必须运行自己的 SMTP Server”，而是选择并接入合适的 Mail Provider。

## 10. 关键邮件需要把一次发送调用提升成可靠业务任务

最简单代码：

~~~ts
await database.saveUser(user);
await transporter.sendMail(message);
~~~

存在一个明显窗口：

~~~text
Database
   ↓
保存成功

SMTP
   ↓
临时失败
~~~

最终：

~~~text
用户状态已经存在
但是邮件没有发出去
~~~

如果邮件只是低价值通知，业务可能允许简单重发。

但注册验证、密码重置、订单通知等关键邮件，需要更强的可靠性。

### 【Queue / Outbox把邮件从网络调用变成任务】

典型结构：

~~~text
HTTP Request
     ↓
Database Transaction
     │
     ├── Business Data
     └── Email Outbox Task
     ↓
COMMIT
     ↓
HTTP Response


Email Worker
     ↓
读取Pending Task
     ↓
Mail Provider
     ↓
Success / Retry / Failed
~~~

伪代码：

~~~ts
await db.transaction(async (tx) => {
  const user = await tx.users.create({
    email,
  });

  await tx.emailOutbox.create({
    type: 'verify-email',
    recipient: user.email,
    payloadRef: `verification:${user.id}`, // 示例业务引用
    status: 'pending',
  });
});
~~~

Worker：

~~~ts
const task = await emailOutbox.claimNext();

try {
  const message = await buildMessageFromTask(task);
  await mailService.send(message);

  await emailOutbox.markSucceeded(task.id);
} catch (error) {
  await emailOutbox.scheduleRetry(
    task.id,
    error,
  );
}
~~~

Outbox 的输入是与业务数据同一事务保存的发送意图，Worker 领取后需依据持久化任务构造邮件。任务可以保存受保护的邮件快照，也可以保存业务引用并在消费时重新构造；后者需要考虑数据变化、Token 有效期和内容一致性。上例 `payloadRef` 与 `buildMessageFromTask` 只是解释数据流的伪代码。

Outbox 保证的是业务状态与待发送意图共同提交，**不能保证外部邮件恰好发送一次**：

~~~text
Worker 领取任务 → Provider 接受邮件
    ↓
Worker 在记录成功前崩溃
    ↓
任务恢复重试 → 可能重复发送
~~~

因此需结合领取租约、重试退避、重复执行治理；若 Provider 提供幂等键，仍需核对其保证范围。`markSucceeded` 只说明提交任务成功，最终投递另由 Provider 事件观察。参见 [服务端异步任务与消息处理体系](./F-服务端异步任务与消息处理体系.md) 与 [服务端可靠性体系](./F-服务端可靠性体系.md)。

### 【Retry不能只设计成while(true)】

常见任务状态：

~~~text
pending
  ↓
processing
  ↓
succeeded

或者

processing
  ↓
retry_wait
  ↓
pending

超过最大次数
  ↓
failed / dead_letter
~~~

需要配套：

| 能力 | 解决的问题 |
| --- | --- |
| Retry | 临时网络或 Provider 故障 |
| Backoff | 避免短时间持续打爆 Provider |
| Attempts | 控制最大尝试次数 |
| Idempotency | 防止重试造成重复业务副作用 |
| Dead Letter | 保存持续失败任务 |
| Observability | 观察发送量、失败率、延迟和积压 |

### 【邮件任务还要考虑敏感业务数据】

例如验证邮件包含一次性 Token：

~~~text
verify-email?token=xxx
~~~

如果同步发送：

~~~text
Raw Token
   ↓
立即构造邮件
   ↓
发送
~~~

如果改成异步任务：

~~~text
Raw Token
   ↓
Outbox
   ↓
等待Worker
   ↓
发送
~~~

就必须额外考虑：

~~~text
Outbox是否保存Raw Token？
是否加密？
任务完成后是否清除？
日志是否会泄漏Token？
~~~

因此可靠性设计和安全设计不能完全分开。

### 【安全能力要放回对应链路判断】

| 能力 | 位置 | 示例 |
| --- | --- | --- |
| TLS | Application ↔ SMTP Server | secure / STARTTLS |
| SMTP AUTH | Application → SMTP Server | username / password |
| SPF | Sending Domain → Recipient Policy | DNS SPF Record |
| DKIM | Message → Recipient Verification | DKIM-Signature |
| DMARC | Visible From ↔ SPF/DKIM | Domain Policy |

例如：

~~~ts
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
~~~

这段代码解决 TLS + SMTP AUTH。

它并没有自动解决：

~~~text
SPF
DKIM
DMARC
~~~

这些通常还需要发送域 DNS 和 Provider 侧配置。

所以邮件安全也应该按链路定位，而不是把所有安全名词放在一个列表里。

## 11. 邮件生命周期与横切治理能力的协作关系

邮件提交方式属于主流程入口的可选实现；身份安全、投递观测与可靠性是跨阶段约束。

~~~text
邮件主流程：业务触发 → 构造 → 提交 → 路由 → 投递 → 邮箱保存 → 客户端读取
    ├─ 提交实现：SMTP 或 HTTPS API
    ├─ 横切状态观测：提交响应 / 投递事件 / 用户行为
    ├─ 横切可靠性：持久化意图 / 重试 / 去重 / 恢复
    └─ 横切身份安全：传输保护 / 提交鉴权 / 发送域认证
~~~

推荐学习顺序：

| 顺序 | 先回答的问题 | 对应知识 |
| --- | --- | --- |
| 1 | 谁在发、谁在收、谁在读 | Application / Mail Server / Mailbox / Client |
| 2 | 应用怎样把邮件交出去 | SMTP / HTTPS API |
| 3 | 邮件服务器怎样找到目标 | Domain / DNS MX / Relay |
| 4 | 收件服务器怎样完成投递 | Accept / Reject / Mailbox |
| 5 | 客户端怎样读邮件 | IMAP / Webmail |
| 6 | 应用怎样知道结果 | SMTP Response / Provider Event / Webhook |
| 7 | 用户回复是什么 | 新的反向邮件生命周期 |
| 8 | 生产环境怎样保证可靠 | Queue / Retry / Outbox / Idempotency |
| 9 | 怎样提升安全和可信度 | TLS / SMTP AUTH / SPF / DKIM / DMARC |

提交方式决定业务如何交给发送服务；状态观测收集同步响应和异步事件；可靠性处理任务丢失风险与重复执行；身份安全分别约束连接、发件域及事件来源。各项能力作用于不同阶段，不能用 `sendMail()` 是否抛错代替全链路判断。

任何新概念都先挂回这条生命周期，再决定是否需要继续深入。

## 12. 常见工程问题通过生命周期定位

| 场景 | 首先定位哪一层 |
| --- | --- |
| 应用调用发送接口连接失败 | Application → Mail Provider |
| SMTP返回临时错误 | Submission / SMTP Result |
| Provider显示发送成功但用户没看到 | Recipient Delivery / Spam / Mailbox |
| 想知道邮件最终是否送达 | Provider Event / Webhook |
| 用户能收到但业务系统收不到回复 | Incoming Mail 未建设 |
| 本地开发不想发真实邮件 | Local SMTP Catcher |
| 邮件进入垃圾箱 | Domain Trust / Reputation / Content Policy |
| 邮件任务偶发丢失 | Queue / Retry / Outbox |
| 手机收到提醒但正文还没加载 | Notification 与 Mail Sync 分离 |

判断问题时先定位邮件当前处于生命周期的哪一段，而不是直接从“SMTP是不是坏了”开始。

在通用机制之外，可通过 [Browser Monitor 邮件传输实践](https://github.com/cxDlogver/browser-monitor/blob/main/docs/SMTP邮件传输体系源码学习.md) 核验 SMTP 接入与 Mailpit 本地调试；其中 Outbox / Worker 属于设计演进，不应视为已实现能力。

## 13. 实战分析入口

这套通用框架可以继续映射到 Browser Monitor 项目的真实实现：

[Browser Monitor · SMTP 邮件传输体系源码学习](https://github.com/cxDlogver/browser-monitor/blob/main/docs/SMTP邮件传输体系源码学习.md)

项目文档负责说明实际的 MailerService、Nodemailer、Mailpit、配置、业务调用链和当前可靠性边界；本文不复制具体项目实现。

## 14. 参考文献

1. IETF. RFC 5321 — Simple Mail Transfer Protocol. https://www.rfc-editor.org/rfc/rfc5321.html
2. IETF. RFC 9051 — Internet Message Access Protocol (IMAP) Version 4rev2. https://www.rfc-editor.org/rfc/rfc9051.html
3. Nodemailer. SMTP Transport. https://nodemailer.com/smtp
4. AWS. Set up email sending with Amazon SES. https://docs.aws.amazon.com/ses/latest/dg/send-email.html
5. Mailpit. Configuration. https://mailpit.axllent.org/docs/configuration/
6. IETF. RFC 6409 — Message Submission for Mail. https://www.rfc-editor.org/rfc/rfc6409.html
7. IETF. RFC 5322 — Internet Message Format. https://www.rfc-editor.org/rfc/rfc5322.html
8. IETF. RFC 7208 — Sender Policy Framework. https://www.rfc-editor.org/rfc/rfc7208.html
9. IETF. RFC 6376 — DomainKeys Identified Mail Signatures. https://www.rfc-editor.org/rfc/rfc6376.html
10. IETF. RFC 9989 — Domain-Based Message Authentication, Reporting, and Conformance. https://www.rfc-editor.org/rfc/rfc9989.html
11. Nodemailer. SMTP Envelope. https://nodemailer.com/smtp/envelope
12. AWS. Amazon SES Notification Contents. https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html
13. AWS. Verifying SNS message signatures. https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
