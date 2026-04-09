# Dating Tracker V2 产品增强：6 个新方向

## 说明

这份文档包含 6 个正式纳入产品计划的新方向。
它们不是功能膨胀，而是补强"帮用户做出更稳定判断"这个核心能力的关键缺口。

前 3 个补的是**分析盲区**，后 3 个补的是**决策质量保护机制**。

这些内容应合并进主规划文档 `dating-tracker-product-direction_b553e4b2.plan.md`。

---

## 一、需要变更的现有内容

### 1. 统一决策状态系统：新增 `Committed` 状态

原始状态集：

- `继续推进`
- `观察中`
- `停止主动，等他执行`
- `等待决策截止日`
- `建议终止`
- `已终止`

**新增一个正向终态：**

- `已确认关系 / Committed`

为什么必须加：

- 现有状态只有负向退出，没有正向收口
- 用户心理上会觉得产品只帮她淘汰人，不帮她确认人
- 进入 Committed 状态后，对象页从 decision page 转为 relationship anchor page
- 配一张 `Why This Person Made Sense` 正向决策卡，和 `Reflection` 形成镜像

Committed 状态触发后的页面变化：

- Hero Decision Bar 的 AI Recommendation 变为：`This decision was well-supported`
- Next Move 变为：`Maintain what is working. Watch for early signs of pattern change.`
- Reflection 模块变为正向版本：`Why you chose this person`
- Evidence 保留，但视角从"值不值得继续"变成"这些是你做这个决定的依据"
- Decision Journal 自动生成一条 committed entry

### 2. 优先级列表更新

在"必须有"列表中新增：

- `Committed Status + Why This Person Made Sense`
- `Pre-Mortem Exit Criteria`

在"应该有"列表中新增：

- `Dating Energy Budget`
- `Conflicting Signal Detection`
- `Dating Fatigue Detection`
- `Behavioral Prediction`

### 3. Roadmap 更新

Phase 1 (Private MVP) 新增：

- Committed 正向终态和正向决策卡
- Pre-Mortem 退出标准设定

Phase 2 (Beta Product) 新增：

- Dating Energy Budget
- Conflicting Signal Detection
- Dating Fatigue Detection
- Behavioral Prediction 基础版

---

## 二、6 个新模块完整定义

---

### 模块 9：Committed Status + Why This Person Made Sense

#### 目的

- 为产品增加一个正向终态
- 当用户从 dating 进入正式关系时，产品不是突然"没用了"，而是帮她锚定"为什么选这个人"
- 在进入关系后的焦虑或怀疑时刻，提供基于证据的信心支撑

#### 核心功能

- 用户主动触发 `Mark as Committed`
- 系统自动生成 `Why This Person Made Sense` 正向决策卡：
  - 这个人满足了你的哪些核心标准
  - 你做出这个决定时的关键证据
  - 这个人和你之前结束的人最大的区别是什么
  - 你在这段推进过程中最稳定的判断是什么
- 对象页从 decision page 转为 relationship anchor page
- Reflection 模块切换为正向模式：不再是"为什么结束是对的"，而是"为什么选这个人是有依据的"
- Decision Journal 自动写入 committed entry
- 保留 Evidence 和 Timeline，但不再显示"下一步动作"和"建议终止"

#### 为什么重要

- 如果产品只有负向退出，用户会在潜意识里把产品和"淘汰"联系在一起
- 进入关系后的前 3-6 个月，焦虑和自我怀疑是非常常见的
- 能够回看"我为什么选了这个人"，和能够回看"我为什么结束了那个人"一样重要
- 这也是产品长期留存的关键——用户进入关系后不会卸载，而是继续把产品当作信心锚点

#### 和其他模块的关系

- 是 `Reflection Guide` 的正向镜像
- 依赖 `Decision Journal` 的历史判断记录
- 依赖 `Evidence` 层的关键行为和原话
- 写入 `About Me` 的 Growth Timeline：`You committed to someone who matched your standards`
- 写入 `Annual Review`：今年你成功进入了一段关系

#### 在对象页的展示

进入 Committed 后，Object Detail 页面结构调整为：

1. Hero Bar：状态变为 `Committed`，不再显示 deadline
2. Why This Person Made Sense（新模块，替代 Next Move 位置）
3. Compatibility Match Summary（保留 match 部分，弱化 mismatch）
4. Evidence（保留，视角调整）
5. Timeline（保留完整）
6. Decision Journal（保留，最后一条是 committed entry）
7. What This Person Taught You（保留）

