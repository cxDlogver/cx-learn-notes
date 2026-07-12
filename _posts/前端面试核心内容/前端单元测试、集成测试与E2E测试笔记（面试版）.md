# 前端单元测试、集成测试与E2E测试笔记（面试版）

## 单元测试

### 核心定义

单元测试是以最小功能单元（如方法、组件）为测试对象，验证其在不同输入下的逻辑正确性，确保单个单元的输出符合预期。核心原则是“只测当前单元”，隔离外部依赖，聚焦自身逻辑的准确性。

**对应问题**：前端单元测试的核心是什么？测试对象主要有哪些？

### 前端常见测试对象

- **工具函数**：用于处理通用逻辑的纯函数，如格式化时间（formatDate）、金额转换（formatMoney）、数据过滤（filterList）等，这类函数输入输出明确，易测试。

- **业务函数**：与业务逻辑强相关的函数，如权限判断（checkPermission）、表单校验（validateForm）、状态计算（calculateTotal）等。

- **组件中的纯逻辑**：组件内部不依赖外部环境的逻辑，如按钮禁用状态判断（isButtonDisabled）、文案切换逻辑（getButtonText）等。

- **Hooks / composables**：前端复用逻辑的封装，如状态管理Hook（useCount）、请求Hook（useRequest），测试其状态更新、依赖触发是否符合预期。

**对应问题**：前端开发中，哪些内容适合做单元测试？请举例说明。

### 常用工具

前端单元测试主流工具为**Vitest**，其特点是轻量、快速，与Vite无缝集成，支持TypeScript，语法与Jest类似，上手成本低，适合现代前端项目（Vue、React等）。

**对应问题**：前端单元测试常用工具是什么？它有哪些优势？

### 测试模板（Vitest）

基础模板（简单函数测试）：

```js
import { describe, it, expect } from 'vitest'
// 引入待测试函数
import { sum } from './sum'

// 测试套件：描述一组相关测试（此处测试sum函数）
describe('sum', () => {
  // 具体测试用例：描述测试场景和预期结果
  it('should return 3 when input is 1 and 2', () => {
    // 断言：验证函数输出符合预期
    expect(sum(1, 2)).toBe(3)
  })
  
  // 可补充更多测试用例（边界值、异常场景）
  it('should return 0 when input is 0 and 0', () => {
    expect(sum(0, 0)).toBe(0)
  })
  
  it('should return negative number when input has negative value', () => {
    expect(sum(-1, 2)).toBe(1)
  })
})
```

简洁模板（快速测试）：

```js
import { describe, it, expect } from 'vitest'

describe('加法函数', ()=> {
  it("测试加法函数的基本功能", ()=> {
    expect(sum(1, 2)).toBe(3)
  })
})
```

**对应问题**：如何用Vitest编写一个简单的单元测试？请写出核心模板和示例。

### mock的核心要点

单元测试强调“只测当前单元”，因此需要隔离外部依赖，通过mock（模拟）外部模块的行为，确保测试的可控性、稳定性和可重复性。mock的核心目的不是“偷懒”，而是排除外部干扰，聚焦当前单元的逻辑。

#### 常见需要mock的内容

- 接口请求：axios、fetch等，避免真实请求影响测试（如网络异常、接口返回不稳定）。

- 路由对象：vue-router、react-router，避免测试过程中真实跳转页面。

- 本地存储：localStorage、sessionStorage，避免测试污染真实存储数据。

- 时间与随机数：Date、Math.random()，确保每次测试的输入一致。

- 第三方SDK：如地图SDK、统计SDK，避免依赖外部服务。

- 全局状态仓库：Vuex、Pinia、Redux，隔离状态影响。

#### mock的核心目的

- 可控：确保测试环境、输入、输出可预测，避免外部因素干扰。

- 稳定：无论外部依赖是否可用，测试都能正常执行，结果一致。

- 可重复执行：多次运行测试，结果始终相同，便于回归测试。

**对应问题**：单元测试中为什么需要mock外部依赖？常见的需要mock的内容有哪些？

## 集成测试

### 核心定义

集成测试聚焦多个模块之间的交互与协作，验证它们组合在一起后是否能正常工作。与单元测试不同，集成测试不刻意隔离所有外部依赖，仅隔离非核心依赖（如真实后端接口），重点测试模块间的对接逻辑。

前端集成测试通常关注前端内部模块的协作，如“表单提交→接口请求→状态更新→路由跳转→页面渲染”的完整链路。

**对应问题**：前端集成测试的核心是什么？与单元测试的核心区别是什么？

### 常用工具

