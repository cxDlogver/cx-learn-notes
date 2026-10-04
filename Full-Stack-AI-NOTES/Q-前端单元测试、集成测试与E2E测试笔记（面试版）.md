# 前端测试体系从验证边界到工程质量门禁

前端测试解决的不是“应该使用 Vitest、Cypress 还是 Playwright”，而是：**面对一个需求、一个代码单元或一条业务链路，需要在什么边界、什么环境、使用多真实的依赖来验证什么结果，才能以合理成本建立足够的交付信心。**

因此测试体系不能从工具名开始，而应该先建立完整验证链：

~~~text
Requirement / Risk
        ↓
确定需要验证什么行为
        ↓
选择 Test Boundary
Unit / Component / Integration / E2E
        ↓
选择 Test Environment
Node / DOM Simulation / Real Browser / Full Environment
        ↓
决定 Dependency Fidelity
Real Dependency / Fake / Stub / Mock
        ↓
设计 Test Case
Scenario → Fixture → Action → Assertion
        ↓
执行并产生 Test Result / Evidence
        ↓
CI Quality Gate
        ↓
Deployment / Smoke / Production Verification
~~~

这条链中的每一层解决的问题不同：

| 层级 | 输入 | 解决的问题 | 输出 |
| --- | --- | --- | --- |
| Requirement / Risk | 需求、缺陷、变更、风险 | 哪些行为必须被证明正确 | Verification Goal |
| Test Boundary | Verification Goal | 测一个函数、组件、模块协作还是完整系统 | Unit / Component / Integration / E2E Scope |
| Test Environment | 被测边界 | 在 Node、模拟 DOM、真实浏览器还是完整环境执行 | Execution Environment |
| Dependency Fidelity | 外部依赖 | 哪些依赖保持真实，哪些需要替换以控制成本与稳定性 | Real / Fake / Stub / Mock Dependency |
| Test Case Design | 行为和边界 | 如何稳定地准备条件、执行动作并判断结果 | Fixture / Action / Assertion |
| Test Execution | Test Case | 实际结果是否满足预期 | Test Result / Evidence |
| CI / Delivery | Test Result | 哪些验证必须通过才能继续交付 | Quality Gate |

因此：

~~~text
Test Type
≠
Test Tool

是否 Mock
≠
测试类型的唯一判断标准

运行在真实 Browser
≠
一定就是 E2E
~~~

测试类型首先由**被测边界和需要建立的信心**决定，再根据执行环境、依赖真实性、反馈速度和维护成本选择工具。

## 1. 前端测试通过不同验证边界逐层建立交付信心

### 【测试的核心是验证可观察结果而不是执行代码本身】

自动化测试不是“把代码运行一遍”，而是建立：

~~~text
Known Preconditions
↓
Action / Input
↓
System Behavior
↓
Observable Result
↓
Assertion
~~~

例如登录需求真正需要证明的是：

~~~text
Given 用户位于登录页并拥有有效凭据
When 提交登录表单
Then 登录成功
And 进入目标页面
And 页面显示已登录状态
~~~

测试真正关注的是外部可观察行为是否成立，而不是某个内部函数有没有被调用固定次数。实现重构后，只要业务行为不变，稳定的行为测试通常仍应成立。

### 【测试边界越大能够覆盖的协作越多但执行成本也通常越高】

可以先建立一条边界扩展链：

~~~text
Function / Class
↓
Component
↓
Multiple Modules
↓
Application
↓
Frontend + Backend + Database + Environment
~~~

对应常见测试层：

| 测试层 | 主要边界 | 常见目标 |
| --- | --- | --- |
| Unit Test | 函数、类、Hook、独立逻辑单元 | 快速验证局部规则 |
| Component Test | 单个 UI Component 及其直接交互 | 验证渲染和用户交互 |
| Integration Test | 多个模块、组件、状态、路由、请求层协作 | 验证组合后的契约和状态流 |
| E2E Test | 从用户入口到系统主要依赖的完整业务链 | 验证系统整体可用性 |