---

### 模块 10：Dating Energy Budget

#### 目的

- 让产品能感知用户当前的精力负荷
- 在负荷过高时主动建议收缩管线
- 防止用户在疲劳状态下做出低质量判断

#### 核心功能

- 追踪当前 active 和 observing 的对象总数
- 追踪用户近期的输入频率、decision 延迟、debrief 质量
- 当负荷超过历史最佳决策范围时，在 Dashboard 显示提醒
- 建议收缩方式：暂停最低优先级的对象、推迟新对象进入、降低输入频率期望

#### 提醒文案示例

- `You are tracking 6 active people. Your decision quality tends to drop above 4. Consider pausing 1-2.`
- `You have not debriefed any of your 3 recent dates. This usually means you are running on impressions, not evidence.`
- `You extended 3 deadlines this week. This may not be about them.`

#### 为什么重要

- 同时推进 6 个人和同时推进 2 个人，判断质量完全不同
- 产品不应该只帮用户管更多人，而应该帮用户在合理负荷内做更好的判断
- 精力过载是标准漂移和情绪化决策的主要触发因素之一

#### 和其他模块的关系

- 依赖 `Me Memory` 中的历史决策质量数据
- 依赖 `Relationship Tracker` 中的对象总数和状态分布
- 依赖 `Time Intelligence` 追踪 debrief 延迟和 decision 延期
- 提醒出现在 `Dashboard` 的 Pattern / Emotional Alert 区块
- 回写 `About Me` 的 Emotional Patterns：`You tend to overload your pipeline when anxious about progress`
- 和 `Dating Fatigue Detection` 强关联

#### 在 Dashboard 的展示

作为 Summary Metrics 下方的一个条件触发卡片，不常驻，只在负荷超标时出现：

- 标题：`Energy Check`
- 内容：当前负荷 + 建议收缩点
- 按钮：`Pause lowest priority` / `Review pipeline`

---

### 模块 11：Conflicting Signal Detection

#### 目的

- 专门处理"同一个人身上出现明确矛盾信号"的情况
- 不是把矛盾平均掉，而是显性地把对立证据摆在一起

#### 核心功能

- 自动检测同一对象的信号冲突：
  - 文字主动 vs 见面被动
  - 说想要稳定 vs 从不主动推进见面
  - 聊天很用心 vs 约会时心不在焉
  - 承诺具体计划 vs 实际从未兑现
- 在 Evidence 模块中新增 `Conflicting Signals` 子栏
- 每组冲突信号并排展示，标注各自的时间和来源
- AI 对冲突做定性判断：这是"能力有限"还是"意愿不足"还是"信息不够"

#### 为什么重要

- 很多用户不是看不到问题，而是被矛盾信号搞得无法下判断
- 现有的 match / mismatch / unclear 三分法无法处理"他在 A 方面很好但在 B 方面完全相反"的情况
- 矛盾信号是最常导致用户反复犹豫和标准漂移的原因
- 把冲突显性化，本身就是帮助用户做判断

#### Conflicting Signal 展示格式

每组冲突固定结构：

- `Signal A`：具体行为 + 时间
- `Signal B`：与之矛盾的行为 + 时间
- `AI Read`：这组冲突最可能说明什么
- `What Would Resolve This`：还需要看到什么才能判断

#### 文案示例

- Signal A: `He texted "I really want to see you again" on Mar 25`
- Signal B: `He has not proposed a specific date in the 8 days since`
- AI Read: `Words suggest interest. Behavior suggests low initiative. The conflict is between stated intent and actual follow-through.`
- Resolve: `If he sets a specific plan within 3 days without prompting, upgrade. If not, this is a pattern, not a delay.`

#### 和其他模块的关系

- 嵌入 `Object Detail` 的 Evidence 模块，作为新增子栏
- 依赖 `Statement Index` 和 `Time Intelligence`
- 为 `What To Verify Next` 提供最关键的验证方向
- 为 `Decision Journal` 提供冲突是否被解决的记录
- 为 `Reflection Guide` 提供"为什么你当时犹豫"的具体证据

---

### 模块 12：Pre-Mortem Exit Criteria

#### 目的

- 在用户开始投入之前或投入早期，就建立清醒状态下的退出标准
- 当后续情绪上头、开始给对方找借口时，用户可以回看自己事先设定的底线

#### 核心功能

