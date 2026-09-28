# 代码开发过程中的版本管理笔记

## 一、版本管理的核心思路

代码版本管理的目的，不只是“保存代码”，而是让团队能够安全、清晰、可回退地协作开发。

在实际开发中，版本管理主要解决以下问题：

1. **避免代码丢失：** 本地修改、分支提交、远程推送都可以形成不同层级的保护。
2. **避免影响主分支稳定性：** 功能开发、问题修复、实验性代码都应该在独立分支完成，确认无问题后再合并。
3. **避免多人协作冲突扩大：** 开发过程中要经常同步主分支，减少后期一次性合并时的大量冲突。
4. **让代码变更可追踪、可回滚：** 每次提交都应该有明确目的，提交信息要能说明这次修改解决了什么问题。
5. **让协作者和 AI 更容易理解代码演进：** 清晰的分支、提交和合并记录，可以降低后续排查、回滚和二次开发成本。

## 二、版本管理的基本原则

### 1. 开发前先同步主分支

不要基于过旧的代码开始开发，否则后续合并时容易出现大量冲突。

```bash
git checkout master
git pull origin master
```

### 2. 每个需求使用独立分支

不要直接在主分支上开发。

推荐分支命名：

```text
feature/xxx     # 新功能
fix/xxx         # 问题修复
hotfix/xxx      # 紧急修复
refactor/xxx    # 重构
test/xxx        # 测试相关
chore/xxx       # 工程配置、依赖调整
```

例如：

```text
feature/sensitive-permission
fix/level-info-mask
refactor/render-value
```

### 3. 提交要小而清晰

一次提交最好只解决一个明确问题。

不推荐：

```bash
git commit -m "update"
git commit -m "fix bug"
```

推荐：

```bash
git commit -m "feat: add sensitive field mask logic"
git commit -m "fix: correct level info permission fallback"
git commit -m "refactor: extract common render value helper"
```

### 4. 合并前先自查

提交和合并前至少检查：

```bash
git status
git diff
git log --oneline -5
```

重点检查：

- 是否提交了不该提交的调试代码；
- 是否包含临时 mock、`console.log`、`debugger`；
- 是否误提交配置文件、日志文件、构建产物；
- 是否存在格式化问题；
- 是否通过测试、lint、prettier、git hook。

### 5. 谨慎使用危险命令

以下命令可能导致代码丢失：

```bash
git reset --hard
git clean -fd
git push --force
```

使用前建议先备份：

```bash
git stash push -m "backup before dangerous operation"
```

或者创建临时备份分支：

```bash
git checkout -b backup/my-work
```

## 三、常用开发场景与 Git 指令

### 场景 1：开始一个新需求

#### 场景说明

当接到一个新需求时，不应该直接在 `master` 上修改代码，而是应该基于最新主分支创建功能分支。

#### 推荐流程

```bash
git checkout master
git pull origin master
git checkout -b feature/xxx
```

新版 Git 可以使用：

```bash
git switch master
git pull origin master
git switch -c feature/xxx
```

如果想直接基于远程 `origin/master` 创建新分支，也可以：

```bash
git fetch origin
git switch -c feature/xxx origin/master
```

**管理思路：** 这个流程保证新分支基于最新主干代码，减少后续合并冲突。

### 场景 2：查看当前代码状态

#### 场景说明

在提交、切分支、合并、回滚之前，都应该先查看当前状态。

#### 常用命令

```bash
# 查看当前修改
git status

# 查看具体修改内容
git diff

# 查看已经暂存的修改
git diff --cached

# 查看当前分支
git branch --show-current

# 查看最近提交记录
git log --oneline -10
```

**管理思路：** 很多 Git 问题都来自于“不知道自己当前在哪个分支、不知道本地改了什么”。

所以在关键操作前，建议先执行：

```bash
git status
```

### 场景 3：日常开发中提交代码

#### 场景说明

完成一部分功能后，需要将代码提交到本地版本库。

#### 推荐流程

```bash
# 1. 查看修改
git status
git diff

# 2. 添加文件
git add .

# 3. 提交代码
git commit -m "feat: add xxx"

# 4. 查看提交结果
git log --oneline -5
```

#### 更精细的提交方式

```bash
# 只添加某个文件
git add path/to/file

# 交互式选择部分代码提交
git add -p
```

**管理思路：** 不要把多个无关修改混在一次提交里。

例如，“修复权限判断”和“重构样式组件”最好拆成两个 commit，这样后续回滚或 review 更清晰。

### 场景 4：第一次推送本地分支到远程

#### 场景说明

本地新建的功能分支开发完成后，需要推送到远程仓库，方便创建 MR / PR 或让其他人查看。

#### 指令

```bash
git push -u origin feature/xxx
```

之后再次推送时，只需要：

```bash
git push
```

**管理思路：** `-u` 的作用是建立本地分支和远程分支的追踪关系。建立关系后，后续执行 `git pull` 和 `git push` 就不需要每次指定远程分支名。

### 场景 5：继续开发前同步远程代码

#### 场景说明

多人协作时，远程分支可能已经有新的提交。继续开发前，最好先同步。

常见方式：

```bash
# 同步当前分支对应的远程分支
git pull

# 指定远程分支同步
git pull origin feature/xxx

# 只获取远程信息，不直接合并
git fetch origin

# 查看远程分支状态
git branch -a
```

#### 补充：`git fetch` 与 `git pull`

**管理思路：** `git fetch` 更安全，因为它只更新远程引用，不会直接改动当前代码。执行后，当前工作区文件通常不会立刻变化，更新的是 `origin/xxx` 这类远程跟踪分支；例如你当前在 `feature/xxx`，执行 `git fetch origin` 后，真正变化的通常是 `origin/feature/xxx` 或 `origin/master`，而不是你本地正在开发的 `feature/xxx`。相对地，`git pull` 本质上是先 `fetch`，再自动 `merge` 或 `rebase`，会直接尝试把远程变更合入当前分支，因此可能立刻带来代码变更、冲突或提交历史变化。

如果只是想先看远程更新了什么，可以在 `fetch` 之后继续检查：

```bash
# 查看当前分支相比远程少了哪些提交
git log --oneline HEAD..origin/feature/xxx

# 查看当前分支与远程分支的具体差异
git diff HEAD..origin/feature/xxx
```

确认远程变更没有问题后，再根据团队规范决定：

```bash
git merge origin/feature/xxx
```

或者：

```bash
git rebase origin/feature/xxx
```