边界扩大通常意味着：

~~~text
更多真实模块参与
→ 更高 Fidelity
→ 更接近真实用户链路
→ 更高环境和数据成本
→ 失败定位范围更大
~~~

因此完整测试策略不是“全部写成 E2E”，而是让不同层测试承担不同风险。

### 【工具不能决定测试类型】

同一个工具可以承担不同测试层。

Vitest 可以在 Node、jsdom / happy-dom 等环境运行，也提供 Browser Mode，让测试在真实 Browser 中执行。[[1]](https://vitest.dev/guide/browser/)

Cypress 官方把 Component Testing 与 E2E Testing 都作为正式测试类型；其能力并不限于“集成测试工具”。[[2]](https://docs.cypress.io/app/core-concepts/testing-types)

Playwright 常用于 Browser / E2E Testing，但也可以通过 Route Mock 等能力缩小真实依赖范围。

所以选择顺序应该是：

~~~text
先定义需要验证的系统边界
↓
再选择依赖真实性
↓
再选择运行环境
↓
最后选择合适工具
~~~

而不是：

~~~text
Vitest = Unit
Cypress = Integration
Playwright = E2E
~~~

## 2. Unit、Component、Integration 与 E2E 描述不同测试边界

### 【Unit Test 验证最小逻辑单元在明确输入下的行为】

Unit Test（单元测试）以较小的逻辑单元为测试边界，例如纯函数、业务函数、Class、Hook / Composable 或可以独立验证的逻辑模块。

单元测试的目标是：

~~~text
Small Boundary
+
Fast Feedback
+
Deterministic Input
↓
快速验证局部逻辑
~~~

“单元测试需要 Mock 所有外部依赖”不是绝对定义。是否替换依赖应看这个依赖是否属于当前需要验证的边界，以及真实依赖是否会降低测试可控性。

前端常见测试对象包括：

- **工具函数**：formatDate、formatMoney、filterList 等输入输出明确的函数；
- **业务函数**：checkPermission、validateForm、calculateTotal 等规则；
- **组件中的纯逻辑**：按钮禁用、文案计算、状态转换；
- **Hooks / Composables**：状态更新、依赖变化和副作用封装。

Vitest 是现代前端常见 Test Runner 之一，但“使用 Vitest”并不自动说明测试属于 Unit Test。

基础示例：

~~~js
import { describe, it, expect } from 'vitest'
import { sum } from './sum'

describe('sum', () => {
  it('should return 3 when input is 1 and 2', () => {
    expect(sum(1, 2)).toBe(3)
  })

  it('should return 0 when input is 0 and 0', () => {
    expect(sum(0, 0)).toBe(0)
  })

  it('should support negative numbers', () => {
    expect(sum(-1, 2)).toBe(1)
  })
})
~~~

这段测试的关键不是 Vitest API，而是：

~~~text
Input
1 + 2
↓
sum
↓
Observable Output
3
↓
Assertion
~~~

### 【Component Test 直接验证 UI Component 的渲染和交互边界】

Component Test（组件测试）把一个 UI Component 挂载到测试环境，验证组件自身的渲染、状态变化和用户交互。

例如一个 RegistrationForm 可以验证：

- 不合法输入是否展示校验错误；
- 勾选某个选项后是否显示额外字段；
- Submit Button 是否按状态 Enable / Disable；
- 用户输入后页面是否展示正确内容。

Cypress 官方将 Component Testing 与 E2E Testing 明确区分：Component Test 直接 Mount Component，而不是通过 URL 启动完整应用。[[2]](https://docs.cypress.io/app/core-concepts/testing-types)

因此：

~~~text
Unit Test
→ 更关注局部逻辑

Component Test
→ 更关注单个 UI Unit 在渲染环境中的行为
~~~

Component Test 可以包含多个内部函数和状态，因此它不一定等价于“组件的 Unit Test”。

### 【Integration Test 验证多个真实模块组合后的协作关系】

Integration Test（集成测试）关注多个模块组合后的交互是否成立。

前端常见链路：

~~~text
Form
↓
Validation
↓
Request Layer
↓
State Store
↓
Router
↓
UI Render
~~~

它可能让前端内部模块保持真实，同时替换真实 Backend；也可能直接验证 Frontend + Real API 的某一部分集成。关键是**边界包含多个协作单元**，而不是“是否使用 Cypress”。

集成测试特别适合发现：

- 模块 Contract 不一致；
- State Flow 错误；
- Router 与页面状态不同步；
- Request Adapter 与 UI 处理不一致；
- 多个单元独立正确但组合后失败。

### 【E2E Test 从用户入口验证系统主要业务链路】

E2E Test（端到端测试）从用户可以进入的系统入口出发，尽可能覆盖构成业务结果的真实系统链路。

典型模型：

~~~text
Browser User Action
↓
Frontend
↓
Backend API
↓
Business Logic
↓
Database / External Dependency
↓
Response
↓
Frontend Render
↓
User-visible Result
~~~

E2E 通常优先保留核心依赖的真实性，因为目标是验证完整系统是否可以作为一个整体工作。但 E2E 并不要求“世界上所有依赖都绝对不能 Mock”。不可控第三方服务、支付 Sandbox、邮件 Provider 等可以按照测试目标建立替代边界。

所以：

~~~text
E2E
= 以完整业务链路为主要验证边界

不是
= 一个 Mock 都不能出现
~~~

## 3. Test Case Design 把需求转换成 Fixture、Action 与 Assertion

### 【Scenario 先描述需要验证的业务行为】

测试用例首先应该回答：

~~~text
在什么条件下？
↓
发生什么动作？
↓
应该观察到什么结果？
~~~

可以使用 Given-When-Then：

~~~text
Given 用户已打开登录页
And 测试账号有效

When 用户填写凭据并提交

Then 系统建立登录状态
And 页面跳转到首页
And 页面展示当前用户信息
~~~

BDD 语法不是必须条件，关键是 Test Case 能明确表示前置条件、动作和结果。

### 【Fixture 提供测试开始前需要的稳定数据和状态】

Fixture（测试夹具 / 测试前置数据）是 Test Case 执行所依赖的稳定输入和环境状态，例如：

- 固定 Test User；
- 一组 Product / Order 数据；
- Mock API Response；
- Frozen Time；
- Feature Flag；
- Browser Storage State；
- Database Seed。

完整关系：

~~~text
Scenario
↓
Fixture / Test Data
↓
Action
↓
Assertion
↓
Result / Evidence
~~~

Fixture 解决的是“测试从什么已知状态开始”，不能与 Mock 简单等同。

### 【Assertion 应验证业务可观察结果】

常见 Assertion 可以分为：

| 类型 | 示例 |
| --- | --- |
| Value Assertion | 函数结果为 3 |
| UI Assertion | Error Message 可见 |
| Navigation Assertion | URL 进入 /home |
| Request Assertion | 正确 Request 被发出 |
| State Assertion | Store / Storage 状态变化 |
| Negative Assertion | 不应出现某按钮 / 请求 |
| Contract Assertion | Response Schema 符合要求 |

同一个场景往往需要多个 Assertion 才能证明真正的业务结果。

例如：

~~~text
点击登录
↓
只断言 Request 200
不足以证明登录成功

还需要根据目标验证
Route
UI
Session State
后续受保护资源
~~~

## 4. Test Double 与 Mock 控制依赖但不单独决定测试层级

### 【Test Double 用可控对象替代真实依赖】

Test Double（测试替身）泛指测试中替代真实 Dependency 的对象或行为，常见概念包括 Stub、Fake、Mock、Spy。

入门阶段可以先按目的理解：

| 类型 | 主要目的 |
| --- | --- |
| Stub | 返回预设结果 |
| Fake | 使用简化但可工作的实现 |
| Spy | 观察调用和参数 |
| Mock | 用可控行为替换依赖并支持验证 |

具体框架的 API 名称可能不会严格对应理论分类，因此工程中更重要的是说明“替换了什么、为什么替换、会失去什么真实度”。

### 【Mock 主要解决可控性、速度和故障注入】

常见需要控制的 Dependency：

- HTTP API；
- Router；
- Local Storage Adapter；
- Time / Date；
- Random Number；
- 第三方 SDK；
- Analytics；
- Feature Flag；
- External Provider。

Mock 的常见目标：

- **可控**：固定输入和返回值；
- **稳定**：不受网络和外部服务状态影响；
- **快速**：避免启动昂贵环境；
- **故障注入**：稳定构造 Timeout、500、Permission Denied 等异常；
- **可重复**：同样输入得到同样测试条件。

### 【是否 Mock 不能单独决定 Unit、Integration 或 E2E】

例如：

~~~text
Playwright
↓
真实 Browser
↓
真实 Frontend
↓
Mock Third-party Analytics
↓
真实 Backend / Database
~~~

这个测试仍可能以完整业务链为主要 E2E Boundary。

另一个例子：

~~~text
Playwright
↓
真实 Browser
↓
Frontend
↓
所有 Backend API 都通过 Route Mock
~~~

此时验证范围更接近 Browser-level Frontend Integration。

因此分类应该看：

~~~text
Test Entry
+
System Boundary
+
Real Dependency Scope
+
Execution Environment
+
Verification Goal
~~~

而不是只判断：

~~~text
有 Mock → Integration
无 Mock → E2E
~~~

## 5. Test Environment 与工具能力决定测试怎样被执行

### 【Node、DOM Simulation 与 Real Browser 提供不同运行真实性】

前端测试常见环境：

| Environment | 提供能力 | 优点 | 局限 |
| --- | --- | --- | --- |
| Node | JavaScript Runtime | 快、适合纯逻辑 | 没有 Browser DOM |
| jsdom / happy-dom | DOM Simulation | 快、适合大量 UI Logic Test | 不等于完整 Browser |
| Real Browser | Browser Engine + DOM + Layout / Events | 更接近用户环境 | 启动和维护成本更高 |
| Full Test Environment | Browser + Backend + Database 等 | 最高业务 Fidelity | 成本最高 |

Vitest Browser Mode 可以直接在 Browser 中运行测试，并通过 Playwright 或 WebdriverIO Provider 支持真实 Browser 执行。[[1]](https://vitest.dev/guide/browser/)

所以 Environment 也是独立维度：

~~~text
Unit Test 可以运行在 Browser
Integration Test 可以运行在 Node
E2E 通常需要 Browser + Application Environment
~~~

### 【Cypress 同时支持 Component 与 E2E Testing】

Cypress 官方当前把 E2E、Component、API、Accessibility 等作为不同测试能力，其中 Component Testing 直接 Mount Component，E2E 则从 Browser 访问 Application。[[2]](https://docs.cypress.io/app/core-concepts/testing-types)

Cypress 当前支持 Chrome Family、Edge、Firefox，并提供实验性的 WebKit 支持，因此不应再用“Cypress 多浏览器支持明显不如 Playwright”作为无条件结论。[[3]](https://docs.cypress.io/app/references/launching-browsers)

选择 Cypress 时更应该比较：

- Component / E2E Workflow；
- Debugging Experience；
- Browser Coverage Requirement；
- CI Infrastructure；
- Existing Team Stack。

### 【Playwright 提供多 Browser Engine 与 Browser Automation】

Playwright 支持 Chromium、Firefox、WebKit，并可以通过 Browser Channel 使用部分已安装的 Chrome / Edge。WebKit 覆盖的是 Playwright 提供的 WebKit Build，不应该直接写成“运行真实 Safari”。[[4]](https://playwright.dev/docs/browsers)

Playwright 的核心优势之一是 Browser Automation、Locator、Auto-waiting、Isolation、Trace 等能力，但这些仍然是工具能力，不是 E2E 的定义本身。

## 6. Test Isolation 与 Test Data 保证测试可重复执行

### 【Test Isolation 避免一个 Test Case 污染另一个 Test Case】

Test Isolation（测试隔离）要求 Test Case 可以独立执行，不依赖前一个 Test 的副作用。

Playwright 默认为每个测试创建独立 Browser Context，包括独立 Cookie、Local Storage、Session Storage 等状态，从而减少级联失败。[[5]](https://playwright.dev/docs/browser-contexts)

稳定 Test 应尽量满足：

~~~text
Test A
不改变
Test B 的前置条件

Test B
单独运行
仍然能够通过
~~~

如果 Test 必须固定顺序执行，往往说明 Fixture、Shared State 或 Cleanup 设计存在问题。

### 【Test Data 必须可创建、可识别并可清理】

常见问题：

~~~text
测试依赖共享账号
↓
并发 Test 修改同一份数据
↓
状态相互覆盖
↓
Flaky Test
~~~

更稳定的策略包括：

- 每个 Case 创建独立数据；
- 使用唯一 ID / Namespace；
- Test 前 Seed，Test 后 Cleanup；
- 使用可恢复 Fixture；
- 只共享真正只读的数据；
- 固定 Time / Timezone 等不稳定环境变量。

### 【Determinism 让相同条件下的结果尽可能一致】

Determinism（确定性）表示：在相同代码和测试条件下，Case 应尽量得到相同结果。

典型非确定来源：

- Random；
- Current Time；
- Network Delay；
- Shared Mutable Data；
- External Service；
- Animation；
- Race Condition；
- 不稳定 Selector。

可以通过 Frozen Time、Stable Fixture、Explicit Dependency、Auto-waiting 等方式降低不确定性。

### 【Flaky Test 是测试系统可靠性问题而不只是偶发失败】

Flaky Test（不稳定测试）指代码没有发生相关变化，但测试会在 Pass / Fail 之间随机波动。

~~~text
Flaky Test
↓
团队开始无视失败
↓
Quality Gate 失去可信度
↓
真正 Regression 被掩盖
~~~

因此遇到 Flake 不应只增加 Retry。Retry 可以降低偶发基础设施问题的影响，但如果根因是 Race Condition、State Leakage 或 Selector Fragility，仍应定位和修复。

## 7. 测试实现应优先验证用户可观察行为

### 【Locator 应优先描述用户如何识别元素】

Testing Library 推荐优先使用接近用户和 Accessibility Tree 的查询，例如 Role、Label、Text；Test ID 更适合无法通过语义定位或需要显式稳定 Contract 的场景。[[6]](https://testing-library.com/docs/queries/about/)

Playwright 同样建议优先使用 User-facing Attribute 和 Explicit Contract，例如 getByRole，并把 Locator 作为 Auto-waiting 与 Retry-ability 的核心。[[7]](https://playwright.dev/docs/best-practices)

因此 Locator 可以按意图理解：

~~~text
User-facing Semantics
Role / Label / Text
        ↓
Explicit Test Contract
Test ID
        ↓
Implementation Detail
CSS / XPath / DOM Structure
~~~

不是所有页面都必须机械采用同一优先级。例如动态文案不稳定而 Test ID 是团队明确 Contract 时，Test ID 可能更合适；关键是避免把 CSS Class 或 DOM 层级当作业务行为。

### 【Cypress 登录链展示 Browser-level Frontend Integration】

下面保留完整登录链。该 Case 使用真实 Browser 中的 Frontend，但通过 cy.intercept 替换 Backend Response，因此主要验证 Frontend 内部的 Form、Request、Storage、Router 和 Render 协作。

~~~js
describe('登录集成测试', () => {
  it('用户登录成功后应跳转首页并显示欢迎信息', () => {
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: {
        code: 0,
        data: {
          token: 'mock-token-123'
        }
      }
    }).as('loginRequest')

    cy.intercept('GET', '/api/user/profile', {
      statusCode: 200,
      body: {
        code: 0,
        data: {
          username: 'cx',
          nickname: '陈相'
        }
      }
    }).as('profileRequest')

    cy.visit('/login')

    cy.get('[data-testid="username"]').type('test_user')
    cy.get('[data-testid="password"]').type('123456')
    cy.get('[data-testid="login-button"]').click()

    cy.wait('@loginRequest')
    cy.url().should('include', '/home')

    cy.wait('@profileRequest')
    cy.contains('欢迎你，陈相').should('be.visible')

    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.equal('mock-token-123')
    })
  })
})
~~~

这段 Case 包含五类集成点：

| 集成点 | 验证内容 |
| --- | --- |
| UI Interaction | 输入和点击是否触发正确行为 |
| Request Layer | Login / Profile Request 是否发起 |
| Storage | Login State 是否正确写入 |
| Router | 登录成功是否进入 /home |
| Render | Profile Data 是否正确展示 |

其中 cy.wait('@loginRequest') 比固定 sleep 更稳定，因为等待的是明确业务事件，而不是猜测时间。

如果 UI 支持稳定 Accessibility Semantics，可优先把：

~~~js
cy.get('[data-testid="login-button"]')
~~~

替换为接近用户语义的查询；如果 Test ID 是团队明确的 Testing Contract，也可以继续使用它。关键是不要依赖容易随 Styling 改变的 Class Chain。

### 【Playwright 登录链展示更高依赖真实性的 E2E Boundary】

下面的 Case 不拦截核心 Login / Profile API，测试目标是验证 Browser、Frontend、Backend 和 Data Layer 的主要业务链：

~~~js
import { test, expect } from '@playwright/test'

test.describe('登录端到端测试', () => {
  test('用户登录成功后应跳转首页并显示欢迎信息', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    await page.getByLabel('用户名').fill('test_user')
    await page.getByLabel('密码').fill('123456')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page).toHaveURL(/.*\/home/)
    await expect(page.getByText('欢迎你，陈相')).toBeVisible()

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()
  })
})
~~~

Playwright 的 Web-first Assertion 会等待条件在 Timeout 内满足，而不是要求业务代码使用固定 sleep。Locator 也会在每次 Action 时重新定位当前 DOM Element。[[7]](https://playwright.dev/docs/best-practices)[[8]](https://playwright.dev/docs/locators)

这条链可以覆盖：

~~~text
User Input
↓
Browser
↓
Frontend Form / Router / State
↓
Real Backend API
↓
Data System
↓
Response
↓
UI Result
~~~

### 【Playwright Route Mock 可以把同一工具用于更窄的测试边界】

如果测试目标只关注 Browser 中 Frontend 的集成关系，可以通过 page.route 控制 Backend：

~~~js
import { test, expect } from '@playwright/test'

test.describe('登录链路测试（Backend Mock）', () => {
  test('登录成功后跳转首页并显示欢迎语', async ({ page }) => {
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { token: 'mock-token-123' }
        })
      })
    })

    await page.route('**/api/user/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            username: 'cx',
            nickname: '陈相'
          }
        })
      })
    })

    await page.goto('http://localhost:3000/login')
    await page.getByLabel('用户名').fill('test_user')
    await page.getByLabel('密码').fill('123456')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page).toHaveURL(/.*\/home/)
    await expect(page.getByText('欢迎你，陈相')).toBeVisible()

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBe('mock-token-123')
  })
})
~~~