- 在新对象创建时或第一次约会后，触发一次轻量 prompt
- 用户设定 1-3 条退出标准
- 退出标准存入对象记录，和 Decision Journal 并列
- 当 AI 检测到对象行为已触及用户预设的退出标准时，主动提醒
- 用户可以修改退出标准，但修改会被记录，防止无意识降标

#### 触发时机

- 新对象保存后，首次进入 Object Detail 时
- 第一次约会 Debrief 结束后
- 用户也可以随时手动设定或修改

#### Prompt 设计

轻量、不打断：

- `Before you invest more, set your exit signal.`
- `If this person does ___, you will end it.`
- 提供 3 个常见模板供快速选择：
  - `If he does not propose a concrete plan within [X] days`
  - `If he cancels or reschedules more than [X] times`
  - `If his words and actions stay inconsistent after [X] interactions`
- 也支持自由输入

#### 文案示例

设定时：
- `You set this when you were clear-headed. It still counts.`

触发时：
- `Your pre-set exit criteria has been met.`
- `You said you would end this if he cancels twice. He just cancelled the second time.`
- `This is not AI telling you what to do. This is you, from two weeks ago, reminding yourself.`

修改时：
- `You are updating your exit criteria for James.`
- `Original: end if he cancels twice. New: end if he cancels three times.`
- `This change has been recorded. You may want to check if this is a pattern adjustment or a standards drift.`

#### 为什么重要

- 比事后 Reflection 更有力，因为标准是用户自己在清醒状态下设的
- AI 的 Reflection 是"AI 告诉你为什么你的决定是对的"
- Pre-Mortem 是"你自己告诉自己，什么时候该走"
- 这两个机制互补：Pre-Mortem 防止进入，Reflection 防止回头

#### 和其他模块的关系

- 存入 `Object Detail`，位于 Decision Journal 附近
- 和 `Personal Standards Drift Alert` 联动：修改退出标准时触发漂移检查
- 和 `Pattern Alerts` 联动：如果用户反复修改退出标准给同一类型对象延期，触发模式提醒
- 和 `Reflection Guide` 互补：一个管前端预防，一个管后端稳固
- 回写 `About Me`：`You tend to revise exit criteria downward for charismatic but unreliable people`

#### 在 Object Detail 的展示

建议放在 Decision Journal 模块上方或旁边：

- 标题：`Your Exit Criteria`
- 内容：用户设定的 1-3 条退出标准
- 状态标签：`Not triggered` / `Approaching` / `Met`
- 如果已触发：红色高亮 + 按钮 `End It` / `Override (recorded)`

---

### 模块 13：Dating Fatigue Detection

#### 目的

- 检测用户自身的状态下降，而不只是检测对象的投入下降
- 在用户疲劳状态下，主动建议暂停或降速，防止低质量判断

#### 核心功能

- 追踪疲劳信号指标：
  - Debrief 写得越来越短或完全跳过
  - Decision deadline 反复延期
  - 多个对象同时标为"观察中"但不做决定
  - Quick Capture 频率明显下降
  - 输入内容的情绪负面度上升
  - 连续多周没有正向推进任何对象
- 当疲劳信号达到阈值时，触发主动提醒
- 提供具体的恢复建议，不是空洞的"你需要休息"

#### 提醒文案示例

- `You have postponed 3 decisions this week. This may not be about them — it may be about your capacity right now.`
- `You skipped the last 2 debriefs. Your next decision will have less evidence than usual.`
- `You have not moved anyone forward in 2 weeks. Consider whether you need a short break from active dating.`
- `Your pipeline is full, but nothing is progressing. This is often a sign of decision fatigue, not a lack of good options.`

#### 恢复建议示例

- `Consider pausing your pipeline for 3-5 days.`
- `Focus on the 1-2 people you are most clear about. Let the rest wait.`
- `Try one voice debrief instead of typing. Lower effort, better data.`
- `Your weekly reset is a good time to re-evaluate capacity, not just people.`

#### 为什么重要

- 疲劳状态下的判断和情绪化判断一样不可靠
- 产品能检测对象的投入下降，但如果不检测用户自己的状态下降，就只做了一半
- 很多用户误以为自己"对所有人都不满意"，实际上是自己已经疲劳
- 这直接服务于核心定位：减少情绪化误判

#### 和其他模块的关系