如果你的目标是同步主分支，通常也是同样思路：先 `git fetch origin`，再执行 `git merge origin/master` 或 `git rebase origin/master`。这样比直接 `git pull` 更容易看清远程到底改了什么，也更方便在多人协作时控制合并节奏。

### 场景 6：功能分支同步最新主分支

#### 场景说明

开发过程中，主分支可能已经有其他人合入的新代码。为了减少最终合并冲突，需要定期把主分支更新同步到自己的功能分支。

假设当前在：

```text
feature/xxx
```

常见方式：

```bash
# 使用 merge 同步 master
git fetch origin
git merge origin/master

# 使用 rebase 同步 master
git fetch origin
git rebase origin/master
```

**管理思路：** 个人功能分支同步主干时，通常推荐：

```bash
git fetch origin
git rebase origin/master
```

但如果团队明确要求使用 merge，就按照团队规范执行。

#### 补充：`git merge` 和 `git rebase`

`git merge` 和 `git rebase` 都能把 `master` 的新提交同步到功能分支，但它们的合并模型不同。

一句话区分：

- `merge`：合并两个分支的最终结果，保留分叉和合并记录。
- `rebase`：把当前分支上的提交按顺序重新放到目标分支后面，让历史更线性。

| 对比点 | `git merge` | `git rebase` |
| --- | --- | --- |
| 合并方式 | 合并两个分支的最终快照 | 一个 commit 一个 commit 重新应用 |
| 是否改写历史 | 不改写历史 | 会改写当前分支 commit hash |
| 是否产生 merge commit | 通常会产生 | 不产生 merge commit |
| 历史形态 | 保留分叉和合并记录 | 历史更线性 |
| 冲突表现 | 通常一次性暴露冲突 | 可能每个 commit 都出现冲突 |
| 适合场景 | 公共分支、保留真实协作历史 | 个人 feature 分支同步主干 |

##### 基础分支模型

假设一开始从 `master` 拉出 `feature/login`，之后两个分支都继续开发：

```text
A --- B          master
 \
  C --- D        feature/login
```

含义：

- `A`：共同祖先。
- `B`：`master` 上的新提交。
- `C`、`D`：功能分支上的新提交。

此时在 `feature/login` 上同步 `master`，可以选择 `merge` 或 `rebase`。

##### 使用 `git merge`

```bash
git checkout feature/login
git fetch origin
git merge origin/master
```

合并后的历史通常类似：

```text
A --- B -------- M    feature/login
 \              /
  C --- D ------
```

`M` 是新的 merge commit，表示把 `feature/login` 的最终状态和 `master` 的最终状态合在一起。

`merge` 的本质是三方合并：

```text
base   = A，也就是共同祖先
ours   = D，也就是当前 feature/login
theirs = B，也就是 origin/master
```

Git 会比较 `A -> D` 和 `A -> B` 的变化。如果两边修改了同一文件的同一区域，就可能产生冲突。

##### 使用 `git rebase`

```bash
git checkout feature/login
git fetch origin
git rebase origin/master
```

rebase 后的历史类似：

```text
A --- B --- C' --- D'    feature/login
```

注意：`C'` 和 `D'` 不是原来的 `C` 和 `D`。代码内容可能相同，但 commit hash 已经变了。

`rebase` 的本质不是一次性合并最终结果，而是按顺序重放当前分支的提交：

```text
先把 C 应用到 B 后面
再把 D 应用到 C' 后面
```

可以近似理解为：

```bash
git cherry-pick C
git cherry-pick D
```

所以 `rebase` 的冲突不是一次性比较 `D` 和 `B`，而是每个 commit 重新应用时都可能冲突。

##### 为什么两者的冲突文件可能不同

核心原因：

- `merge` 看两个分支的最终状态。
- `rebase` 看当前分支上的每一个 commit。

常见差异有三类：

1. **中间提交导致冲突**

   `feature` 的中间 commit 改过某个文件，即使后续又改回去了，`merge` 可能因为最终结果没变化而不冲突；但 `rebase` 重放中间 commit 时仍然可能冲突。

2. **冲突分批出现**

   `merge` 一次性比较最终结果，可能一次显示多个冲突文件；`rebase` 按 commit 顺序重放，可能先冲突一个文件，执行 `git rebase --continue` 后再冲突另一个文件。

3. **重命名路径不同**

   如果 `master` 重命名了文件，而 `feature` 还在旧路径修改，`merge` 可能把冲突落到新路径；`rebase` 在重放旧提交时，可能提示旧路径被删除或修改。

##### `ours` 和 `theirs` 的含义

这是解决冲突时最容易误判的地方。

在 `merge` 中，假设你在 `feature` 分支执行：

```bash
git merge master
```

含义是：

```text
ours   = 当前分支 feature
theirs = 被合并进来的 master
```

因此：

```bash
# 保留 feature 版本
git checkout --ours file.js

# 保留 master 版本
git checkout --theirs file.js
```

在 `rebase` 中，假设你在 `feature` 分支执行：

```bash
git rebase master
```

rebase 会先切到 `master` 的最新状态，再把 `feature` 的提交一个个应用上来。因此冲突时：

```text
ours   = 当前基底，也就是 master
theirs = 正在被重放的 feature commit
```

所以：

```bash
# 保留 master 版本
git checkout --ours file.js

# 保留当前正在重放的 feature commit 版本
git checkout --theirs file.js
```

不要机械地理解成「ours = 我的代码，theirs = 别人的代码」。在 `rebase` 冲突里，这个直觉经常是反的。

##### `git rebase --continue` 后是否还会冲突

会。`git rebase --continue` 只表示当前这个 commit 的冲突已经处理完，Git 会继续重放下一个 commit。

例如：

```text
A --- B --- C              master
 \
  D --- E --- F            feature
```

在 `feature` 上执行：

```bash
git rebase master
```

Git 实际会依次执行类似操作：

```bash
git cherry-pick D
git cherry-pick E
git cherry-pick F
```

如果 `D` 冲突，你解决后执行：

```bash
git add .
git rebase --continue
```

Git 只是继续应用 `E`。如果 `E` 也修改了 `master` 改过的区域，就会再次冲突。

如果每次冲突都选择 `master` 版本，最终结果会更接近 `master`，`feature` 中相关冲突改动可能被丢弃。这个操作适合明确放弃 feature 改动的场景，不适合盲目使用。

##### 什么时候用 `merge`

推荐使用 `merge` 的场景：

