# Access Token与Refresh Token核心知识点笔记

本篇聚焦 Access Token、Refresh Token 的授权凭据职责、生命周期、Rotation 与撤销机制。它们位于更大的身份系统中：Local / Federated Authentication 怎样形成 Principal、OIDC 的 ID Token 与 Access Token 怎样区分、Session Cookie 怎样连接 Browser 与当前应用，统一由 [Web 身份认证、会话控制与访问控制体系](./W-Web身份认证会话控制与访问控制体系.md) 作为上位入口维护。

### Access Token 核心知识点

作用：访问业务接口的凭证，资源服务器/API通过它判断用户身份、访问权限及权限范围。

特点：

- 生命周期短，通常为几分钟到十几分钟，符合OAuth安全最佳实践，可降低令牌被盗后的影响面。

- 可携带scope（权限范围）、role（角色）、audience（受众）等信息。

- 泄露后危害相对可控，因过期时间短，攻击窗口有限。

组成：常见为JWT（JSON Web Token），结构分为三段，用*.*分隔，格式为`header.payload.signature`。

JWT各部分详解：

1. Header（头部）：说明签名算法和token类型，示例如下：

```json
{
  "alg": "RS256",
  "typ": "at+jwt",
  "kid": "key-1"
}
```

字段含义：`alg`（签名算法）、`typ`（token类型，Access Token常用at+jwt）、`kid`（key id，指定验签公钥）。

2. Payload（载荷）：存储业务和鉴权相关信息（claims），示例如下：

```json
{
  "iss": "https://auth.example.com",
  "sub": "user_123",
  "aud": "api://order-service",
  "exp": 1710000000,
  "iat": 1709999400,
  "scope": "read:order write:order",
  "role": "admin",
  "jti": "at-123"
}
```

常见字段：`iss`（签发方）、`sub`（用户标识）、`aud`（受众，即token给谁用）、`exp`（过期时间）、`iat`（签发时间）、`scope`（权限范围）、`role`（角色）、`jti`（token唯一ID）。

3. Signature（签名）：防止token被篡改，逻辑如下：

```plaintext
signature = Sign(base64Url(header) + "." + base64Url(payload), privateKey)
```

服务器会用对应公钥验证签名有效性，确认header和payload未被篡改、token来自可信签发方。

服务器校验流程：

1. 从请求头`Authorization: Bearer <access_token>`中取出token。

2. 按*.*拆分为header、payload、signature三段。

3. 解码header和payload，确认`alg`和`kid`符合预期。

4. 根据`kid`找到对应公钥，校验signature正确性。

5. 校验`exp`（是否过期）、`iss`（是否为可信签发方）、`aud`（是否为当前资源服务器）。

6. 校验`scope`或`role`是否满足接口访问要求。

7. 校验通过则放行，失败返回401（未授权）或403（权限不足）。

常见存储方式（前端）：

- 内存存储（推荐SPA）：存在JS内存中（如React state、zustand memory），页面刷新后丢失，需用Refresh Token重新获取，优点是不落地，XSS攻击面小于`localStorage`，缺点是刷新页面需静默刷新。

- Cookie存储：常见于BFF/同源服务端渲染架构，前端无需直接处理token，浏览器自动携带Cookie，服务端代为处理认证。

对应问题：

- Access Token的核心作用是什么？

- JWT的结构由哪几部分组成，各部分的作用是什么？

- 服务器校验Access Token的核心步骤有哪些？

- 前端存储Access Token的常见方式有哪些，各有什么优缺点？

### Refresh Token 核心知识点

作用：换取新的Access Token，仅用于授权服务器/认证服务器的续签接口，不直接访问业务API。

特点：

- 生命周期更长，通常为7~30天，权限更敏感。

- 一旦被盗，攻击者可能持续换取新的Access Token，因此需比Access Token更严格保护。

- 常配合rotation（轮换）和reuse detection（复用检测）机制，降低泄露风险。

组成：常见两种形式，以随机字符串为主（推荐）。