这里的工具仍然是 Playwright，但 Test Boundary 已经变化。这正说明：

~~~text
Tool
≠
Test Type
~~~

## 8. Verification Strategy 按风险、速度、成本与真实度组合不同测试层

### 【不同测试层解决的是不同失败风险】

| 维度 | Unit | Component | Integration | E2E |
| --- | --- | --- | --- | --- |
| 主要边界 | 单一逻辑单元 | 单个 UI Component | 多个 Module / Layer | 完整业务路径 |
| 反馈速度 | 通常最快 | 快 | 中等 | 通常最慢 |
| 依赖真实性 | 较低到中等 | 中等 | 中等到高 | 通常最高 |
| 环境成本 | 低 | 低到中 | 中 | 高 |
| 失败定位 | 局部 | Component | 多模块 | 跨系统 |
| 适合问题 | Rule / Function Error | Render / Interaction | Contract / State Flow | System / Environment Failure |

这里的“通常”很重要：一个复杂 Browser Unit Test 可能比简单 API Integration Test 更慢；一个使用 In-memory Database 的 Integration Test 也可能非常快。因此测试层不是由执行时长定义，而是由 Boundary 和 Verification Goal 定义。

### 【测试组合应从风险出发而不是追求固定比例】

可以用 Risk-based Strategy：