- 合并公共分支，例如 `master`、`develop`、`release`。
- 分支已经推送到远程，并且其他人可能基于它继续开发。
- 希望保留真实分支历史，能看出功能分支从哪里分出、什么时候合回。
- 团队规范明确要求保留 merge commit。

示例：

```bash
git checkout master
git merge release
```

```bash
git checkout develop
git merge feature/xxx
```

##### 什么时候用 `rebase`

推荐使用 `rebase` 的场景：

- 个人 feature 分支同步最新 `master`。
- 分支上的提交还没有被别人依赖。
- 希望让提交历史保持线性，减少无意义的 merge commit。
- 需要在推送前整理本地临时提交。

示例：

```bash
git checkout feature/xxx
git fetch origin
git rebase origin/master
```

##### 处理冲突的推荐流程

rebase 冲突处理：

```bash
git fetch origin
git rebase origin/master

# 出现冲突后查看状态
git status

# 查看当前正在重放的提交
git rebase --show-current-patch

# 手动解决冲突后继续
git add path/to/file
git rebase --continue

# 如果方向不对，放弃本次 rebase
git rebase --abort
```

merge 冲突处理：

```bash
git fetch origin
git merge origin/master

# 出现冲突后查看状态
git status

# 手动解决冲突后提交
git add path/to/file
git commit

# 如果方向不对，放弃本次 merge
git merge --abort
```

rebase 前可以先看当前分支比 `master` 多了哪些提交：

```bash
git log --oneline origin/master..HEAD
```

这些 commit 会被 rebase 依次重放。如果它们修改了 `master` 也修改过的文件，就可能继续冲突。

##### 如果想整体以 `master` 为主

如果真实目的不是「把 feature 的提交迁移到 `master` 后面」，而是「当前分支完全变成 `master`，不保留 feature 改动」，不应该反复 rebase 解决冲突，而应该先备份，再重置：

```bash
# 先备份当前分支
git checkout -b backup/before-reset

# 回到原 feature 分支并对齐远程 master
git checkout feature/xxx
git fetch origin
git reset --hard origin/master
```

`reset --hard` 会丢弃当前分支本地修改，执行前必须确认已经备份或不需要保留。

如果想以 `master` 为基础，只保留少量 feature 改动，更清晰的做法是新建干净分支后挑选提交：

```bash
git fetch origin
git checkout -b feature-new origin/master
git cherry-pick commit_id
```

也可以只取部分文件：

```bash
git checkout old-feature -- path/to/file
```

##### 实践建议

1. 个人 feature 分支同步主干，优先使用 `git rebase origin/master`。
2. 公共分支、多人协作分支，优先使用 `git merge`。
3. 已经 push 且别人可能依赖的分支，不要随便 rebase。
4. rebase 前保证工作区干净，先执行 `git status`。
5. 不要把无关修改放在同一个 commit 里，否则 rebase 冲突会更难判断。
6. 如果必须强推，优先使用 `git push --force-with-lease`，不要直接 `git push --force`。

### 场景 7：合并代码到主分支

#### 场景说明

功能开发完成后，需要将功能分支合并到主分支。

#### 推荐流程

```bash
# 1. 确认功能分支没有未提交代码
git status

# 2. 同步最新主分支
git fetch origin
git rebase origin/master

# 3. 运行测试和规范检查
npm run lint
npm run test
npm run build

# 4. 推送功能分支
git push
```

然后创建 MR / PR，由代码评审后合并。

#### 不推荐直接本地合并主分支

除非是个人项目或明确知道流程，否则不建议直接：

```bash
git checkout master
git merge feature/xxx
git push origin master
```

**管理思路：** 主分支应该保持稳定。团队开发中，合并主分支通常应该经过：

```text
功能分支开发 → 自测 → 推送远程 → 创建 MR/PR → Review → CI 检查 → 合并
```

### 场景 8：合并代码时出现冲突

#### 场景说明

当两个人修改了同一文件的同一区域，Git 无法自动合并，就会产生冲突。

常见提示：

```text
CONFLICT (content): Merge conflict in path/to/file
```

发现冲突后，先查看当前状态：

```bash
git status
```

冲突内容通常类似：

```text
<<<<<<< HEAD
当前分支的代码
=======
被合并分支的代码
>>>>>>> origin/master
```

解决流程：

1. 手动编辑冲突文件，保留正确代码。
2. 删除冲突标记。
3. 添加已解决文件：

```bash
git add path/to/file
```

如果是 merge：

```bash
git commit
```

如果是 rebase：

```bash
git rebase --continue
```

如果需要放弃本次操作，可以执行：

```bash
# 放弃本次 merge
git merge --abort

# 放弃本次 rebase
git rebase --abort
```

**管理思路：** 解决冲突时不要只看代码能否编译，还要确认业务逻辑有没有被覆盖。

特别是在存量项目中，冲突解决后需要重点检查：

- 是否误删已有功能；
- 是否丢失权限判断；
- 是否覆盖接口字段；
- 是否破坏 mock / 测试用例；
- 是否引入重复逻辑。

### 场景 9：临时切换分支，但当前代码还没提交

#### 场景说明

开发到一半，突然需要切换到其他分支修 bug，但当前修改还不适合提交。

#### 使用 stash 暂存

```bash
git stash
```

带说明的 stash：

```bash
git stash push -m "wip: sensitive permission logic"
```

查看 stash 列表：

```bash
git stash list
```

恢复最近一次 stash：

```bash
git stash pop
```

只恢复但不删除 stash：

```bash
git stash apply stash@{0}
```

删除指定 stash：

```bash
git stash drop stash@{0}
```

清空所有 stash：

```bash
git stash clear
```

**管理思路：** `stash` 适合临时保存工作现场。但不建议长期依赖 stash，因为 stash 多了之后容易忘记每一份修改是什么。

重要修改最好创建临时分支保存：

```bash
git checkout -b wip/my-temp-work
git add .
git commit -m "wip: temporary save"
```

### 场景 10：撤销未提交的修改

#### 场景说明

写了一些代码后发现方向不对，想撤销本地修改。

常见方式：

```bash
# 撤销某个文件的修改
git restore path/to/file

# 旧写法
git checkout -- path/to/file

# 撤销所有已跟踪文件的修改
git restore .

# 删除未追踪文件
git clean -fd

# 同时撤销修改并删除未追踪文件
git restore .
git clean -fd
```

**管理思路：** 执行 `git restore .` 和 `git clean -fd` 前，一定先看：

```bash
git status
```