- 依赖 `Time Intelligence` 追踪行为频率变化
- 依赖 `Me Memory` 对比历史活跃度
- 和 `Dating Energy Budget` 强关联但不同：Energy Budget 看负荷量，Fatigue Detection 看状态质量
- 提醒出现在 `Dashboard` 的 Pattern / Emotional Alert 区块
- 写入 `About Me` 的 Emotional Patterns
- 写入 `Weekly Reset`：`This week you showed signs of decision fatigue`
- 和 `Emotional State Check-In` 互补：Check-In 是用户主动报告情绪，Fatigue Detection 是系统被动检测

---

### 模块 14：Behavioral Prediction

#### 目的

- 基于已有模式，预测下一步最可能发生什么
- 让用户提前准备好判断框架，而不是每次都在事发后被动反应

#### 核心功能

- 基于对象的行为趋势，生成 1-2 条预测：
  - 他下一步最可能做什么
  - 在什么时间范围内
  - 如果预测成立，意味着什么
  - 如果预测不成立，意味着什么
- 预测不需要复杂模型，基于 `Time Intelligence` 的趋势 + `Statement Index` 的一致性检查即可
- 预测事后自动验证：预测是否准确，作为 AI 质量的自我校准

#### 展示格式

每条预测固定结构：

- `Prediction`：最可能发生的下一步
- `Timeframe`：预计时间窗口
- `If true`：如果发生，意味着什么
- `If false`：如果没发生，意味着什么

#### 文案示例

- Prediction: `Based on his pattern, there is a high chance he will suggest "let's hang out soon" again without setting a specific date.`
- Timeframe: `Within the next 3-5 days`
- If true: `This confirms the vague planning pattern. Your pre-set exit criteria will be met.`
- If false: `If he sets a specific plan, this would be a meaningful change from his previous behavior. Worth noting.`

另一个例子：

- Prediction: `He is likely to follow up within 24 hours after this date, based on his previous pattern.`
- Timeframe: `By tomorrow evening`
- If true: `Consistency continues. No action needed.`
- If false: `A break in his usual pattern. Worth observing but not alarming on its own.`

#### 为什么重要

- 让用户从"被动反应"转为"有准备地观察"
- 当预测被验证时，用户对产品的信任会显著提升
- 当预测没有发生时，用户会更注意到"变化"，而不是错过
- 预测本身就是最好的"下一步观察什么"的引导

#### 和其他模块的关系

- 依赖 `Time Intelligence` 的回复间隔和推进节奏趋势
- 依赖 `Statement Index` 检查承诺是否被兑现
- 嵌入 `Object Detail`，建议放在 `What To Verify Next` 附近或合并
- 预测准确度回写 `AI Calibration`
- 预测结果回写 `Timeline` 作为事件节点
- 为 `Decision Journal` 提供"AI 当时预测了什么，实际发生了什么"的对比记录

#### 在 Object Detail 的展示

建议作为 `What To Verify Next` 的增强，或紧跟其后：

- 标题：`What AI Expects Next`
- 内容：1-2 条预测
- 预测过期后自动标注：`Confirmed` / `Did not happen` / `Inconclusive`
- 按钮：`This happened` / `This did not happen`（用户手动确认，帮助 AI 校准）

---

## 三、Object Detail 页面排序更新

合并新模块后，建议最终顺序调整为：

1. `Hero Decision Bar`（含 Committed 状态）
2. `Next Move`（Committed 后变为 `Why This Person Made Sense`）
3. `Momentum Health + Readiness`
4. `My Lens + Compatibility`
5. `Conflicting Signals`（新增，从 Evidence 独立出来或作为 Evidence 子栏）
6. `What To Verify Next + Behavioral Prediction`（合并或紧邻）
7. `Evidence`
8. `AI Person Summary`
9. `Timeline`
10. `Pre-Mortem Exit Criteria`（新增）
11. `Decision Journal`
12. `Reflection`
13. `Reply Assistant`
14. `What This Person Is Teaching You`

---

## 四、Dashboard 新增展示

### Energy Check 卡片（条件触发）

- 触发条件：active 对象超过用户历史最佳范围，或 decision 延期连续 3 次以上
- 标题：`Energy Check`
- 内容：`You are tracking [X] active people. Consider focusing on the [Y] you are most clear about.`
- 按钮：`Review pipeline` / `Pause lowest priority`

### Fatigue Alert 卡片（条件触发）

- 触发条件：疲劳信号指标达到阈值
- 标题：`Capacity Check`
- 内容：`You have been postponing decisions and skipping debriefs. Your judgment may be less reliable right now.`
- 按钮：`Take a break` / `Focus on top 2`