~~~text
高频变化 + 核心规则
→ 更多快速 Unit / Component Verification

模块 Contract 复杂
→ 增加 Integration Test

核心用户旅程 / 高业务风险
→ E2E / Acceptance

跨浏览器风险
→ Browser Matrix

第三方依赖风险
→ Contract / Sandbox / Selected E2E
~~~

测试金字塔、Testing Trophy 等模型可以作为启发，但不能机械规定“必须 70% Unit、20% Integration、10% E2E”。

### 【Coverage 只说明代码被执行到的程度而不是业务已经被证明正确】

Code Coverage 常见指标包括 Statement、Branch、Function、Line Coverage。

但是：

~~~text
100% Line Coverage
≠
所有业务行为正确
~~~

如果 Assertion 错误、Scenario 缺失或只执行代码没有验证结果，Coverage 仍可能很高。

因此 Coverage 适合作为：

~~~text
Missing Test Signal
+
Regression Visibility
~~~

而不应作为唯一 Quality Goal。

## 9. CI/CD 把 Testing Strategy 转换为 Quality Gate

### 【不同反馈成本决定测试进入 Pipeline 的位置】

Unit、Component、Integration、E2E 都属于 Verification Strategy，不等于 CI/CD 本身。

典型 Pipeline：

~~~text
Pull Request
↓
Fast Checks
├── Lint
├── Type Check
├── Unit
└── Fast Component / Integration
↓
Merge / Build Artifact
↓
Environment Verification
├── Integration
├── E2E
└── Acceptance
↓
Deployment
↓
Smoke / Health / Production Verification
~~~