因为这些操作会直接丢弃本地未提交代码。

### 场景 11：提交后发现 commit 有问题，但还没有 push

#### 场景说明

代码已经 commit 到本地，但还没推送到远程，这时修改成本较低。

常见方式：

```bash
# git reset 默认等价于 --mixed
git reset HEAD~1

# 撤销最近一次提交，但保留代码和暂存状态
git reset --soft HEAD~1

# 撤销最近一次提交，保留代码但取消暂存
git reset --mixed HEAD~1

# 撤销最近一次提交，并丢弃代码
git reset --hard HEAD~1

# 修改最近一次 commit 信息
git commit --amend

# 修改最近一次提交内容
git add .
git commit --amend
```

如果想回到某一个指定版本，可以先查看提交记录：

```bash
git log --oneline
```

然后按你的目标选择：

```bash
# 回到指定提交，但保留代码和暂存状态
git reset --soft commit_id

# 回到指定提交，保留代码但取消暂存
git reset --mixed commit_id

# git reset 不带参数时，默认就是 --mixed
git reset commit_id

# 回到指定提交，并丢弃之后的代码
git reset --hard commit_id
```

例如：

```bash
git reset --hard a1b2c3d
```

**管理思路：** `git reset` 默认是 `--mixed`，会移动 `HEAD` 和当前分支指针，同时重置暂存区，但不会直接删除工作区里的代码。想回到某一个指定版本时，先用 `git log --oneline` 找到目标提交，再根据是否要保留本地代码选择 `--soft`、`--mixed` 或 `--hard`。未 push 的本地 commit 可以较自由地整理；但已经 push 到远程并被别人基于该分支开发后，就不要随意改历史。

### 场景 12：提交已经 push，想撤销某次提交

#### 场景说明

代码已经推送到远程，可能已经被其他人拉取。此时不推荐直接 reset 后强推。

推荐方式：

```bash
git revert commit_id
```

`revert` 会生成一个新的提交，用来抵消目标提交的修改。它不会破坏远程提交历史，更适合团队协作。

**管理思路：** 团队协作中，已经 push 的提交尽量用：

```bash
git revert
```

而不是：

```bash
git reset --hard
git push --force
```


如果你的目标不是“新增一个回退 commit”，而是让当前分支的最新 commit 直接变成历史上的某个 commit，也就是让当前 `HEAD` 的 commit hash 直接等于那个历史 commit 的 hash，那么可以直接移动分支指针：

```bash
git reset --hard commit_id
```

例如当前历史是：

```text
A --- B --- C --- D    HEAD
```

执行：

```bash
git reset --hard B
```

结果会变成：

```text
A --- B    HEAD
```

这时当前最新 commit 就是 `B`，它的 hash 也就是历史上 `B` 的 hash，不会产生新的 commit。

如果这个分支已经 push 到远程，而你又要把远程分支也直接改回这个历史 commit，通常还需要：

```bash
git push --force-with-lease
```

这种做法本质上是改写分支历史，适合本地分支、个人分支，或者明确允许改历史的场景；不适合公共分支或已经被多人拉取的分支。


### 场景 13：本地分支需要完全对齐远程分支

#### 场景说明

本地代码已经乱了，想完全恢复成远程分支状态。

#### 危险操作：会丢弃本地修改

```bash
git fetch origin
git reset --hard origin/branch-name
```

例如对齐远程 `s2`：

```bash
git fetch origin
git reset --hard origin/s2
```

对齐远程 `master`：

```bash
git fetch origin
git reset --hard origin/master
```

同时清理未追踪文件：

```bash
git clean -fd
```

#### 更安全的做法

操作前先备份：

```bash
git checkout -b backup/before-reset
```

或者：

```bash
git stash push -m "backup before hard reset"
```

**管理思路：** `reset --hard` 是高风险命令。适合在确认本地修改不需要保留，或者已经做好备份时使用。

### 场景 14：拉取代码时出现 divergent branches

#### 场景说明

执行：

```bash
git pull origin s2
```

出现类似提示：

```text
fatal: Need to specify how to reconcile divergent branches.
```

说明本地分支和远程分支都有新提交，Git 不知道应该用 merge、rebase，还是只允许快进。

常见处理方式：

```bash
# 使用 merge
git pull --no-rebase origin s2

# 使用 rebase
git pull --rebase origin s2

# 只允许快进
git pull --ff-only origin s2
```

默认策略设置：

```bash
# 默认使用 merge
git config --global pull.rebase false

# 默认使用 rebase
git config --global pull.rebase true

# 只允许快进
git config --global pull.ff only
```

**管理思路：** 个人功能分支常用：

```bash
git pull --rebase
```

公共长期分支更适合遵守团队规范，不要随意改变历史。

其中 `ff only` 是 `fast-forward only` 的缩写，意思是：拉取远程代码时，只允许当前分支“直接向前移动”，不允许自动产生 merge，也不允许用 rebase 处理分叉历史。

例如：

```text
A --- B    本地
      \
       C    远程
```

这种情况下，本地只是落后远程，执行 `git pull --ff-only` 可以直接快进到 `C`。

但如果是：

```text
A --- B --- D    本地
      \
       C         远程
```

说明本地和远程都各自有新提交，已经发生分叉。此时执行 `git pull --ff-only` 不会自动合并，而是直接报错，让你自己决定后续用 `merge`、`rebase` 还是其他方式处理。



### 场景 15：只想把某个提交合到当前分支

#### 场景说明

不想合并整个分支，只想拿某一个 commit。

这里的“某一个 commit”，不是特指谁的提交，而是指当前仓库里某一个具体的提交记录。它通常来自其他分支，可能是：

- 你自己之前在别的分支上的某次提交；
- 同事在别的分支上的某次提交；
- 远程分支上的某次提交（先 `git fetch origin` 后，本地才能拿到它的 commit hash）。

最常见的情况是：你当前在 `release` 分支，只想拿 `feature` 分支里的一个修复提交，但不想把整个 `feature` 分支都合过来。

例如：

```text
A --- B --- C          release
         \
          D --- E      feature/pay
```

如果你当前在 `release` 分支，只想拿 `D` 这个提交里的修改，就可以执行：

```bash
git cherry-pick D
```

执行后效果大致会变成：

```text
A --- B --- C --- D'   release
         \
          D --- E      feature/pay
```

这里的 `D'` 不是原来的 `D`，而是把 `D` 的修改内容复制一份，作为一个新的提交加到当前分支上。