前端集成测试主流工具为**Cypress**，其特点是上手简单、API友好，支持模拟用户交互，可轻松拦截接口请求，适合测试前端模块间的协作链路。

### 集成测试示例（登录链路）

以下示例模拟“用户登录→跳转首页→展示欢迎信息”的完整前端链路，mock接口请求，聚焦前端模块协作：

```js
describe('登录集成测试', () => {
  it('用户登录成功后应跳转首页并显示欢迎信息', () => {
    // 1. mock 登录接口（隔离后端依赖，确保测试稳定）
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: {
        code: 0,
        data: {
          token: 'mock-token-123'
        }
      }
    }).as('loginRequest') // 给拦截请求取别名，便于后续等待

    // 2. mock 首页用户信息接口
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

    // 3. 打开登录页（模拟用户操作入口）
    cy.visit('/login')

    // 4. 输入用户名和密码（模拟用户输入）
    cy.get('[data-testid="username"]').type('test_user')
    cy.get('[data-testid="password"]').type('123456')

    // 5. 点击登录按钮（模拟用户提交操作）
    cy.get('[data-testid="login-button"]').click()

    // 6. 等待登录接口完成（确保异步请求结束后再执行后续断言）
    cy.wait('@loginRequest')

    // 7. 断言已经跳转到首页（验证路由跳转模块）
    cy.url().should('include', '/home')

    // 8. 等待首页拉取用户信息接口完成
    cy.wait('@profileRequest')

    // 9. 断言页面渲染了欢迎信息（验证页面渲染模块）
    cy.contains('欢迎你，陈相').should('be.visible')

    // 10. 断言 token 已写入本地存储（验证本地存储模块）
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.equal('mock-token-123')
    })
  })
})
```

### 示例逐行解析（面试重点）

#### 1. describe（测试套件）

`describe('登录集成测试', () => { ... })`：用于组织一组相关的测试用例，描述“这组测试的核心场景”（此处为登录链路的集成测试）。

核心作用：使测试结构清晰，测试报告更易读，后续可新增“登录失败”“token过期”等相关测试用例。

#### 2. it（测试用例）

`it('用户登录成功后应跳转首页并显示欢迎信息', () => { ... })`：定义单个具体的测试场景，描述“业务结果”而非“实现细节”。

优势：符合“结果导向”的测试原则，不依赖内部函数实现，即使代码重构，只要业务结果不变，测试用例仍可复用。

#### 3. mock接口（cy.intercept）

`cy.intercept('POST', '/api/login', { ... }).as('loginRequest')`：拦截前端发出的指定请求，返回模拟的响应数据，不调用真实后端接口。

核心细节：

- 第一个参数：请求方法（POST/GET）；第二个参数：请求地址（可模糊匹配）；第三个参数：模拟的响应体。

- `.as('loginRequest')`：给拦截请求取别名，后续可通过`cy.wait('@loginRequest')`显式等待请求完成，比固定毫秒数等待更稳定。

- mock原因：聚焦前端模块协作，避免真实后端接口的不稳定性（如接口报错、网络延迟）影响测试结果。

#### 4. 模拟用户操作

- `cy.visit('/login')`：打开登录页，模拟用户访问页面的行为，是集成测试/E2E测试的常见入口。

- `cy.get('[data-testid="username"]').type('test_user')`：通过`data-testid`定位元素（推荐方式），模拟用户输入内容。

- `cy.get('[data-testid="login-button"]').click()`：模拟用户点击登录按钮，触发后续业务逻辑。

重点：推荐使用`data-testid`定位元素，比class、DOM层级更稳定（样式类名、页面结构可能变更，而`data-testid`专为测试设计，不易变更）。

#### 5. 等待请求与断言

- `cy.wait('@loginRequest')`：等待mock的登录请求完成，避免异步请求未结束就执行后续断言（防止测试不稳定）。

- `cy.url().should('include', '/home')`：断言路由跳转正确，验证“登录成功→跳转首页”的链路。

- `cy.contains('欢迎你，陈相').should('be.visible')`：断言页面渲染正确，验证“接口返回数据→页面展示”的链路。

- `cy.window().then((win) => { ... })`：获取浏览器窗口对象，验证localStorage中token是否正确存储，验证“接口返回token→本地存储”的链路。

#### 6. 测试覆盖的集成点

该示例覆盖前端多个模块的协作，也是集成测试的核心价值所在：

- 页面交互模块：输入框输入、按钮点击。

- 请求模块：登录接口、用户信息接口的发起与响应处理。

- 存储模块：token存入localStorage。

- 路由模块：登录成功后跳转首页。

- 渲染模块：根据接口返回数据展示欢迎信息。