完整 Trigger → Workflow → Artifact → Release → Deployment → Production Verification 由 [软件交付与 CI/CD 工程体系](./R-软件交付与CI-CD工程体系.md) 负责。

### 【Quality Gate 应建立在风险和执行成本之上】

不是所有 E2E 都必须在每次 Commit 上全量运行，也不是所有 Unit Test 只能在本地运行。

可以按照：

~~~text
Change Risk
+
Test Cost
+
Feedback Requirement
↓
决定运行时机
~~~

例如：

- PR：Fast Unit + Component + Selected Integration；
- Merge：更完整 Integration；
- Test / Staging：E2E / Acceptance；
- Deployment：Smoke；
- Production：Monitoring / Synthetic / Business Verification。

### 【失败结果需要可以追溯到 Scenario 和 Evidence】

一个成熟测试结果至少应回答：

- 哪个 Scenario 失败；
- 使用什么 Fixture / Environment；
- 哪一步 Action 失败；
- Expected / Actual 是什么；
- 是否有 Screenshot / Trace / Log；
- 是 Product Failure、Test Failure、Data Failure 还是 Environment Failure。

这使 Test Result 能真正参与 CI Gate，而不是只留下“某个脚本红了”。

## 10. 测试知识继续连接工程化、需求验收与浏览器运行环境

