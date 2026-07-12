# 前端代码质量检测笔记（完整版）

### 一句话结论

前端代码质量检测不是只靠 ESLint 一项工具，而是通过多层机制协同作用，在开发前、提交前、构建时、上线后等各个环节拦截问题，形成全流程质量保障。实践中通常组合使用静态检查、类型检查、代码规范、测试、构建校验、运行时监控等手段，全方位提升代码质量。

**对应问题**：前端代码质量检测的核心思路是什么？实践中主要依靠哪些手段实现全流程保障？

### 代码质量的核心定义

代码质量并非单一维度的概念，而是涵盖规范、潜在 Bug、类型安全、功能正确性、工程质量五个核心层面，每个层面对应不同的问题场景，也是质量检测的重点方向。

#### 规范问题

核心是代码风格统一，减少无意义争议，提升可维护性，常见问题包括：

- 命名不统一（如变量用驼峰、函数用帕斯卡，或反之）；

- 代码格式混乱（缩进不一致、换行不规范）；

- import 导入顺序混乱（未按第三方库、本地模块分类）；

- 符号使用不规范（缺少分号、多余空格、引号混用）；

- 重复代码过多（相同逻辑在多个地方重复编写，未封装复用）。

#### 语法和潜在 Bug

核心是避免代码运行时出现异常，提前发现隐性问题，常见场景包括：

- 变量未定义就使用（如未声明直接赋值）；

- 闭包引用错误（如循环中使用闭包导致变量取值异常）；

- 条件判断逻辑错误（如把 `===` 写成 `==`、逻辑与或混用）；

- Promise 异常未处理（如未写 `catch`，导致报错未捕获）；

- React Hooks 使用不规范（如在条件语句中使用 Hooks、依赖项缺失）；

- Vue 响应式用法错误（如直接修改数组索引、对象属性未触发响应式更新）。

#### 类型安全问题

核心是避免类型不匹配导致的运行时错误，常见于中大型项目，主要问题包括：

- 函数参数类型不明确（如预期传入数字，实际传入字符串）；

- 接口返回值误用（如接口返回数组，却按对象取值）；

- `any` 类型滥用（失去类型校验意义，埋下隐性 Bug）；

- `undefined`/`null` 未处理（如直接访问 `null.xxx`、`undefined.xxx`）。

#### 功能正确性问题

核心是确保代码实现的功能符合预期，避免逻辑偏差，常见场景包括：

- 组件交互不符合预期（如按钮点击未触发回调、表单提交无响应）；

- 表单校验逻辑有漏洞（如必填项未校验、格式校验错误）；

- 异步逻辑出错（如接口请求顺序错误、数据渲染时机偏差）；

- 路由跳转异常（如权限拦截失效、路由参数传递错误）。

#### 工程质量问题

核心是保障开发流程规范，避免因流程疏漏导致线上问题，常见问题包括：

- Git 提交信息不规范（未按约定格式填写，难以追溯提交目的）；

- 构建失败（本地能运行，线上构建报错，如依赖缺失、配置错误）；

- 代码覆盖率低（测试用例不完善，核心逻辑未被覆盖）；

- 线上报错多（未做运行时监控，异常无法及时发现）。

**对应问题**：前端代码质量主要包含哪些层面？每个层面的核心问题的是什么？

### 前端常见的代码质量检测方式（含细节与实践）

#### ESLint：静态代码检查（基础核心）

ESLint 是前端静态代码检查的基础工具，核心作用是提前发现代码中的语法错误、潜在 Bug、不符合规范的写法和最佳实践问题，支持自定义规则，适配不同项目需求。

##### 核心检测范围

- 语法错误：如未定义变量、重复声明、括号不匹配等；

- 潜在风险：如 `eval()` 使用、`with` 语句、未处理的异步错误；

- 代码规范：如命名规则、import 顺序、注释要求；

- 框架适配：如 React Hooks 规则、Vue 模板语法规则；