常见方式：

```bash
# 挑一个提交
git cherry-pick commit_id

# 例如
git cherry-pick a1b2c3d

# 挑多个提交
git cherry-pick commit_id1 commit_id2 commit_id3

# 解决冲突后继续
git add .
git cherry-pick --continue

# 放弃 cherry-pick
git cherry-pick --abort
```

**管理思路：** `cherry-pick` 适合：

- 从其他分支挑一个 bug fix；
- 临时把某个修复同步到 release 分支；
- 不想引入整个功能分支的其他改动。

### 场景 16：删除已经完成的分支

#### 场景说明

功能已经合并后，需要清理本地和远程分支。

常见方式：

```bash
# 删除本地分支
git branch -d feature/xxx

# 分支未合并但确认要删除
git branch -D feature/xxx

# 删除远程分支
git push origin --delete feature/xxx

# 清理远程已删除分支的本地引用
git fetch -p
```

**管理思路：** 及时清理无用分支，可以避免分支过多导致误操作。

### 场景 17：发布版本时打 tag

#### 场景说明

当某个版本发布上线后，通常需要打 tag 记录发布点，方便后续回溯。

可以把 tag 理解成：给某一个提交打一个固定名字。

例如当前提交是：

```text
A --- B --- C    master
```

如果你在 `C` 上执行：

```bash
git tag v1.0.0
```

那么 `v1.0.0` 就会指向 `C` 这个提交。以后即使 `master` 继续往后提交：

```text
A --- B --- C --- D --- E    master
            |
          v1.0.0
```

`v1.0.0` 仍然停在 `C`，不会跟着分支一起移动。

这就是 tag 和分支最大的区别：

- 分支会随着新提交继续向前移动；
- tag 一旦打在某个提交上，通常就固定不动。

常见方式：

```bash
# 创建 tag
git tag v1.0.0

# 创建带说明的 tag
git tag -a v1.0.0 -m "release: v1.0.0"

# 推送 tag
git push origin v1.0.0

# 推送所有 tag
git push origin --tags

# 查看 tag
git tag

# 删除本地 tag
git tag -d v1.0.0

# 删除远程 tag
git push origin --delete v1.0.0
```

**管理思路：** tag 适合记录稳定发布版本。最常见的用法就是：发布 `v1.0.0` 时，在当时那次上线提交上打一个 `v1.0.0` 的 tag，后面无论主分支继续开发到哪里，你都可以通过这个 tag 重新找到当时发布的那一版代码。分支代表持续变化的开发线，tag 代表固定不变的版本快照。

### 场景 18：误删或误回退后恢复代码

#### 场景说明

执行了错误的 reset、rebase、commit amend 后，想找回之前的提交。

#### 使用 reflog 查看历史操作

```bash
git reflog
```

找到目标提交后恢复：

```bash
git reset --hard commit_id
```

或者创建恢复分支：

```bash
git checkout -b recover/old-work commit_id
```

**管理思路：** `reflog` 是 Git 的“后悔药”之一。即使分支指针被移动，只要提交对象还没有被清理，通常都可以找回来。

## 四、推荐的完整开发流程

### 1. 新需求开发流程

```bash
# 1. 切到主分支
git checkout master

# 2. 拉取最新代码
git pull origin master

# 3. 创建功能分支
git checkout -b feature/xxx

# 4. 开发代码
# ...

# 5. 查看修改
git status
git diff

# 6. 提交代码
git add .
git commit -m "feat: xxx"

# 7. 同步最新主分支
git fetch origin
git rebase origin/master

# 8. 运行检查
npm run lint
npm run test
npm run build

# 9. 推送远程
git push -u origin feature/xxx
```

### 2. 修复 bug 流程

```bash
# 1. 基于最新主分支创建修复分支
git checkout master
git pull origin master
git checkout -b fix/xxx

# 2. 修复问题
# ...

# 3. 提交
git add .
git commit -m "fix: xxx"

# 4. 推送
git push -u origin fix/xxx
```

### 3. 紧急修复流程

```bash
# 1. 从线上稳定分支或主分支创建 hotfix 分支
git checkout master
git pull origin master
git checkout -b hotfix/xxx

# 2. 修复问题
# ...

# 3. 提交修复
git add .
git commit -m "hotfix: xxx"

# 4. 推送并发起合并
git push -u origin hotfix/xxx
```

紧急修复完成后，需要将 hotfix 同步回开发分支，避免后续版本再次丢失修复。

### 4. 完整发布流程

下面用一个常见场景说明：

- `archive/main`：归档分支，只保存已经发布或确认稳定的版本历史，要求保持线形。
- `integration/2026-07`：集成分支，用来汇总本期多个需求，测试环境从这里部署。
- `feature/export-order`：开发分支 A，开发导出订单功能，包含多次本地提交。
- `feature/refund-filter`：开发分支 B，开发退款筛选功能，也包含多次本地提交。
- `fix/coupon-amount`：修复分支 C，修复优惠券金额计算问题。

目标是：多个开发分支可以各自有多次提交，但进入归档分支时，归档分支历史仍然是线形的，不出现杂乱的临时提交和无意义的 merge commit。

下面的分叉图统一按这个方式阅读：

- 从左到右表示时间向前推进。
- 每个大写字母或编号表示一个 commit。
- 分支名写在一行末尾，表示当前分支指针停在哪个 commit 上。
- 带 `'` 的提交，例如 `D'`，表示 rebase 后重新生成的提交：业务修改相同，但 commit hash 已经变化。
- `tag` 写在某个 commit 下方，表示这个版本标签固定指向该提交。

先看一个最小分叉图：

```text
A --- B --- D    本地
       \
        C         远程
```

这个图表示：

- `A`、`B` 是本地和远程共同拥有的历史。
- `D` 是本地开发分支新增的提交。
- `C` 是远程集成分支或远程主线新增的提交。
- 本地和远程从 `B` 开始分叉：本地有 `D`，远程有 `C`。

如果此时直接执行普通 `merge`，历史通常会变成：

```text
A --- B --- D ------- M
       \             /
        C -----------
```

`M` 是 merge commit，能保留真实分叉关系，但历史不再是单线。对于普通集成分支，这种历史有时可以接受；但对于归档分支，如果目标是长期保持线形，就不应该让这种 merge commit 进入归档分支。

更适合线形归档的做法是先在本地开发分支执行 `rebase`，把本地提交 `D` 重新放到远程提交 `C` 后面：