1. 随机字符串形式：本身不携带业务信息，仅为一串高熵随机字符，示例：`rt_7f8a91c2b3d4e5f6a7b8c9d0`，服务端数据库会存储其哈希值及相关会话信息。

服务端存储示例：

```json
{
  "token_hash": "hashed(rt_xxx)",
  "user_id": "user_123",
  "session_id": "session_1",
  "status": "active",
  "expires_at": 1710500000,
  "family_id": "family_abc"
}
```

2. JWT形式：虽可做成JWT，但生产环境中通常不会仅靠JWT自身校验，仍需查询服务端状态，确保可撤销、可轮换等能力。

服务器校验流程：

1. 从请求Cookie或请求体中取出Refresh Token。

2. 若为随机字符串，先对其进行哈希处理。

3. 查询数据库/Redis，确认该token是否存在。

4. 校验token状态（是否为active）、是否过期（expires_at）、所属会话是否有效。

5. 校验用户状态（是否被禁用、登出、改密码），以及是否命中rotation、reuse detection规则。

6. 校验通过后，生成新的Access Token和新的Refresh Token，将旧Refresh Token标记为rotated（已轮换）或revoked（已撤销），保存新token记录并返回。

7. 校验失败则返回401，要求用户重新登录。

常见存储方式（前端）：

推荐存储在`HttpOnly + Secure + SameSite`的Cookie中，具体配置要求：

- `HttpOnly`：前端JS无法读取，降低XSS直接窃取风险。

- `Secure`：仅在HTTPS协议下传输，防止明文泄露。

- `SameSite=Lax/Strict`：减少跨站请求携带Cookie，降低CSRF风险。

- 限制`Path=/auth/refresh`：仅让其在刷新接口时自动携带，避免随所有业务请求发送，缩小暴露面。

禁止存储方式：`localStorage`、`sessionStorage`、普通JS可读Cookie，这些方式易被XSS攻击窃取。

对应问题：

- Refresh Token的核心作用是什么，与Access Token的作用有何区别？

- Refresh Token的常见组成形式有哪些，为什么推荐随机字符串形式？

- 服务器校验Refresh Token的核心步骤有哪些？

- 前端存储Refresh Token的最佳方式是什么，为什么？

### 长短Token（Access Token + Refresh Token）的设计逻辑

核心设计理念：不是追求绝对安全，而是降低令牌失窃后的损失半径，通过“分层减损”提升系统安全性。

仅使用长期令牌的风险：一旦被盗，攻击者可长时间调用API，难以及时止损，会话管理和撤销难度大。

“短Access Token + 长Refresh Token”的优势：

- Access Token泄露：攻击窗口短，因生命周期短，很快自动失效，危害可控。

- Refresh Token泄露：虽风险更高，但仅用于续签接口，可通过严格存储（HttpOnly Cookie）、rotation、reuse detection等机制强化保护，且可通过服务端撤销快速止损。

短Access Token的核心价值：即使无法完全避免泄露，也能显著缩短攻击者的可利用时间，类似“门锁虽不能绝对防盗，但必须安装”的逻辑，属于安全设计中的分层防护。

对应问题：

- 为什么要采用“短Access Token + 长Refresh Token”的设计？

- 短Access Token的核心价值是什么，即使它不能完全保证安全，为什么仍需使用？

### Refresh Token的安全防护机制

核心原则：无法保证绝对安全，重点是提高攻击成本、缩小损害范围，通过组合机制实现多层防护。

关键防护机制：

- Refresh Token Rotation（轮换）：每次用Refresh Token换取新Access Token时，同时签发新的Refresh Token，旧Token立即废弃，避免旧Token被复用。

- Reuse Detection（复用检测）：若旧的Refresh Token被再次使用，服务端判定为疑似被盗，立即吊销整个Token家族（当前及所有关联Token），要求用户重新登录。

- 过期控制：分为两种过期方式，避免无限续签。

两种过期方式详解：

- Idle Expiration（空闲过期）：若Refresh Token一段时间未被使用，则自动失效；若正常使用，空闲计时重新重置，用于清理长期不活跃的“僵尸Token”，示例：idle=7天，第6天刷新则重新计算7天空闲期。