- 最佳实践：如避免 `var` 声明、优先使用 `const`/`let`、禁止无用代码。

##### 常见配置（适配 TS/JS/Vue 项目）

新建 `eslint.config.js` 文件（ESLint 8.23+ 推荐配置方式），支持多环境、多框架适配：

```javascript
// eslint.config.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vueEslintParser from 'vue-eslint-parser'

export default [
  // 基础 JS 推荐规则
  js.configs.recommended,
  // TS 推荐规则（适配 TypeScript 项目）
  ...tseslint.configs.recommended,
  {
    // 指定检测的文件范围
    files: ['**/*.{js,ts,tsx,vue}'],
    // 解析器配置（适配 Vue 单文件组件）
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        parser: '@typescript-eslint/parser', // TS 解析器
        sourceType: 'module',
        ecmaVersion: 'latest'
      }
    },
    // 自定义规则（优先级高于推荐规则）
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // 忽略下划线开头的参数
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off', // 生产环境禁止 console
      'eqeqeq': 'error', // 强制使用 ===/!==，避免隐式类型转换
      'no-var': 'error', // 禁止使用 var 声明变量
      'prefer-const': 'error', // 优先使用 const（值不变的变量）
      '@typescript-eslint/no-explicit-any': 'warn' // 警告 any 类型使用
    }
  }
]

```

##### 常用命令（package.json 配置）

```json
{
  "scripts": {
    // 检测 src 目录下指定后缀的文件
    "lint": "eslint src --ext .js,.ts,.tsx,.vue",
    // 自动修复可修复的 lint 错误（如格式问题、简单语法问题）
    "lint:fix": "eslint src --ext .js,.ts,.tsx,.vue --fix"
  }
}
```

##### 实践细节

1. 忽略不需要检测的文件：新建 `.eslintignore` 文件，写入不需要检测的路径，如 `node_modules/`、`dist/`、`*.config.js`；

2. 规则优先级：自定义规则 > 推荐规则，可根据项目需求调整规则级别（`error`：阻断提交/构建；`warn`：仅警告，不阻断）；

3. 框架适配：Vue 项目需安装 `vue-eslint-parser`、`eslint-plugin-vue`，React 项目需安装 `eslint-plugin-react`、`eslint-plugin-react-hooks`。

**对应问题**：ESLint 的核心作用是什么？如何配置适配 TS+Vue 项目的 ESLint 规则？常用命令有哪些？

#### Prettier：代码格式统一（辅助规范）

Prettier 专注于代码格式统一，不负责检测语法错误或潜在 Bug，核心价值是减少团队因代码格式产生的争议，让 Code Review 更聚焦逻辑本身，而非格式细节。

##### 核心作用范围

- 缩进统一（如 2 空格/4 空格）；

- 引号统一（单引号/双引号）；

- 换行统一（如每行最大长度、语句末尾换行）；

- 尾逗号统一（如对象、数组末尾是否加逗号）；

- 其他格式：如箭头函数括号、空格使用、注释格式等。

##### 常见配置（.prettierrc 或 prettier.config.js）

```json
{
  "singleQuote": true, // 统一使用单引号
  "semi": false, // 语句末尾不加分号
  "trailingComma": "es5", // 仅在 ES5 允许的场景加尾逗号（对象、数组）
  "printWidth": 120, // 每行最大长度 120 字符
  "tabWidth": 2, // 缩进 2 空格
  "useTabs": false, // 不使用 Tab 缩进
  "arrowParens": "avoid", // 箭头函数只有一个参数时省略括号
  "proseWrap": "never", // 不自动换行（避免影响代码可读性）
  "htmlWhitespaceSensitivity": "ignore" // 忽略 HTML 空格敏感度
}
```

##### 常用命令（package.json 配置）

```json
{
  "scripts": {
    // 格式化所有文件（排除 .prettierignore 中的文件）
    "format": "prettier --write .",
    // 检查文件格式是否符合规范（不自动修复）
    "format:check": "prettier --check ."
  }
}
```