```bash
git fetch origin
git checkout feature/export-order
git rebase origin/integration/2026-07
```

rebase 后历史会变成：

```text
A --- B --- C --- D'    本地
```

这里的 `D'` 和原来的 `D` 表示同一份业务修改，但提交 ID 会变化，因为 Git 重新生成了这个提交。此时开发分支已经基于最新远程集成分支，后续合入集成分支或归档分支时，就可以用 `--ff-only` 做线形推进。

所以这类发布流程的关键不是「开发分支不能有多个提交」，而是：

1. 开发阶段可以正常提交，例如 `D1`、`D2`、`D3`。
2. 合入集成分支前，先基于远程最新提交 `C` 做 `rebase`。
3. 如果提交太碎，再用 `git rebase -i` 整理成 `D'` 或少量清晰提交。
4. 归档分支只接受已经整理好的线形历史，并用 `git merge --ff-only` 防止误产生 merge commit。

#### 第一步：开发分支基于集成分支整理提交

这一步解决的问题是：开发分支从旧的集成分支切出来以后，集成分支可能已经向前走了。如果不先追上最新集成分支，后面合入时就容易产生 merge commit 或冲突。

假设 `feature/export-order` 从 `I0` 切出，开发过程中产生了 3 次提交；同时远程集成分支已经新增了 `I1`：

```text
P0 --- I0 --- I1                         origin/integration/2026-07
       \
        A1 --- A2 --- A3                 feature/export-order
```

其中：

- `P0`：上一个已归档发布点。
- `I0`：本期集成分支的起点。
- `I1`：其他需求已经合入集成分支后产生的新提交。
- `A1`、`A2`、`A3`：导出订单功能在开发分支上的提交。

假设 `feature/export-order` 上这 3 次提交分别是：

```text
A1 feat: add export button
A2 fix: adjust export file name
A3 refactor: simplify export params
```

这些提交在开发过程中是合理的，但最终合入集成分支前，通常需要先同步最新集成分支，并把临时提交整理成更清晰的提交。

```bash
# 1. 确认当前工作区干净
git status

# 2. 获取远程最新分支信息
git fetch origin

# 3. 切到开发分支
git checkout feature/export-order

# 4. 将开发分支重放到最新集成分支之后
git rebase origin/integration/2026-07

# 5. 查看当前开发分支相对集成分支多出的提交
git log --oneline origin/integration/2026-07..HEAD
```

执行完 `git rebase origin/integration/2026-07` 后，图会变成：

```text
P0 --- I0 --- I1                         origin/integration/2026-07
             \
              A1' --- A2' --- A3'        feature/export-order
```

注意这里是 `A1'`、`A2'`、`A3'`，不是原来的 `A1`、`A2`、`A3`。原因是 rebase 会把开发分支上的提交重新放到 `I1` 后面，Git 会重新生成这些 commit。

如果发现这些提交都属于同一个功能，可以用交互式 rebase 合并成 1 个或少数几个语义清晰的提交：

```bash
git rebase -i origin/integration/2026-07
```

编辑时保留第一个提交为 `pick`，后面的临时修复提交可以改成 `squash` 或 `fixup`：

```text
pick A1 feat: add export button
squash A2 fix: adjust export file name
fixup A3 refactor: simplify export params
```

整理后，开发分支历史可以从 3 个临时提交变成 1 个清晰提交：

```text
P0 --- I0 --- I1                         origin/integration/2026-07
             \
              E1                         feature/export-order
```

`E1` 可以理解为 `A1' + A2' + A3'` 的整理结果。这样后续合入集成分支时，集成分支只需要向前移动到 `E1`，历史会干净很多。

如果该开发分支已经推送到远程，并且确认没有其他人基于它继续开发，再使用 `--force-with-lease` 更新远程分支：

```bash
git push --force-with-lease origin feature/export-order
```

同理，`feature/refund-filter` 和 `fix/coupon-amount` 也可以先各自做一轮初步整理：

```bash
git fetch origin
git checkout feature/refund-filter
git rebase origin/integration/2026-07
git rebase -i origin/integration/2026-07
git push --force-with-lease origin feature/refund-filter
```

```bash
git fetch origin
git checkout fix/coupon-amount
git rebase origin/integration/2026-07
git rebase -i origin/integration/2026-07
git push --force-with-lease origin fix/coupon-amount
```

注意：这只是“每个分支先追上当前远程集成分支”。真正按顺序合入时，每合入一个分支，`integration/2026-07` 都会继续向前走；所以下一个分支在合入前还要再确认自己基于最新集成分支，下面第二步会展开讲。

#### 第二步：开发分支合入集成分支

开发分支整理完成后，再合入 `integration/2026-07`。这一步要看清楚一点：`--ff-only` 不是“合并两个分叉”，而是要求集成分支必须能直接向前移动。

以 `feature/export-order` 为例，合入前应该是这样：

```text
P0 --- I0 --- I1                         integration/2026-07
             \
              E1                         feature/export-order
```

`integration/2026-07` 停在 `I1`，`feature/export-order` 只是在 `I1` 后面多了一个整理好的提交 `E1`。这时执行快进合并，Git 不需要创建新的 merge commit，只需要把 `integration/2026-07` 的指针从 `I1` 移到 `E1`：

```text
P0 --- I0 --- I1 --- E1                  integration/2026-07
                    ^
                    feature/export-order
```

如果团队使用 Git 平台的 MR / PR，推荐选择：

- `Squash Merge`：把一个开发分支压成一个提交合入集成分支。
- `Rebase Merge`：保留开发分支整理后的提交，但不产生 merge commit。

如果在本地操作，可以按顺序处理。先合入第一个分支：

```bash
git checkout integration/2026-07
git fetch origin
git pull --ff-only origin integration/2026-07
git merge --ff-only origin/feature/export-order
```

这里用 `merge --ff-only`，而不是在 `integration/2026-07` 上执行 `rebase`，原因是两个分支的职责不同：

- 开发分支负责整理历史：合入前用 `rebase` 把自己的提交放到最新集成分支之后。
- 集成分支负责接收结果：开发分支已经整理好之后，集成分支只需要把指针向前移动。
- `merge --ff-only` 不会产生 merge commit，也不会改写 `integration/2026-07` 已有历史；如果不能快进，它会直接失败。
- `rebase` 会重写当前分支的提交历史，不适合在多人共用的集成分支上随意执行。