### 【测试体系位于需求和交付之间】

完整工程关系：

~~~text
Requirement / Acceptance Criteria
↓
Scenario / Test Case
↓
Automated Verification
↓
CI Quality Gate
↓
Artifact / Deployment
↓
Production Verification
~~~

前端工程化负责把 Test Command、Environment、Script、Coverage 等能力接入项目；测试体系负责定义**验证什么、边界多大、依赖多真实、怎样断言**；CI/CD 负责决定这些结果何时执行以及是否允许继续交付。

对应入口：

- [前端工程化设计全面解析](./Q-前端工程化设计全面解析.md)：测试能力怎样接入项目工程；
- [软件交付与 CI/CD 工程体系](./R-软件交付与CI-CD工程体系.md)：Test Result 怎样成为 Pipeline Gate；
- [基于Chrome浏览器渲染原理](./J-基于Chrome浏览器渲染原理.md)：Browser Runtime、DOM 与 Rendering；
- [前端异步编程](./Q-前端异步编程.md)：Promise / Microtask 等异步执行机制。

### 【项目实践应该作为 Scenario 与 Acceptance Design 的证据】

项目中的 ATDD / BDD、验收矩阵、Fixture、浏览器矩阵、证据 Schema 等内容可以作为 Testing Strategy 的工程实践，但项目特定账号、业务状态、Viewport、接口数据和目录结构不应成为通用定义。