##### 实践细节（解决 ESLint 与 Prettier 冲突）

ESLint 部分规则（如缩进、引号）与 Prettier 冲突，需安装 `eslint-config-prettier` 和 `eslint-plugin-prettier`，将 Prettier 规则集成到 ESLint 中，统一校验：

```javascript
// eslint.config.js 中添加 Prettier 配置
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  // ... 其他配置
  prettierConfig, // 禁用 ESLint 中与 Prettier 冲突的规则
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error' // 将 Prettier 格式问题设为 error 级别
    }
  }
]
```

**对应问题**：Prettier 与 ESLint 的核心区别是什么？如何解决两者的规则冲突？

#### TypeScript：类型检查（中大型项目必备）

TypeScript 是 JavaScript 的超集，核心作用是提供静态类型校验，提前发现类型不匹配问题，提升代码可维护性和可读性，尤其适合多人协作的中大型项目。

##### 核心解决的问题

- 参数/返回值类型不匹配（如函数预期传入数字，实际传入字符串）；

- 接口返回值误用（如接口返回 `{ name: string }`，却按 `{ username: string }` 取值）；

- 可空值未处理（如 `null`/`undefined` 未做判空，直接访问属性）；

- 组件 Props 类型不清晰（如 Vue/React 组件 Props 未定义类型，传参混乱）；

- 代码重构风险（如修改函数参数类型，未同步修改所有调用处）。

##### 基础示例（类型校验效果）

```typescript
// 定义函数，指定参数和返回值类型
function add(a: number, b: number): number {
  return a + b
}

// 正确调用：参数类型匹配
add(1, 2) // 正常执行，返回 3

// 错误调用：第二个参数为字符串，TS 会直接报错（静态检查阶段）
add(1, '2') // 报错：Argument of type 'string' is not assignable to parameter of type 'number'
```

##### 常用命令（package.json 配置）

```json
{
  "scripts": {
    // 仅做类型校验，不生成构建产物（推荐用于 CI/提交前校验）
    "type-check": "tsc --noEmit",
    // 类型校验并生成构建产物（开发/构建阶段使用）
    "tsc": "tsc"
  }
}
```

##### 实践细节

1. `--noEmit` 参数说明：仅执行类型检查，不生成 `.js` 或 `.d.ts` 文件，避免冗余产物，适合用于质量检测环节；

2. 配置文件 `tsconfig.json`：核心配置 `strict: true`（开启严格模式，强制进行类型校验）、`target`（指定编译目标版本）、`include`/`exclude`（指定检测文件范围）；

3. 避免 `any` 滥用：尽量使用具体类型、联合类型、泛型替代 `any`，如需临时忽略类型校验，可使用 `// @ts-ignore` 注释（谨慎使用）；

4. 接口类型定义：对于接口返回值、组件 Props，优先使用 `interface` 或 `type` 定义类型，提升可读性。

**对应问题**：TypeScript 在代码质量检测中的核心作用是什么？`tsc --noEmit` 命令的作用是什么？实践中如何避免 `any` 滥用？

#### Stylelint：样式质量检测（样式规范）

Stylelint 是专门用于检测 CSS/SCSS/Less 样式文件的工具，核心作用是规范样式写法、避免样式错误，提升样式代码的可维护性，尤其适合样式文件较多的项目。

##### 核心检测范围

- 语法错误：如非法 CSS 属性、无效选择器、括号不匹配；

- 规范问题：如选择器命名不统一、样式属性顺序混乱；

- 冗余问题：如重复选择器、重复样式属性；

- 性能问题：如过深的选择器嵌套（影响渲染性能）；

- 最佳实践：如禁止使用 `!important`、避免无效单位（如 `px` 用于字体大小之外的场景）。

##### 常见配置（stylelint.config.js）