> 不要在公共集成分支上用 rebase。因为如果你在 integration/2026-07 上执行 rebase，本质是在尝试改写集成分支自己的提交位置；集成分支通常是公共分支，别人可能已经基于它开发，重写它的历史风险更高。

换成图来看，执行前是：

```text
P0 --- I0 --- I1                         integration/2026-07
              \
               E1                         feature/export-order
```

执行 `git merge --ff-only origin/feature/export-order` 后只是移动集成分支指针：

```text
P0 --- I0 --- I1 --- E1                  integration/2026-07
                    ^
                    feature/export-order
```

如果在这里对 `integration/2026-07` 做 `rebase`，语义就变成“重写集成分支自己的历史”。集成分支通常是公共分支，别人可能已经基于它拉出了新分支，所以不应该用这种方式整理它。整理动作应该发生在个人开发分支上，接收动作才发生在集成分支上。

可以记成一句话：

```text
开发分支：用 rebase 整理历史。
集成分支：用 merge --ff-only 线形接收。
归档分支：用 merge --ff-only 线形推进。
```

合入 `feature/export-order` 后，集成分支已经从 `I1` 走到了 `E1`。此时下一个分支不能还停留在旧的 `I1` 后面，否则图会变成两个分叉：

```text
P0 --- I0 --- I1 --- E1                  integration/2026-07
             \
              R1                         feature/refund-filter
```

这时直接 `git merge --ff-only feature/refund-filter` 会失败，因为 `integration/2026-07` 不能直接快进到 `R1`。正确做法是先让 `feature/refund-filter` 基于最新集成分支重新 rebase：

```bash
git checkout feature/refund-filter
git fetch origin
git rebase integration/2026-07

git checkout integration/2026-07
git merge --ff-only feature/refund-filter
```

rebase 后再合入，图会继续保持单线：

```text
P0 --- I0 --- I1 --- E1 --- R1           integration/2026-07
                           ^
                           feature/refund-filter
```

`fix/coupon-amount` 也按同样方式处理：先基于最新 `integration/2026-07` 整理，再快进合入。

如果 `--ff-only` 失败，说明集成分支和开发分支不是简单的前后关系。此时不要在归档分支上硬合并，应该回到开发分支重新 rebase 最新集成分支，或者在平台侧使用 `Squash Merge`。

合入后的集成分支历史应该接近下面这样：

```text
P0 --- I0 --- I1 --- E1 --- R1 --- C1    integration/2026-07
```

这条线里：

- `E1`：导出订单功能。
- `R1`：退款筛选功能。
- `C1`：优惠券金额修复。
- 没有 `M1`、`M2` 这类 merge commit，说明集成分支仍然是线形历史。

#### 第三步：在集成分支完成验证

集成分支是测试和联调入口，多个开发分支合入后，需要在这里统一验证。此时分支图大致是：

```text
P0 --- I0 --- I1 --- E1 --- R1 --- C1    integration/2026-07
```

这表示本期准备发布的功能和修复已经都进入 `integration/2026-07`，但还没有进入 `archive/main`。这一步的重点是：验证只发生在集成分支，不要把未验证的代码推进归档分支。

```bash
git checkout integration/2026-07
git pull --ff-only origin integration/2026-07

# 根据项目情况执行检查
npm run lint
npm run test
npm run build
```

如果验证过程中发现问题，不建议直接在归档分支上修。应该新建修复分支，合回集成分支后重新验证：

```text
P0 --- I0 --- I1 --- E1 --- R1 --- C1    integration/2026-07
                                      \
                                       F1 fix/release-export-empty-file
```

```bash
git checkout -b fix/release-export-empty-file origin/integration/2026-07

# 修复问题后提交
git add .
git commit -m "fix: handle empty export file"

# 整理并推送
git fetch origin
git rebase origin/integration/2026-07
git push -u origin fix/release-export-empty-file
```

修复分支合入集成分支后，图会继续保持线形：

```text
P0 --- I0 --- I1 --- E1 --- R1 --- C1 --- F1    integration/2026-07
```

然后再次执行 lint、test、build。只有这条集成线验证通过，才进入下一步归档。

#### 第四步：归档分支只做线形推进

如果 `integration/2026-07` 本身已经是线形历史，并且验证通过，可以让归档分支只接受快进合并。

合并前，`archive/main` 仍然停在上一次发布点 `P0`，`integration/2026-07` 在它后面继续向前：

```text
P0                                           archive/main
 \
  I0 --- I1 --- E1 --- R1 --- C1 --- F1     integration/2026-07
```

执行：

```bash
git checkout archive/main
git fetch origin
git merge --ff-only origin/integration/2026-07
git tag v2026.07.0
git push origin archive/main v2026.07.0
```

`--ff-only` 的作用是只允许归档分支向前移动，不允许 Git 自动生成 merge commit。只要出现分叉，命令会直接失败，提醒你先处理集成分支历史。执行成功后，`archive/main` 会从 `P0` 直接快进到 `F1`：

```text
P0 --- I0 --- I1 --- E1 --- R1 --- C1 --- F1    archive/main
                                             |
                                         v2026.07.0
```

这条历史是线形的，适合长期归档和回溯。以后要找 2026 年 7 月这次发布，就看 `v2026.07.0` 指向的 `F1`。

如果想把提交信息写得更贴近发布记录，也可以让集成分支最后包含一个明确的发布提交，例如：

```text
P0 --- I0 --- I1 --- E1 --- R1 --- C1 --- F1 --- P1    archive/main
                                                    |
                                                v2026.07.0
```

其中 `P1` 可以是 `release: 2026-07`，表示这次发布的固定归档点。

#### 第五步：如果集成分支历史不干净，先做发布分支

有时 `integration/2026-07` 已经包含多个 merge commit，或者开发分支没有提前整理，历史可能类似：

```text
P0 --- I0 -------- M1 -------- M2 -------- M3    integration/2026-07
       \          /          /          /
        E1 --- E2           R1 --- R2   C1
```

这张图里 `M1`、`M2`、`M3` 都是 merge commit。它们能反映真实协作过程，但如果 `archive/main` 的目标是长期线形归档，就不建议直接把这段复杂历史带进去。

更稳妥的做法是从归档分支拉一条发布分支，把本期集成结果压成一个发布提交：

```bash
git fetch origin
git checkout archive/main
git pull --ff-only origin archive/main
git checkout -b release/2026-07

# 将集成分支的最终文件结果压成一个提交
git merge --squash origin/integration/2026-07
git commit -m "release: 2026-07"

# 发布分支验证
npm run lint
npm run test
npm run build

# 归档分支只做快进
git checkout archive/main
git merge --ff-only release/2026-07
git tag v2026.07.0
git push origin archive/main v2026.07.0
```