- Absolute Expiration（绝对过期）：无论是否刷新，Refresh Token有最长存活时间，到期后必须重新登录，无法无限续签，是防止攻击者持续利用被盗Token的关键，示例：absolute=30天，即使连续活跃，30天后也需重新登录。

Sender-Constrained Refresh Token（发送者约束Token）：将Refresh Token绑定到客户端的公私钥对，使用时需额外提交私钥签名证明，即使Token被窃取，攻击者无对应私钥也无法使用，比rotation防护更强。

DPoP（Demonstrating Proof of Possession）：实现Sender-Constrained的核心机制，客户端持有私钥，每次请求时提交签名证明，服务器验证签名与Token的绑定关系，防止Token重放攻击。

服务端防护：数据库存储Refresh Token记录（或其哈希），保存jti/sessionId/userId/deviceId等信息，支持服务端主动撤销、单设备登出、异常IP/UA变更风控。

对应问题：

- Refresh Token Rotation和Reuse Detection的作用是什么？

- Idle Expiration和Absolute Expiration的区别是什么，各自解决什么问题？

- Sender-Constrained Refresh Token是什么意思，如何实现？

- DPoP与Sender-Constrained Refresh Token的关系是什么？

### Refresh Token Family、Rotation 与 Reuse Detection 的完整状态模型