这两个卡片都出现在 Dashboard 的 Pattern / Emotional Alert 区块，不常驻，只在需要时触发。

---

## 五、About Me 页面新增内容

### Emotional Patterns 模块新增

- `Your decision quality drops when you track more than [X] people simultaneously`
- `You tend to postpone decisions when fatigued rather than making them`
- `You revise exit criteria downward for charismatic but unreliable people`

### Growth Timeline 模块新增

- `You committed to someone who matched your standards on [date]`
- `You started setting exit criteria before investing, which reduced emotional churn`

### AI Calibration 模块新增

- 预测准确度统计：`AI predicted correctly [X]% of the time in the last 30 days`
- 用户确认的预测结果记录

---

## 六、Notification 新增文案

### Pre-Mortem Triggered

- `Your pre-set exit criteria for James has been met.`
- `You said you would end this if he cancels twice. He just cancelled the second time.`
- Actions: `End It` / `Override (recorded)` / `Review`

### Energy Overload

- `You are tracking 6 active people right now.`
- `Your best decisions usually happen with 3-4 active. Consider pausing someone.`
- Actions: `Review pipeline` / `Dismiss`

### Fatigue Detected

- `You have postponed 3 decisions and skipped 2 debriefs this week.`
- `Your judgment may be less reliable right now. Consider a short break.`
- Actions: `Pause pipeline` / `Focus on top 2` / `Dismiss`

### Prediction Confirmed

- `AI predicted James would suggest vague plans again. That just happened.`
- `Your exit criteria is now met.`
- Actions: `Review` / `End It`

### Committed

- `You marked Alex as committed.`
- `Your decision card has been saved. You can revisit it anytime.`
- Actions: `View decision card`

---

## 七、Mock Content 补充

### Pre-Mortem 在 Object Detail 的展示

```text
Your Exit Criteria
────────────────────────────────
Set on Mar 22 (after first date)

1. If he does not propose a specific plan
   within 5 days after a date.
   Status: Not triggered

2. If he cancels or reschedules more
   than twice.
   Status: Not triggered

3. If his words and actions stay
   inconsistent after 3 interactions.
   Status: Approaching — 2 of 3 interactions
   showed inconsistency

[Edit criteria]  [This was met → End It]
```

### Behavioral Prediction 在 Object Detail 的展示

```text
What AI Expects Next
────────────────────────────────
Based on James's pattern:

He will likely suggest vague plans
("we should do something") without
committing to a specific time.
Expected within: 3-5 days

If this happens:
This confirms the vague planning pattern.
Your exit criteria #1 will be met.

If this does not happen:
A specific plan from him would be a
meaningful break from his pattern.
Worth upgrading to Continue if it happens.

[He did this]  [He didn't]  [Something else]
```

### Committed 状态下的 Object Detail

```text
< Back                                    Alex
Hinge · added Mar 18 · committed Apr 15

Status: Committed
Decision confidence: High

Why This Person Made Sense
────────────────────────────────
He met your top 3 standards consistently:
- Initiative: he planned dates clearly
- Follow-through: no missed commitments
- Emotional availability: conversations
  deepened steadily over time

You did not commit out of excitement.
You committed because the evidence stayed
healthy across 6 dates and 4 weeks.

Compatibility Summary
────────────────────────────────
Strong match on: consistency, initiative,
communication style, life direction

Minor gap: weekday availability
(acknowledged, not a deal-breaker for you)

Evidence
────────────────────────────────
- Followed up within 24 hours every time
- Planned 4 of 6 dates himself
- "I am looking for something steady"
  → backed by consistent action
- No missed commitments across 4 weeks

Timeline                              See full
────────────────────────────────
Mar 18 · Matched on Hinge
Mar 21 · First date
Mar 28 · Second date
Apr 3  · Third date
Apr 8  · Fourth date
Apr 12 · Fifth date
Apr 15 · Marked as Committed

Decision Journal                      See all
────────────────────────────────
Mar 22 · Continue after clear follow-up
Apr 1  · Continue with initiative test
Apr 8  · Continue — depth increasing
Apr 15 · Committed
He met your standards with enough
consistency and time. This decision
was evidence-based.

What This Person Taught You
────────────────────────────────
Steady consistency can feel quieter
than chemistry, but it builds real trust.
You chose well by trusting evidence
over excitement.
```