**对应问题**：请解析一段Cypress集成测试代码，说明每个步骤的作用及测试的集成点是什么？

## 端到端测试（E2E）

### 核心定义

端到端测试（End-to-End Testing）站在真实用户的视角，测试整个系统的完整业务链路，从用户操作入口开始，贯穿前端、后端、数据库、部署环境等所有环节，验证整条链路是否能正常跑通。

与集成测试不同，E2E测试尽量不mock核心依赖，优先使用真实环境、真实接口、真实数据，模拟真实用户的操作流程，确保系统在真实场景下的可用性。

**对应问题**：什么是端到端测试（E2E）？它与集成测试的核心区别是什么？

### 常用工具

前端E2E测试主流工具为**Playwright**和**Cypress**：

- Playwright：微软推出，支持多浏览器（Chrome、Firefox、Safari），API设计更现代，自动等待能力强，稳定性高，适合复杂项目的E2E测试。

- Cypress：上手简单，生态完善，但对多浏览器支持不如Playwright，更适合中小型项目或简单E2E场景。

**对应问题**：前端E2E测试常用工具有哪些？它们各自的优势是什么？

### E2E测试示例（Playwright，登录链路）

以下示例为真实E2E测试，不mock核心接口，使用真实测试环境、真实账号，验证完整业务链路：

```js
import { test, expect } from '@playwright/test'

test.describe('登录端到端测试', () => {
  test('用户登录成功后应跳转首页并显示欢迎信息', async ({ page }) => {
    // 1. 打开真实测试环境的登录页（不mock，使用真实地址）
    await page.goto('http://localhost:3000/login')

    // 2. 输入真实测试账号密码（模拟真实用户操作）
    await page.getByTestId('username').fill('test_user')
    await page.getByTestId('password').fill('123456')

    // 3. 点击登录按钮
    await page.getByTestId('login-button').click()

    // 4. 断言页面已跳转到首页（验证路由跳转）
    await expect(page).toHaveURL(/.*\/home/)

    // 5. 断言欢迎语已经显示（验证页面渲染与接口返回）
    await expect(page.getByText('欢迎你，陈相')).toBeVisible()

    // 6. 断言本地 token 已存在（验证登录态存储）
    const token = await page.evaluate(() => localStorage.getItem('token'))
    await expect(token).toBeTruthy()
  })
})
```

### 示例逐行解析（面试重点）

#### 1. 引入依赖与测试套件

`import { test, expect } from '@playwright/test'`：引入Playwright的测试 runner 和断言能力，与Vitest、Cypress的语法类似，但支持异步操作（需加await）。

`test.describe('登录端到端测试', () => { ... })`：组织测试用例，明确测试场景为登录链路的E2E测试。

#### 2. 测试用例与page对象

`test('用户登录成功后应跳转首页并显示欢迎信息', async ({ page }) => { ... })`：定义E2E测试用例，`page`是Playwright的核心对象，代表浏览器的一个标签页，用于模拟用户操作（打开页面、点击、输入等）。

#### 3. 模拟真实用户操作

- `await page.goto('http://localhost:3000/login')`：访问真实测试环境的登录页，不使用mock，模拟用户真实访问行为。

- `await page.getByTestId('username').fill('test_user')`：通过`getByTestId`定位元素（Playwright推荐的稳定定位方式），填充真实测试账号密码。

- `await page.getByTestId('login-button').click()`：模拟用户点击登录，触发真实接口请求。

#### 4. 断言真实链路结果

- `await expect(page).toHaveURL(/.*\/home/)`：断言路由跳转正确，Playwright的断言为“web-first assertion”，会自动重试直到条件满足或超时，稳定性更高。

- `await expect(page.getByText('欢迎你，陈相')).toBeVisible()`：断言页面展示真实用户信息，验证“前端请求→后端处理→数据库查询→前端渲染”的完整链路。

- `const token = await page.evaluate(() => localStorage.getItem('token'))`：在页面上下文执行JS，获取真实存储的token，验证登录态正常。

#### 5. 与集成测试的核心差异

该示例未mock任何核心接口，完全依赖真实测试环境，测试的是“用户操作→前端→后端→数据库”的完整链路，而非仅前端内部模块的协作，这是E2E测试与集成测试的核心区别。

### Playwright mock接口版（非严格E2E，类似集成测试）

若需用Playwright做前端集成测试（隔离后端依赖），可通过`page.route()`拦截接口，模拟响应，示例如下：