```javascript
module.exports = {
  // 继承官方推荐规则
  extends: [
    'stylelint-config-standard', // 基础 CSS 推荐规则
    'stylelint-config-standard-scss' // SCSS 推荐规则（如需支持 SCSS）
  ],
  // 自定义规则
  rules: {
    'color-no-invalid-hex': true, // 禁止无效的十六进制颜色
    'declaration-block-no-duplicate-properties': true, // 禁止声明块中重复的属性
    'selector-max-depth': 4, // 选择器最大嵌套深度为 4
    'declaration-block-single-line-max-declarations': 1, // 单行声明块最多一个属性
    'no-unknown-animations': true, // 禁止未知的动画名称
    'selector-no-vendor-prefix': true, // 禁止选择器使用厂商前缀
    'property-no-vendor-prefix': [true, { ignoreProperties: ['box-sizing'] }] // 忽略特定属性的厂商前缀
  },
  // 指定检测的文件范围
  files: ['src/**/*.{css,scss,less,vue}'],
  // 忽略不需要检测的文件
  ignoreFiles: ['node_modules/**/*.css', 'dist/**/*.css']
}
```

##### 常用命令（package.json 配置）

```json
{
  "scripts": {
    // 检测样式文件
    "lint:style": "stylelint \"src/**/*.{css,scss,less,vue}\"",
    // 自动修复可修复的样式错误
    "lint:style:fix": "stylelint \"src/**/*.{css,scss,less,vue}\" --fix"
  }
}
```

**对应问题**：Stylelint 的核心作用是什么？常见的样式检测规则有哪些？如何配置适配 SCSS 和 Vue 项目？

#### 测试：功能正确性检测（核心保障）

静态检查（ESLint/TS）只能发现代码写法问题，无法保证功能逻辑正确，测试则是验证功能正确性的核心手段，分为单元测试、组件测试、E2E 测试三个层面，覆盖不同的测试场景。

##### 单元测试（验证独立逻辑）

核心是测试独立的函数、工具类、Hooks 等，验证其输入输出是否符合预期，常用工具：Jest、Vitest（Vite 生态，更快）。

测试场景：工具函数、自定义 Hooks、表单校验逻辑、边界条件（如空值、异常输入）。

```typescript
// 示例：测试工具函数 sum（Vitest）
import { describe, it, expect } from 'vitest'
import { sum } from './utils/sum'

// 测试套件（描述要测试的模块）
describe('sum 工具函数', () => {
  // 测试用例（单个测试场景）
  it('两个正数相加，返回正确结果', () => {
    expect(sum(1, 2)).toBe(3)
  })

  it('正数与负数相加，返回正确结果', () => {
    expect(sum(5, -3)).toBe(2)
  })

  it('传入非数字参数，返回 0', () => {
    // @ts-ignore 临时忽略类型校验，测试异常场景
    expect(sum(1, '2')).toBe(0)
  })
})
```

##### 组件测试（验证组件交互）

核心是测试 Vue/React 组件的渲染效果和交互逻辑，验证组件在不同状态下的表现是否符合预期，常用工具：Vitest + Testing Library、Jest + React Testing Library。

测试场景：组件渲染是否正常、按钮点击是否触发回调、输入框输入是否更新状态、异步数据加载后是否渲染。

```vue
// 示例：Vue 组件测试（Vitest + @testing-library/vue）
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import Button from './Button.vue'

describe('Button 组件', () => {
  it('渲染按钮，显示正确文本', () => {
    render(Button, { props: { label: '提交' } })
    // 验证按钮文本是否存在
    expect(screen.getByText('提交')).toBeInTheDocument()
  })

  it('点击按钮，触发 click 回调', async () => {
    const mockClick = vi.fn() // 模拟回调函数
    render(Button, { props: { label: '提交', onClick: mockClick } })
    
    // 模拟点击按钮
    await fireEvent.click(screen.getByText('提交'))
    // 验证回调函数被调用
    expect(mockClick).toHaveBeenCalledTimes(1)
  })
})
```