`git merge --squash` 的效果是：只拿 `origin/integration/2026-07` 的最终文件结果，不把它的分叉历史和 merge commit 一起搬过来。发布分支会变成：

```text
P0 --- P1                                release/2026-07
       |
   release: 2026-07
```

再把 `release/2026-07` 快进到 `archive/main` 后，归档分支只会看到一个清晰的发布提交：

```text
P0 --- P1                                archive/main
       |
   v2026.07.0
```

#### 第六步：如果集成分支和最新归档分支存在冲突

还有一种更容易踩坑的情况：`integration/2026-07` 是从旧归档点 `P0` 拉出来的，但 `archive/main` 后来又合入了线上修复 `P1`。这时两条分支已经分叉：

```text
P0 --- P1                                archive/main
 \
  I1 --- E1 --- R1 --- C1                integration/2026-07
```

如果 `P1` 和 `integration/2026-07` 都改了同一块代码，就会产生冲突。注意：`git merge --ff-only origin/integration/2026-07` 不会帮你进入冲突解决流程，它会直接失败，因为 `archive/main` 不能快进到 `integration/2026-07`。

这时仍然不要在 `archive/main` 上直接解冲突。推荐从最新归档分支拉出发布分支，在发布分支上把集成分支结果合进来，并在这里解决冲突：

```bash
git fetch origin
git checkout -b release/2026-07 origin/archive/main

# 把集成分支的最终结果压到发布分支上
git merge --squash origin/integration/2026-07

# 如果出现冲突，先查看冲突文件
git status

# 手动解决冲突后添加文件
git add path/to/file

# 生成发布提交
git commit -m "release: 2026-07"
```

冲突解决完成后，发布分支会变成：

```text
P0 --- P1 --- P2                         release/2026-07
```

这里的 `P2` 不是简单复制 `integration/2026-07`，而是“最新归档分支 `P1` + 本期集成分支最终结果 + 人工解决冲突”的发布提交。接下来必须重新验证：

```bash
npm run lint
npm run test
npm run build
```

验证通过后，归档分支仍然只做快进：

```bash
git checkout archive/main
git merge --ff-only release/2026-07
git tag v2026.07.0
git push origin archive/main v2026.07.0
```

最终归档历史仍然保持线形：

```text
P0 --- P1 --- P2                         archive/main
              |
          v2026.07.0
```

这一步最重要的判断是：冲突解决时不能只看“当前发布功能能不能跑”，还要确认 `P1` 里的线上修复没有被集成分支覆盖。如果 `P1` 是线上 hotfix，这个检查尤其重要。

#### 推荐规则总结

1. 开发分支可以有多次提交，但合入前要先 `rebase` 最新集成分支。
2. 开发分支上的临时提交、调试提交、修修补补提交，合入前用 `git rebase -i` 整理。
3. 集成分支用于汇总和验证，可以接受多个需求，但合并方式优先选择 `Squash Merge` 或 `Rebase Merge`。
4. 归档分支只接受 `git merge --ff-only`，不直接处理冲突，也不产生 merge commit。
5. 如果集成分支历史已经不线形，就从归档分支拉 `release/*`，用 `git merge --squash` 生成一个发布提交后再快进归档分支。
6. 如果集成分支和最新归档分支存在冲突，在 `release/*` 上解决冲突和验证，归档分支只接收验证后的快进结果。
7. 已经被他人依赖的公共分支不要随意 rebase；需要整理历史时，优先在个人开发分支或发布分支上处理。

## 五、常见风险与避免方式

### 1. 风险：在错误分支上开发

开发前执行：

```bash
git branch --show-current
git status
```

发现分支错了，可以先保存修改：

```bash
git stash
git checkout correct-branch
git stash pop
```

### 2. 风险：主分支直接开发

始终使用功能分支：

```bash
git checkout -b feature/xxx
```

必要时可以给主分支设置保护规则，禁止直接 push。

### 3. 风险：合并时覆盖别人代码

合并前先同步：

```bash
git fetch origin
```

解决冲突后重点检查业务逻辑，而不只是让冲突标记消失。

### 4. 风险：提交包含临时代码

提交前检查：

```bash
git diff
git status
```

搜索临时代码：

```bash
grep -R "console.log" .
grep -R "debugger" .
```

也可以依赖 lint、prettier、git hook 做自动检查。

### 5. 风险：reset 或 clean 导致代码丢失

执行危险命令前先备份：

```bash
git stash push -m "backup before dangerous operation"
```

或者：

```bash
git checkout -b backup/before-reset
```

### 6. 风险：强推覆盖远程分支

谨慎使用：

```bash
git push --force
```

更安全的强推方式：

```bash
git push --force-with-lease
```

`--force-with-lease` 会先检查远程分支是否被别人更新，能减少误覆盖风险。

## 六、常用命令速查

### 分支查看

```bash
git branch
git branch -r
git branch -a
git branch --show-current
```

### 分支创建与切换

```bash
git checkout -b feature/xxx
git checkout master
git switch -c feature/xxx
git switch master
```

### 提交代码

```bash
git status
git diff
git add .
git commit -m "feat: xxx"
```

### 推送代码

```bash
git push -u origin feature/xxx
git push
```

### 拉取代码

```bash
git pull
git fetch origin
git pull --rebase origin master
```

### 合并代码

```bash
git merge origin/master
git rebase origin/master
```

### 撤销修改

```bash
git restore path/to/file
git restore .
git clean -fd
```

### 回退提交

```bash
git reset --soft HEAD~1
git reset --mixed HEAD~1
git reset --hard HEAD~1
git revert commit_id
```

### 暂存现场

```bash
git stash
git stash push -m "message"
git stash list
git stash pop
git stash apply stash@{0}
```

### 删除分支

```bash
git branch -d feature/xxx
git branch -D feature/xxx
git push origin --delete feature/xxx
```

### 恢复误操作

```bash
git reflog
git reset --hard commit_id
git checkout -b recover/xxx commit_id
```

## 七、推荐记忆的最小命令集

日常开发中，优先记住下面这些命令：

```bash
git status
git branch
git checkout -b feature/xxx
git add .
git commit -m "feat: xxx"
git fetch origin
git rebase origin/master
git push -u origin feature/xxx
git stash
git stash pop
git reset --soft HEAD~1
git revert commit_id
```