Refresh Token Rotation 不是简单地“旧字符串换成新字符串”，而是维护一条能够被服务端追踪的 Token 世代关系。RFC 9700 明确要求：采用 Rotation 检测重放时，授权服务器在签发新 Refresh Token 后使旧 Token 失效，同时保留两者之间的关系；如果已经失效的旧 Token 再次出现，就可以识别凭证链可能已经泄漏。[[1]](https://www.rfc-editor.org/rfc/rfc9700.html)

可以把一次登录产生的所有 Refresh Token 看成一个 Token Family（令牌家族）：

```text
Login
  ↓
Family F1
  ↓
Refresh A
  ↓ Rotation
Refresh B
  ↓ Rotation
Refresh C
```

Token Family 是一种逻辑会话边界，不要求必须存在独立 `token_families` 表。小型系统可以让每条 Refresh Token 记录携带相同的 `family_id`；复杂系统也可以把 Family 独立成 Session / Token Family 表。

一条可支持 Rotation、Reuse Detection 和撤销的通用 Refresh Token 记录可以包含：

| 字段 | 作用 |
| --- | --- |
| `token_hash` | Token 的哈希，不保存长期凭证明文 |
| `family_id` / `session_id` | 标识同一次登录会话产生的整个 Token Family |
| `user_id` | 会话属于哪个主体 |
| `parent_token_hash` | 当前 Token 由哪一代 Token 轮换而来 |
| `replaced_by_hash` | 当前 Token 被哪一代新 Token 替代 |
| `created_at` | 当前 Token 创建时间 |
| `expires_at` | 当前 Token / Family 的有效期边界 |
| `consumed_at` | 当前 Token 是否已经成功完成过一次 Rotation |
| `revoked_at` | 系统是否已经主动终止对当前 Token / Family 的信任 |

其中最重要的是区分 `consumed` 和 `revoked`。

```text
consumed
回答：
“这枚 Token 是否已经被正常使用过？”

revoked
回答：
“系统是否已经决定不再信任这枚 Token / 这个会话？”
```

因此正常 Rotation 后，旧 Token 应该是：

```text
Refresh A
consumed_at != null
revoked_at  = null
```

它不是发生了安全事件，而只是正常完成了自己的生命周期。新的 Refresh B 则是：

```text
Refresh B
consumed_at = null
revoked_at  = null
```

如果之后 A 再次被提交：

```text
A 已经 consumed
        +
A 再次出现
        ↓
Reuse Detected
        ↓
整个 Family 不再可信
        ↓
Revoke Family
```

为什么不能只拒绝 A？因为服务器已经无法可靠判断攻击者只持有 A，还是同时已经获得后续的 B / C。Rotation 的安全价值正来自“旧 Token 再次出现”这个异常信号，因此通常需要终止整条会话链。

`revoked` 还可以由完全正常的安全操作触发，例如：

- 用户 Logout；
- 管理员强制下线；
- 修改密码后要求旧会话失效；
- 账号冻结；
- Reuse Detection。

所以 `consumed` 和 `revoked` 不能合并成同一个字段。如果正常 Rotation 也直接标记为 revoked，之后再次看到旧 Token 时只能知道“它无效”，却无法区分它是正常被轮换掉，还是由于 Logout / 管理员策略被撤销。

一个常见状态可以概括为：

```text
ACTIVE
consumed = null
revoked  = null
     ↓ 正常 Rotation

CONSUMED
consumed != null
revoked  = null
     ↓ 旧 Token 再次被使用 / Logout / Security Event

REVOKED
revoked != null
```

注意：`consumed != null` 并不意味着 Token 仍然允许刷新，它只是保留“曾经正常消费过”的历史事实，用于 Reuse Detection 和审计。

Rotation 必须把下面三件事放进一个原子事务：

```text
检查旧 Token 是否仍可消费
        +
把旧 Token 标记 consumed
        +
创建下一代 Refresh Token
```

否则两个并发 Refresh 都可能同时观察到旧 Token 未消费，从同一 Token 分叉出两个后继 Token。

同时还要区分 Revoke 与 Delete：

```text
Revoke
= 立即终止信任
但记录可以继续保留，用于审计和识别后续重放

Delete
= 物理删除记录
通常在超过保留期 / 绝对过期后由清理任务完成
```

如果 Logout 时直接删除整个 Family，之后攻击者再拿旧 Refresh Token 请求时，服务器只能得到“未知 Token”；保留 revoked 状态则可以明确知道它属于一个已经终止的会话。

### Refresh Token 的过期模型需要同时考虑活跃体验和最大安全边界

Refresh Token 的寿命不能只理解成一个 `expires_at`。常见需要区分三种时间概念：

| 模型 | 含义 | 主要作用 |
| --- | --- | --- |
| Idle Expiration（空闲过期） | 连续一段时间没有使用就失效 | 清理长期不活跃会话 |
| Absolute Expiration（绝对过期） | 从会话创建开始计算最大寿命，不因活跃而延长 | 防止被盗会话被无限维持 |
| Sliding Expiration（滑动续期） | 每次有效活动后把空闲截止时间向后移动 | 提升持续活跃用户体验 |

Sliding Expiration 不应该等价于“每次 Refresh 都重新获得一个无限可续的完整生命周期”。浏览器 OAuth BCP RFC 10017 要求浏览器客户端的 Refresh Token 要么有 Maximum Lifetime（最大生命周期），要么在一段时间未使用后过期；如果已经为初始 Refresh Token 设定最大寿命，Rotation 后的新 Token 不得把寿命延长到这个初始上限之外。[[2]](https://www.rfc-editor.org/rfc/rfc10017.html)

因此更稳妥的混合模型是：

```text
Idle Window
随着有效活动滑动
        +
Absolute Maximum
从登录 / 授权开始固定
```

可以抽象为：

```text
effectiveExpiresAt = min(
  lastActivityAt + idleTTL,
  familyCreatedAt + absoluteTTL
)
```

OWASP Session Management Cheat Sheet 同样建议会话同时考虑 Idle Timeout 和 Absolute Timeout；Absolute Timeout 的意义就是即使会话持续活跃，也仍然存在一个不可无限突破的最大寿命。[[3]](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

这也解释了长期实时展示场景的设计边界：

```text
普通 Human Session
需要周期性重新认证
→ 保留 Absolute Maximum

真正 7×24 无人值守 Display / Kiosk
不应该简单通过“无限滑动用户 Refresh Token”实现
→ 更适合独立的低权限终端身份、只读 Scope、设备绑定和独立撤销策略
```

也就是说，长期在线需求首先是身份模型问题，而不是简单把 Absolute Expiration 删除。

### JWT Access Token、Opaque Token 与 Server-side Session 是不同的状态模型

Access Token 常见两条路线：

```text
JWT Access Token
Token 自包含 Claims
Resource Server 可以本地验签

Opaque Access Token
Token 本身只是高熵随机标识
真实会话状态保存在 Server-side Store
```

JWT 是自包含格式，不代表整个系统一定 Stateless（无状态）。如果 JWT 验签以后仍然查询 Token Family、Session Store、用户状态或 Revocation List，那么整体架构实际上是：

```text
JWT
负责表达和证明短期 Claims
        +
Server-side Session State
负责立即撤销、用户状态和会话控制
```

这种 Hybrid Model（混合模型）是合法且常见的，只是 JWT “完全不回源即可验证”的优势会被削弱。

Opaque Token 则可以使用 CSPRNG（Cryptographically Secure Pseudorandom Number Generator，密码学安全伪随机数生成器）生成高熵随机值，客户端只持有无业务含义的 Token，服务端保存其哈希及会话状态。OWASP 对 Session Identifier 的通用建议也是：标识值应随机、不可预测、无业务含义，真实状态保存在服务端。[[3]](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

选择时不要简单认为“随机字符串一定比 JWT 高级”：

| 场景 | 更自然的模型 |
| --- | --- |
| 多个 Resource Server 希望独立验签、减少中心查询 | JWT Access Token |
| 中心化后台、强制下线、权限和 Session 状态要求实时生效 | Opaque Token + Server-side Session |
| 既希望 JWT 表达 Claims，又需要立即撤销 | JWT + Server-side Session State |

Opaque Token 还可以通过 Token Introspection 查询权威状态；RFC 7662 定义了资源服务器查询 Token 是否 active 及相关元数据的标准接口。[[4]](https://www.rfc-editor.org/rfc/rfc7662.html)

核心判断不是 Token 长什么样，而是：

```text
系统更需要
Decentralized Validation（分散验证）
还是
Centralized Session Control（集中会话控制）？
```

### 两种Token的服务器认证方式区别

核心区别：Access Token追求高频访问性能，偏无状态；Refresh Token追求会话控制力，偏有状态，二者认证目标和流程完全不同。

Access Token的认证方式（两种）：

- JWT自校验（最常见）：资源服务器本地验签，检查签名、exp、iss、aud、scope等字段，无需回源查库，性能高，适合高并发API，缺点是已签发的Token在过期前难以立即撤销，因此需缩短生命周期。

- Opaque Token + Introspection：Token为无意义随机串，资源服务器调用授权服务器的token introspection接口，查询Token的有效性、用户信息、权限等，可实现实时撤销，权限变化生效快，缺点是每次请求多一次网络调用，成本较高。

Refresh Token的认证方式：

仅由授权服务器在刷新接口（如`/auth/refresh`）校验，不仅校验签名和过期时间，还需查询服务端状态，包括Token是否存在、是否被吊销/轮换、是否属于当前用户/设备/会话、是否命中复用检测、是否超过idle/absolute过期时间等。

Refresh Token偏有状态的原因：需支持撤销、轮换、复用检测、单设备登出、Token家族管理等核心能力，这些能力均依赖服务端存储的会话状态，若做成无状态（如纯JWT），会削弱安全控制力，难以实现上述功能。

对应问题：

- Access Token的两种认证方式各有什么特点？

- 为什么Refresh Token通常是有状态的，有状态具体指什么？

- 两种Token的认证方式核心区别是什么，为什么会有这种区别？

### Refresh Token与Session ID的区别

本质区别：Session ID是服务器会话的索引键，用于传统session-based auth；Refresh Token是授权/续签凭证，用于token-based auth/OAuth体系，二者设计目标、适用场景完全不同。

核心区别详解：

- 用途不同：Session ID直接代表“请求所属的登录会话”，服务器通过它直接恢复用户登录态；Refresh Token不直接访问业务资源，仅用于换取新的Access Token。

- 使用主体不同：Session ID可由业务服务器直接识别，请求到应用服务器后，直接查询session store即可获取用户信息；Refresh Token仅用于授权服务器的刷新接口，业务API通常不接受Refresh Token。

- 配套模型不同：Session ID对应session-based auth，服务端维护完整登录态，浏览器携带Cookie，服务端查询session store；Refresh Token对应token-based auth/OAuth，Access Token给资源服务器，Refresh Token给授权服务器，职责分离。

- 配套依赖不同：Session ID无需Access Token，自身就是完整的会话凭证；Refresh Token通常需与Access Token配套使用，单独存在无实际访问价值。

共同点：均可能为高熵随机字符串、均可能存储在Cookie中、均依赖HTTPS保护、均需服务端管理状态（过期、撤销）。

对应问题：

- Refresh Token与Session ID的本质区别是什么？

- 两者在用途和使用主体上有什么不同？

- 为什么说Refresh Token不是另一种Session ID？

### 前端项目落地方案

方案A：SPA + API（前后端分离架构）

- Access Token：存储在JS内存中，避免落地。

- Refresh Token：存储在`HttpOnly + Secure + SameSite` Cookie中，限制`Path=/auth/refresh`。

- 流程：Access Token过期后，调用`/auth/refresh`接口，浏览器自动携带Refresh Token，换取新的Access Token和Refresh Token（启用rotation），API请求使用Bearer Access Token。

方案B：BFF / 同源Web（同源服务端渲染架构）

- 浏览器仅存储安全Cookie（含会话信息），前端不直接接触Access Token和Refresh Token。

- 流程：浏览器请求时自动携带Cookie，服务端代为处理认证、Token获取和续签，前端无需关注Token逻辑。

方案选择不能只根据“前后端是否分离”决定。RFC 10017 将 Browser-based OAuth Application 区分为 BFF、Token-Mediating Backend 与 Browser-based OAuth Client 等架构，它们的核心差异是 OAuth Client 位于哪里、Access / Refresh Token 是否暴露给 Browser JavaScript，以及 Browser 是否直接调用 Resource Server。[[2]](https://www.rfc-editor.org/rfc/rfc10017.html)

因此应先确定信任边界，再决定 Token Storage：BFF / Server-side Web 可以让 OAuth Token 保留在可信 Backend，Browser 主要持有 Session Cookie；Browser-based OAuth Client 直接持有 Access Token 时，需要承担更高的 Token Exfiltration 风险并使用 Authorization Code + PKCE 等当前安全要求；Token-Mediating Backend 的边界介于两者之间。OIDC 登录、ID Token、Local Principal 与 Session 的完整关系见 [Web 身份认证、会话控制与访问控制体系](./W-Web身份认证会话控制与访问控制体系.md)。

对应问题：

- 前端项目中，前后端分离架构和同源BFF架构的Token落地方案有什么不同？

- 如何根据项目架构选择合适的Token落地方案？

### 核心结论

- Access Token用于访问业务API，应短期有效，泄露后损失小；Refresh Token用于续签，权限更大，需严格保护。

- Refresh Token 是高价值续期凭据，是否由 Browser 持有、通过 Cookie 传递，还是完全保留在 BFF / Server-side Backend，取决于 OAuth Client 与 Session 的架构边界；不能把某一种 Browser Storage 写成所有应用的唯一最佳方案。

- 短Token的价值的是缩短攻击窗口，分层减损；Refresh Token的安全依赖rotation、复用检测、过期控制等组合机制。

- Access Token偏无状态（追求性能），Refresh Token偏有状态（追求控制力），二者认证方式和流程不同。

- Session ID与Refresh Token本质不同，分别对应传统会话和OAuth授权两种体系。

- 前端落地方案需结合项目架构选择，核心是平衡安全性和开发复杂度。
### 参考资料

1. RFC 9700 — Best Current Practice for OAuth 2.0 Security  
   https://www.rfc-editor.org/rfc/rfc9700.html
2. RFC 10017 — OAuth 2.0 for Browser-Based Applications  
   https://www.rfc-editor.org/rfc/rfc10017.html
3. OWASP — Session Management Cheat Sheet  
   https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
4. RFC 7662 — OAuth 2.0 Token Introspection  
   https://www.rfc-editor.org/rfc/rfc7662.html
> （注：文档部分内容可能由 AI 生成）