##### E2E 测试（验证业务流程）

核心是模拟真实用户操作，验证完整的业务流程是否正常，覆盖从页面跳转、表单提交到数据展示的全流程，常用工具：Playwright、Cypress。

测试场景：用户登录、表单提交、路由跳转、权限拦截、下单流程等核心业务流程。

```javascript
// 示例：Playwright 测试登录流程
import { test, expect } from '@playwright/test'

test('登录流程：输入正确账号密码，跳转至首页', async ({ page }) => {
  // 1. 访问登录页
  await page.goto('/login')

  // 2. 输入账号密码
  await page.fill('#username', 'test-user')
  await page.fill('#password', 'test-123456')

  // 3. 点击登录按钮
  await page.click('button[type="submit"]')

  // 4. 验证是否跳转至首页
  await expect(page).toHaveURL('/home')
  // 验证首页是否显示用户信息
  await expect(page.getByText('欢迎您，test-user')).toBeVisible()
})
```

##### 实践细节

1. 测试覆盖率：通过 `vitest --coverage` 或 `jest --coverage` 查看测试覆盖率，核心逻辑覆盖率建议不低于 80%；

2. 测试优先级：优先测试核心逻辑（如工具函数、表单校验、登录流程），再测试非核心逻辑；

3. 异步测试：对于异步逻辑（如接口请求），需使用 `async/await` 或 `done` 回调，确保测试等待异步操作完成。

**对应问题**：前端测试分为哪几个层面？每个层面的核心测试场景是什么？常用的测试工具有哪些？

#### Git Hooks：提交前拦截（流程前置）

Git Hooks 用于在 Git 操作（如 commit、push）前执行指定脚本，提前拦截不符合质量要求的代码，避免问题代码进入代码仓库，常用方案：Husky + lint-staged。

##### 核心作用

在 `git commit` 前自动执行 ESLint、Prettier、Stylelint 等校验，只校验本次改动的文件，提升效率，避免开发者手动遗漏校验步骤。

##### 配置步骤与示例

1. 安装依赖：

```bash
npm install husky lint-staged --save-dev
```

2. 启用 Husky：

