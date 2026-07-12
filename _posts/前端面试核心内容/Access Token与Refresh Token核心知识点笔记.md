# Access Token与Refresh Token核心知识点笔记

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

方案选择原则：若为OAuth风格、前后端分离、多资源服务器，优先选择方案A；若为同源Web + BFF架构，方案B更自然，前端安全负担更小。

对应问题：

- 前端项目中，前后端分离架构和同源BFF架构的Token落地方案有什么不同？

- 如何根据项目架构选择合适的Token落地方案？

### 核心结论

- Access Token用于访问业务API，应短期有效，泄露后损失小；Refresh Token用于续签，权限更大，需严格保护。

- Refresh Token存储在`HttpOnly + Secure + SameSite` Cookie中是最佳实践，需通过`Path`限制发送范围。

- 短Token的价值的是缩短攻击窗口，分层减损；Refresh Token的安全依赖rotation、复用检测、过期控制等组合机制。

- Access Token偏无状态（追求性能），Refresh Token偏有状态（追求控制力），二者认证方式和流程不同。

- Session ID与Refresh Token本质不同，分别对应传统会话和OAuth授权两种体系。

- 前端落地方案需结合项目架构选择，核心是平衡安全性和开发复杂度。
> （注：文档部分内容可能由 AI 生成）