```js
import { test, expect } from '@playwright/test'

test.describe('登录链路测试（mock接口版）', () => {
  test('登录成功后跳转首页并显示欢迎语', async ({ page }) => {
    // mock 登录接口
    await page.route('**/api/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            token: 'mock-token-123'
          }
        })
      })
    })

    // mock 用户信息接口
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

    // 后续操作与真实E2E一致
    await page.goto('http://localhost:3000/login')
    await page.getByTestId('username').fill('test_user')
    await page.getByTestId('password').fill('123456')
    await page.getByTestId('login-button').click()

    await expect(page).toHaveURL(/.*\/home/)
    await expect(page.getByText('欢迎你，陈相')).toBeVisible()

    const token = await page.evaluate(() => localStorage.getItem('token'))
    await expect(token).toBe('mock-token-123')
  })
})
```

说明：该版本虽使用Playwright工具，但因mock了接口，本质仍为前端集成测试，聚焦前端内部模块协作，而非完整链路。

**对应问题**：如何用Playwright编写E2E测试？若需要mock接口，该如何实现？

## 集成测试与E2E测试的核心区别（面试高频）

### 1. 测试范围不同

- 集成测试：聚焦前端内部多个模块的协作，如“表单提交→token存储→路由跳转→页面渲染”，不涉及真实后端逻辑。

- E2E测试：聚焦整个系统的完整业务闭环，从用户操作到后端处理、数据库查询，再到前端渲染，覆盖全链路。

### 2. 对外部依赖的处理不同

- 集成测试：通常mock外部依赖（如接口、第三方SDK），仅保留前端内部模块的真实性，确保测试稳定。

- E2E测试：尽量使用真实依赖（真实接口、真实数据库、真实环境），模拟真实用户场景，验证整条链路的可用性。

### 3. 发现的问题类型不同

- 集成测试：易发现模块对接问题、状态流转问题、路由跳转问题、组件联动问题（单个模块无错，但组合后出错）。

- E2E测试：易发现前后端联调问题、接口契约不一致、数据库数据异常、环境配置问题（代码本身无错，但真实链路跑不通）。

### 4. 执行成本不同

- 集成测试：成本低、执行快、稳定性高、定位问题容易，不依赖真实测试环境，适合日常回归测试。

- E2E测试：成本高、执行慢、易受环境影响、维护成本高、定位问题复杂，适合覆盖核心业务链路（如登录、支付）。

### 5. 通俗理解（面试加分）

集成测试：检查“前端内部这台机器的零件装得对不对，零件之间能不能协同工作”；

E2E测试：检查“整台机器（含前端、后端、数据库）能不能正常运转，能不能满足用户的真实需求”。

两者互补，而非替代：集成测试保障前端内部逻辑的正确性，E2E测试保障整个系统的可用性。

**对应问题**：集成测试和E2E测试的核心区别有哪些？请从测试范围、外部依赖处理、执行成本三个方面说明。

## 面试重点回答总结

### 问题1：请说明单元测试、集成测试、E2E测试的区别

单元测试：测最小功能单元（如函数、组件纯逻辑），隔离所有外部依赖，聚焦自身逻辑正确性，工具用Vitest，适合日常开发中的回归测试。

集成测试：测前端内部多个模块的协作链路，mock非核心依赖（如接口），重点验证模块对接逻辑，工具用Cypress，成本低、稳定性高。

E2E测试：站在用户视角，测整个系统的完整业务链路，尽量使用真实环境和依赖，验证系统真实可用性，工具用Playwright，覆盖核心链路，成本较高。

### 问题2：Cypress集成测试和Playwright E2E测试的核心差异是什么？

Cypress集成测试：mock接口，聚焦前端内部模块协作（如登录表单→token存储→路由跳转），不涉及真实后端，测试前端内部链路是否正常。

Playwright E2E测试：不mock核心接口，访问真实测试环境，使用真实账号，测试“前端→后端→数据库”的完整链路，验证系统在真实场景下的可用性。

### 问题3：为什么单元测试需要mock外部依赖？

单元测试的核心是“只测当前单元”，mock外部依赖的目的是隔离外部干扰，确保测试的可控性、稳定性和可重复性。避免因外部依赖（如接口、路由、本地存储）的不稳定性，导致测试结果异常，无法定位当前单元的逻辑问题。

### 问题4：前端项目中，如何选择三种测试方式？

1. 单元测试：覆盖核心工具函数、业务函数、Hooks，确保单个单元逻辑正确，作为日常开发的基础测试。

2. 集成测试：覆盖前端内部关键协作链路（如登录、表单提交），保障模块间对接正常，适合日常回归。

3. E2E测试：覆盖核心业务闭环（如登录→下单→支付），确保系统真实可用，不适合大面积覆盖，仅聚焦关键链路。