```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

3. 配置 lint-staged（package.json 中添加）：

```json
{
  "lint-staged": {
    // 匹配 JS/TS/TSX/Vue 文件，执行 ESLint 修复和 Prettier 格式化
    "*.{js,ts,tsx,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    // 匹配 CSS/SCSS/Less 文件，执行 Stylelint 修复和 Prettier 格式化
    "*.{css,scss,less}": [
      "stylelint --fix",
      "prettier --write"
    ],
    // 匹配 JSON/MD 文件，仅执行 Prettier 格式化
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

##### 实践细节

1. 仅校验改动文件：lint-staged 只会处理本次 `git add` 的文件，避免全量校验耗时过长；

2. 阻断提交：若校验失败（如存在无法自动修复的 ESLint 错误），会阻断 `git commit`，需开发者手动修复后再提交；

3. 扩展配置：可在 pre-commit 钩子中添加 `npm run type-check`（视项目大小，小型项目可省略，避免提交过慢）。

**对应问题**：Git Hooks 在代码质量检测中的作用是什么？如何通过 Husky + lint-staged 实现提交前校验？

#### CI：流程固化（兜底保障）

CI（持续集成）是将代码质量检测流程固化到项目部署流程中的核心手段，通过 CI 工具（如 GitHub Actions、GitLab CI）在代码合并（PR/Merge）前执行全量质量检测，确保主分支代码质量，避免“本地能跑，线上挂掉”的问题。

##### 核心检测流程（CI 执行步骤）

1. 安装依赖：`npm install` 或 `pnpm install`；

2. 静态检查：`npm run lint`（ESLint）、`npm run lint:style`（Stylelint）；

3. 类型检查：`npm run type-check`（TypeScript）；

4. 测试：`npm run test`（单元测试/组件测试）；

5. 构建校验：`npm run build`（验证构建是否正常，避免构建失败）。

##### 示例配置（GitHub Actions，.github/workflows/ci.yml）

```yaml
name: 前端代码质量检测 CI

on:
  # 当有 PR 提交到 main 分支时触发
  pull_request:
    branches: [main]
  # 当代码合并到 main 分支时触发
  push:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      # 1. 拉取代码
      - name: 拉取代码
        uses: actions/checkout@v4

      # 2. 安装 Node.js
      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      # 3. 安装依赖
      - name: 安装依赖
        run: npm install

      # 4. ESLint 校验
      - name: ESLint 静态检查
        run: npm run lint

      # 5. Stylelint 校验
      - name: Stylelint 样式检查
        run: npm run lint:style

      # 6. TypeScript 类型检查
      - name: TypeScript 类型校验
        run: npm run type-check

      # 7. 单元测试
      - name: 执行单元测试
        run: npm run test

      # 8. 构建校验
      - name: 验证构建
        run: npm run build
```

##### 核心价值

- 标准化流程：确保所有开发者提交的代码都经过统一的质量检测，避免人为遗漏；

- 主分支兜底：阻止不符合质量要求的代码合并到主分支，保障主分支稳定性；

- 减少线上问题：提前发现构建失败、测试不通过等问题，避免上线后暴露。

**对应问题**：CI 在前端代码质量检测中的核心作用是什么？CI 流程中通常包含哪些质量检测步骤？

#### SonarQube / Code Review：团队级质量治理

适合中大型团队，用于更高级的质量分析和团队协作治理，补充基础检测工具的不足，实现全方位质量管控。

##### SonarQube 核心功能

- 重复代码检测：识别项目中重复的代码片段，提示封装复用；

- 圈复杂度分析：检测代码逻辑复杂度（如 if-else 嵌套过深），提示简化逻辑；

- 可维护性评估：根据代码结构、注释率等指标，评估代码可维护性；

- 安全风险检测：识别潜在的安全漏洞（如 XSS 风险、敏感信息泄露）；

- 测试覆盖率统计：整合单元测试覆盖率数据，监控测试完善度；

- Bug 风险预警：根据代码写法，预警潜在的 Bug（如空指针、逻辑错误）。

##### Code Review 规范

SonarQube 是工具层面的治理，Code Review 则是人工层面的质量把控，核心规范包括：

- 代码提交前，需指定至少 1 名同事进行 Review；

- Review 重点：逻辑正确性、代码规范、性能优化、安全性、可维护性；

- 发现问题后，需提交者修改完善，再重新 Review，直至通过；

- 定期开展团队 Code Review 复盘，总结常见问题，优化团队规范。

**对应问题**：SonarQube 在代码质量检测中的核心作用是什么？中大型团队如何结合 SonarQube 和 Code Review 实现质量治理？

#### 运行时监控：线上质量补充（闭环保障）

前面的检测手段均聚焦于“上线前”，而部分问题（如浏览器兼容性、偶发资源加载失败）只有在线上真实用户环境中才会暴露，运行时监控则用于补充线上异常发现，形成“上线前检测 + 上线后监控”的完整闭环。

##### 核心监控场景

- JS 运行时错误（如 `Uncaught TypeError`）；

- Promise 未处理异常（如接口请求失败未 `catch`）；

- 资源加载失败（如 JS/CSS/图片加载 404、CDN 失效）；

- 浏览器兼容性问题（如某些 API 在低版本浏览器中不支持）；

- 页面性能问题（如首屏加载过慢、白屏、长任务阻塞）；

- 接口异常（如接口超时、返回错误状态码）。

##### 核心监控代码（基础版）

```javascript
// 1. 监听全局 JS 运行时错误
window.onerror = function (message, source, lineno, colno, error) {
  // 收集错误信息（实际项目中需上报至监控平台，如 Sentry）
  console.log('JS 运行时错误:', {
    message: message.toString(),
    source: source, // 错误所在文件路径
    line: lineno, // 错误行号
    column: colno, // 错误列号
    stack: error?.stack // 错误堆栈（便于定位问题）
  });
  // 阻止浏览器默认报错提示
  return true;
};

// 2. 监听未处理的 Promise 异常（如接口请求失败未 catch）
window.addEventListener('unhandledrejection', (event) => {
  console.log('Promise 未处理异常:', {
    reason: event.reason, // 异常原因
    promise: event.promise // 对应的 Promise 对象
  });
  // 阻止浏览器默认报错提示
  event.preventDefault();
});

// 3. 监听资源加载失败（JS、CSS、图片等）
window.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    // 筛选出有 src 或 href 的资源（排除非资源类错误）
    if (target && (target.src || target.href)) {
      console.log('资源加载失败:', {
        url: target.src || target.href,
        tagName: target.tagName, // 资源标签（如 script、link、img）
        status: target.status // 加载状态（部分资源有）
      });
    }
  },
  true // 捕获阶段监听，避免冒泡导致遗漏
);

// 4. 监听页面白屏（补充页面性能异常）
let whiteScreenTimer = setTimeout(() => {
  const body = document.body;
  // 若页面加载 3 秒后，body 仍无内容，判定为白屏
  if (body.innerHTML.trim() === '' || body.clientHeight === 0) {
    console.log('页面可能出现白屏');
    // 上报白屏异常
  }
}, 3000);
```

##### 实践细节

1. 监控平台集成：实际项目中，不会只打印日志，而是将异常上报至专业监控平台（如 Sentry、Fundebug），便于查看异常趋势、定位问题；

2. 异常分级：将异常分为致命错误（如页面崩溃）、严重错误（如核心功能异常）、普通警告（如非核心资源加载失败），优先处理致命和严重错误；

3. 用户环境采集：上报异常时，同步采集用户浏览器版本、设备类型、系统版本等信息，便于定位兼容性问题。

**对应问题**：运行时监控在代码质量检测中的作用是什么？常见的线上异常监控场景有哪些？如何实现基础的运行时异常监听？

### 实践落地方案（项目实战版）

结合前面的检测手段，形成“本地开发 → 提交前 → CI → 线上监控”的全流程落地方案，适配大多数前端项目，尤其适合中大型团队协作。

#### 方案一：本地开发阶段（即时反馈）

核心是让开发者在写代码时就能获得即时反馈，提前发现问题，减少后续修改成本：

- 编辑器配置：VS Code 安装 ESLint、Prettier、Stylelint 插件，开启“保存自动格式化”“实时 lint 报错提示”；

- TypeScript 实时校验：开启 TS 实时报错，在编写代码时及时发现类型问题；

- 本地调试：开发过程中，定期执行 `npm run lint:fix`、`npm run format`，确保代码规范；

- 本地测试：编写完核心逻辑后，执行单元测试，验证功能正确性。

#### 方案二：提交前拦截（前置过滤）

通过 Husky + lint-staged 拦截问题代码，避免低级错误进入代码仓库：

- 提交前自动执行：ESLint 修复、Prettier 格式化、Stylelint 修复；

- 可选配置：中大型项目可添加 `type-check`，小型项目可省略，提升提交速度；

- 异常处理：若校验失败，阻断提交，提示开发者手动修复后再提交。

#### 方案三：CI 阶段兜底（流程固化）

通过 CI 工具执行全量质量检测，确保主分支代码质量：

- 全量校验：执行 ESLint、Stylelint、TypeScript 类型检查，确保无遗漏；

- 测试验证：执行单元测试、组件测试，确保核心功能正常；

- 构建校验：执行 `npm run build`，验证构建是否正常，避免线上构建失败；

- 结果反馈：CI 执行失败时，通知提交者和 Review 者，修改后重新提交。

#### 方案四：线上监控补充（闭环保障）

上线后通过监控平台采集异常，及时发现线上问题，形成闭环：

- 异常采集：集成监控平台（如 Sentry），采集 JS 错误、Promise 异常、资源加载失败等；

- 异常分析：定期查看监控数据，分析异常原因（如兼容性问题、接口异常）；

- 问题修复：针对高频异常，及时修复代码，发布补丁版本；

- 复盘优化：总结线上异常，优化上线前检测流程（如补充对应测试用例）。

**对应问题**：前端代码质量检测的全流程落地方案包含哪些阶段？每个阶段的核心任务是什么？

### 面试高频回答（可直接使用）

前端代码质量检测我一般会分成多个层次协同落地，不是单一工具能解决的。首先是静态检查层，用 ESLint 检查语法错误、潜在 Bug 和团队规范，用 Prettier 统一代码格式，用 Stylelint 规范样式写法，这一层主要解决“代码写得规范、无明显错误”的问题。

其次是类型检查层，使用 TypeScript 做静态类型校验，尤其是中大型项目，能有效避免类型不匹配、接口误用、可空值未处理等问题，提升代码可维护性。

再往上是测试层，单元测试验证工具函数、Hooks 等独立逻辑，组件测试验证组件交互，E2E 测试验证核心业务流程，这一层能保证“功能逻辑正确”，弥补静态检查的不足。

工程流程上，我会用 Husky + lint-staged 在提交前拦截问题代码，再通过 CI 工具固化全量检测流程，确保主分支质量，避免“本地能跑、线上挂掉”。最后，通过运行时监控采集线上异常，比如 JS 报错、资源加载失败等，因为有些问题只有真实用户环境才会暴露，这样形成“上线前检测 + 上线后监控”的完整闭环。

整体来说，我理解的代码质量检测是多层防线，每个工具和流程都有其侧重点，协同作用才能全方位保障代码质量。

### 面试精简背诵版（易记版）

#### 核心思路

前端代码质量检测分四层，层层递进，形成全流程保障：

- 规范检查：ESLint（语法、规范）、Prettier（格式）、Stylelint（样式）；

- 类型检查：TypeScript（静态类型，避免类型错误）；

- 功能检查：单元测试（独立逻辑）、E2E 测试（业务流程）；

- 流程保障：Husky + lint-staged（提交前）、CI（主分支兜底）、线上监控（闭环）。

#### 关键工具与作用

- ESLint：查语法风险、坏味道、最佳实践；

- Prettier：统一代码格式，减少争议；

- TypeScript：类型安全，避免类型不匹配；

- Stylelint：样式规范，避免样式错误；

- 测试工具：Vitest/Jest（单元/组件测试）、Playwright/Cypress（E2E 测试）；

- 流程工具：Husky + lint-staged（提交前校验）、CI（流程固化）；

- 监控工具：Sentry（线上异常采集）。

#### 关键代码（面试常考）

##### 1. TypeScript 类型检查命令

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

##### 2. 提交前校验（lint-staged 配置）

```json
{
  "lint-staged": {
    "*.{js,ts,tsx,vue}": ["eslint --fix", "prettier --write"]
  }
}
```

##### 3. 线上异常捕获核心代码

```javascript
// 监听全局 JS 错误
window.onerror = function(message, source, lineno, colno, error) {
  console.log('JS 错误:', message, error?.stack);
  return true;
};

// 监听未处理 Promise 异常
window.addEventListener('unhandledrejection', (event) => {
  console.log('Promise 异常:', event.reason);
  event.preventDefault();
});
```

#### 处理思路（精简版）

- 规范/类型/功能：用 ESLint、TS、测试工具提前发现问题；

- 流程保障：提交前拦截、CI 兜底，确保问题不进主分支；

- 线上闭环：运行时监控，及时发现并修复线上异常。

**对应问题**：请简要说明前端代码质量检测的核心思路、关键工具及处理流程（面试
> （注：文档部分内容可能由 AI 生成）