通用知识只抽象：

~~~text
Acceptance Criteria
↓
Scenario
↓
Fixture / Environment
↓
Action
↓
Assertion
↓
Evidence
↓
Result
~~~

具体业务数据继续留在项目实践文档中。

## 11. 面试与架构说明先讲验证边界再讲具体工具

### 【Unit、Integration 与 E2E 的核心区别是测试边界】

可以回答：

Unit Test 验证较小的逻辑单元，强调快速反馈和局部定位；Integration Test 验证多个模块或 Layer 的协作关系；E2E Test 从用户入口验证系统主要业务链路。三者不是由 Vitest、Cypress 或 Playwright 工具名称决定，依赖是否 Mock 也不是唯一判断标准。

### 【选择测试方式需要同时看风险、边界和反馈成本】

可以沿下面路径回答：

~~~text
要证明什么风险？
↓
最小需要覆盖到什么边界？
↓
哪些 Dependency 必须保持真实？
↓
需要多接近真实 Browser / Environment？
↓
反馈速度要求多高？
↓
再选择 Test Tool
~~~

这比“Unit 用 Vitest、Integration 用 Cypress、E2E 用 Playwright”的工具表述更稳定。

### 【Mock 的价值是控制依赖而不是改变测试名称】

Mock 可以提升可控性、故障注入能力和执行速度，但它会降低某部分依赖真实性。工程上应明确 Mock Boundary，而不是把“出现 Mock”直接作为测试类型的唯一分类依据。

## 12. 参考文献

[1] Vitest. Browser Mode. https://vitest.dev/guide/browser/

[2] Cypress. Testing Types. https://docs.cypress.io/app/core-concepts/testing-types

[3] Cypress. Launching Browsers. https://docs.cypress.io/app/references/launching-browsers

[4] Playwright. Browsers. https://playwright.dev/docs/browsers

[5] Playwright. Isolation. https://playwright.dev/docs/browser-contexts

[6] Testing Library. About Queries. https://testing-library.com/docs/queries/about/

[7] Playwright. Best Practices. https://playwright.dev/docs/best-practices

[8] Playwright. Locators. https://playwright.dev/docs/locators
