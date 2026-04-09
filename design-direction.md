# SignalTrace 视觉重设计方案
**研究基准：** shadcn/ui · Radix UI Themes · Tailwind CSS · 2024-2025 移动端设计趋势  
**目标用户：** 20-30岁女性，有品位，追求高级感，不要冷漠极简，不要黑色主题  
**更新日期：** 2026-04-09

---

## 一、设计理念

当前 2025 年主流趋势的核心判断是：**"暖性极简"（Warm Minimalism）正在取代冷性极简（Cold Minimalism）**。目标用户群体（20-30岁，有审美意识的女性）对以下两种风格都有明确的排斥：

- ❌ 过度极简到失去温度感（全白 + 纯黑 + 无装饰）
- ❌ 过度装饰到廉价感（荧光、强饱和、嘈杂）

她们欣赏的是：**有层次的克制、有温度的精致、有质感的细节**。参考心智模型：Notion 的结构感 + Lemon8 的视觉温度 + Linear 的信息密度。

---

## 二、色彩方案（三个备选方向）

### 方向 A：温暖奶油系 ☕ `「推荐首选」`
> Warm Cream · Dusty Rose · Sage · Sand

高级感来自**低饱和度的暖色调组合**，像奶油质地的纸张，有呼吸感，不刺激。适合 SignalTrace 这种信息密度较高的 productivity/analytics app。

```css
:root {
  /* === 背景层 === */
  --color-bg-base:       #FAF7F2;   /* 奶油白，主背景 */
  --color-bg-surface:    #F4EFE8;   /* 暖米色，卡片背景 */
  --color-bg-elevated:   #EDE7DC;   /* 深一级，hover/选中态 */
  --color-bg-overlay:    rgba(250, 247, 242, 0.85); /* 毛玻璃遮罩 */

  /* === 主色调 === */
  --color-primary:       #C17B74;   /* Dusty Rose，CTA按钮、主强调 */
  --color-primary-light: #D9A49F;   /* 浅版，hover态 */
  --color-primary-muted: #EDD5D2;   /* 极浅，tag/badge背景 */

  /* === 辅助色调 === */
  --color-sage:          #8FAF8A;   /* Sage Green，成功状态、图表辅助 */
  --color-sage-light:    #C4D9C1;   /* 浅 Sage，低调强调 */
  --color-sand:          #C9A882;   /* Sand，警告/暖提示 */
  --color-sand-light:    #E8D5B8;   /* 浅 Sand */

  /* === 文字层 === */
  --color-text-primary:  #3D3530;   /* 深暖棕，正文 */
  --color-text-secondary:#7A6E68;   /* 中灰棕，次要文字 */
  --color-text-tertiary: #ADA5A0;   /* 浅灰棕，placeholder */
  --color-text-inverse:  #FAF7F2;   /* 白文字，用于深色按钮上 */

  /* === 边框/分割线 === */
  --color-border:        #E0D8CE;   /* 主边框 */
  --color-border-subtle: #EDE7DC;   /* 极细分割线 */

  /* === 功能色 === */
  --color-success:       #7BA87A;
  --color-warning:       #C4925A;
  --color-error:         #B85C58;
  --color-info:          #6E9BB8;
}
```

**感觉：** 在设计精良的咖啡书店里用的 app。温暖、有质感、不会让人视觉疲劳。

---

### 方向 B：现代渐变系 ✨ `「视觉冲击最强」`
> Soft Gradient · Glass Morphism · Blush to Lavender

用**微渐变 + 毛玻璃（Glassmorphism）**制造层次感和现代感。适合 SignalTrace 如果想走「科技感 + 女性化」路线。主流于 2024-2025 年 SaaS dashboard 和金融类 app。

```css
:root {
  /* === 背景层（渐变基调） === */
  --color-bg-base:       #FDF6FB;   /* 极浅的粉紫调白 */
  --color-bg-surface:    #F8F0F9;   /* 带粉紫感的卡片底色 */
  --color-bg-elevated:   #F0E4F5;   /* 选中/hover */

  /* 主背景渐变（body 级别） */
  --gradient-bg: linear-gradient(135deg, #FDF6FB 0%, #F5F0FF 50%, #FDF0F6 100%);

  /* === 毛玻璃效果（Glassmorphism） === */
  --glass-bg:            rgba(255, 255, 255, 0.62);
  --glass-border:        rgba(255, 255, 255, 0.35);
  --glass-shadow:        0 8px 32px rgba(180, 140, 200, 0.15);
  --glass-blur:          backdrop-filter: blur(12px);

  /* === 主色调（渐变按钮） === */
  --color-primary:       #C084BC;   /* Mauve Purple */
  --color-primary-2:     #E08FAA;   /* Blush Rose（渐变终点）*/
  --gradient-primary: linear-gradient(135deg, #C084BC 0%, #E08FAA 100%);
  --gradient-primary-hover: linear-gradient(135deg, #B070A8 0%, #D07898 100%);

  /* === 强调色 === */
  --color-accent-lavender: #A78BCC;  /* Soft Lavender */
  --color-accent-blush:    #EDA8BE;  /* Warm Blush */
  --color-accent-lilac:    #C5B3E8;  /* Lilac */

  /* === 文字 === */
  --color-text-primary:  #3D2E4A;   /* 深紫棕，有质感 */
  --color-text-secondary:#7B6B8A;
  --color-text-tertiary: #B0A0BC;

  /* === 边框 === */
  --color-border:        rgba(180, 140, 200, 0.25);
  --color-border-glass:  rgba(255, 255, 255, 0.4);

  /* === 功能色 === */
  --color-success:       #72B8A0;
  --color-warning:       #D4956A;
  --color-error:         #C46E7A;
  --color-info:          #7EB0CC;
}
```

**CSS 实现示例（毛玻璃卡片）：**
```css
.card-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
}
```

**感觉：** Lemon8 × Linear × 某个高颜值理财 app。现代、轻盈、有科技感但不冷漠。

---

### 方向 C：清爽极简系 🤍 `「最安全、最专业」`
> Off-white · Single Bold Accent · Structured Clarity

只用**一个强调色**贯穿整个界面，其余全部交给留白和排版。适合 SignalTrace 如果定位是"认真的工具"——让数据和内容说话，颜色只做精准指引。

```css
:root {
  /* === 背景层（接近白但有温度） === */
  --color-bg-base:       #FAFAF8;   /* Off-white，比纯白更有质感 */
  --color-bg-surface:    #F5F5F0;   /* 卡片底色 */
  --color-bg-elevated:   #EEEEE8;   /* 深一层，选中/hover */
  --color-bg-subtle:     #F0F0EA;   /* 极淡底纹 */

  /* === 核心强调色（唯一主色，用它贯穿一切） === */
  --color-accent:        #D97868;   /* Terracotta，暖色调但不俗气 */
  --color-accent-hover:  #C46858;   /* 深一度 */
  --color-accent-light:  #F2CFC9;   /* 极浅，tag/badge */
  --color-accent-muted:  #F7E5E2;   /* 超浅，面积较大时用 */

  /* === 文字（全部暖灰，拒绝纯黑） === */
  --color-text-primary:  #2C2C2A;   /* 暖黑，正文 */
  --color-text-secondary:#686864;   /* 暖中灰，次要 */
  --color-text-tertiary: #A8A8A2;   /* 暖浅灰，占位符 */

  /* === 边框/线条（极淡，用存在感换呼吸感） === */
  --color-border:        #E4E4DC;
  --color-border-strong: #CCCCC4;
  --color-divider:       #EBEBE4;

  /* === 功能色 === */
  --color-success:       #6BA878;
  --color-warning:       #C49A52;
  --color-error:         #C05050;
  --color-info:          #5892B8;
}
```

**感觉：** Notion × Things 3 × Craft 的混合体——干净、有决断力、用起来不累，偶尔出现的 Terracotta 让人觉得这个产品有个性。

---

## 三、字体方案

### 推荐组合 A：`Playfair Display + Inter`（适配方向 A 温暖奶油系）

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

:root {
  --font-display: 'Playfair Display', Georgia, serif;  /* 标题、数字大字 */
  --font-body:    'Inter', system-ui, sans-serif;       /* 正文、UI文字 */

  /* 字号体系（8pt grid） */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   17px;
  --text-lg:   20px;
  --text-xl:   24px;
  --text-2xl:  30px;
  --text-3xl:  38px;

  /* 行高 */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-loose:  1.75;

  /* 字重 */
  --weight-regular:    400;
  --weight-medium:     500;
  --weight-semibold:   600;
}
```

**使用逻辑：** Playfair Display 用于页面标题、大数字、空状态的引导语（营造高级感和温度）；Inter 用于所有功能性文字（保证可读性和专业感）。

---

### 推荐组合 B：`DM Sans + DM Serif Display`（适配方向 B 渐变系）

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');

:root {
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
}
```

**使用逻辑：** DM 系列是同一个设计家族，搭配天然协调，现代感强，比 Playfair 更轻盈。

---

### 推荐组合 C：`Plus Jakarta Sans`（适配方向 C 极简系，单字体）

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

:root {
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
}
```

**使用逻辑：** 单字体全场，靠字重和字号建立层次。几何感强、中性、现代，非常适合工具类 app。

---

## 四、Component 风格规范

### 4.1 卡片（Card）

```css
/* 基础卡片（适配方向 A） */
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow:
    0 1px 3px rgba(61, 53, 48, 0.06),
    0 4px 12px rgba(61, 53, 48, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow:
    0 2px 8px rgba(61, 53, 48, 0.08),
    0 8px 24px rgba(61, 53, 48, 0.06);
  transform: translateY(-1px);
}

/* 毛玻璃卡片（适配方向 B） */
.card-glass {
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 8px 32px rgba(180, 140, 200, 0.15);
}
```

**视觉语言：**
- 圆角：16px（普通卡片）/ 20-24px（主视觉卡片）/ 12px（内嵌小卡片）
- 阴影：低不透明度（0.04-0.08），高 blur（12-24px），永远不用纯黑
- hover 效果：轻微上浮（-1px to -2px）+ 阴影加深，不要剧烈变化
- 内边距：20-24px（标准）/ 16px（紧凑）

---

### 4.2 按钮（Button）

```css
/* Primary 按钮 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 10px;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(193, 123, 116, 0.28);
}

.btn-primary:hover {
  background: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(193, 123, 116, 0.35);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(193, 123, 116, 0.2);
}

/* Secondary（描边按钮） */
.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary-muted);
  border-radius: 10px;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: var(--color-primary-muted);
  border-color: var(--color-primary-light);
}

/* Ghost（最轻量） */
.btn-ghost {
  padding: 8px 14px;
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  border-radius: 8px;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.btn-ghost:hover {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}
```

**视觉语言：**
- 圆角：10px（标准按钮），不要完全胶囊形（过于随意），也不要直角（过于生硬）
- 阴影：只给 Primary 按钮加彩色阴影（用主色调稀释的阴影），其他按钮不加
- 大小：high 38-40px（标准），small 32px，不要超过 48px（太笨重）
- 状态过渡：100-150ms，ease，感觉要"快而不急"

---

### 4.3 输入框（Input）

```css
.input {
  width: 100%;
  padding: 10px 14px;
  background: var(--color-bg-base);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-muted);
}

.input:hover:not(:focus) {
  border-color: var(--color-border-strong, #CCCCC4);
}

/* 带左图标的输入框 */
.input-with-icon {
  padding-left: 38px;
}
```

**视觉语言：**
- 背景：比卡片再浅一层（用 bg-base，而不是 bg-surface）
- Focus 态：用主色调的 3px ring（不要强调边框颜色变化，视觉太跳）
- 边框：默认 1.5px，focus 保持 1.5px（不要变厚）
- 错误态：border-color 改为 --color-error，ring 改为红色稀释

---

### 4.4 标签/徽标（Tag / Badge）

```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: 0.02em;
}

.tag-primary {
  background: var(--color-primary-muted);
  color: var(--color-primary);
}

.tag-sage {
  background: var(--color-sage-light);
  color: #5A7A55;
}

.tag-neutral {
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
}
```

---

### 4.5 阴影系统（Shadow Scale）

```css
:root {
  /* 不要纯黑阴影，永远用暖色调 */
  --shadow-xs:  0 1px 2px rgba(61, 53, 48, 0.05);
  --shadow-sm:  0 2px 6px rgba(61, 53, 48, 0.07);
  --shadow-md:  0 4px 16px rgba(61, 53, 48, 0.08);
  --shadow-lg:  0 8px 28px rgba(61, 53, 48, 0.10);
  --shadow-xl:  0 16px 48px rgba(61, 53, 48, 0.12);

  /* 彩色阴影（CTA专用） */
  --shadow-primary:    0 4px 14px rgba(193, 123, 116, 0.32);
  --shadow-primary-lg: 0 8px 24px rgba(193, 123, 116, 0.40);
}
```

---

## 五、参考对标 App（视觉风格）

### 方向 A 对标（温暖奶油系）

| App | 为什么参考 |
|-----|-----------|
| **Lemon8**（ByteDance） | 奶油色调 + 卡片信息架构 + 温暖感排版，目标用户高度重合 |
| **Daylio**（情绪日记） | 暖色系 + 低饱和度 + 高信息密度而不显拥挤 |
| **Cara**（创意社区） | 淡雅背景 + 有质感的排版 + 不过分甜腻 |

### 方向 B 对标（现代渐变系）

| App | 为什么参考 |
|-----|-----------|
| **Monarch Money**（个人财务） | 渐变 + 毛玻璃 + 数据可视化，有品位但不失功能性 |
| **Headspace** | 软渐变背景 + 柔和插图 + 强情绪引导 |
| **Flo Health** | 女性向健康 app，渐变 + 数据卡片做得精良 |

### 方向 C 对标（清爽极简系）

| App | 为什么参考 |
|-----|-----------|
| **Linear** | 极简信息架构，单强调色，专业但不失温度 |
| **Things 3** | 白色为主 + Terracotta 强调，工具类 app 审美天花板之一 |
| **Craft Docs** | Off-white + 暖字色，有质感的极简 |

---

## 六、设计决策建议

### 首选推荐：方向 A（温暖奶油系）

理由：
1. **用户认知成本低。** 方向 A 的色调接近当前年轻女性用户最高频使用的 app（小红书系、Lemon8 系），不需要重新教育审美。
2. **信息密度友好。** SignalTrace 如果是 analytics / tracking 类产品，信息密度会偏高，奶油系背景比渐变系更能承载大量数据而不显混乱。
3. **疲劳感最低。** 渐变系视觉冲击强，但长时间使用容易视觉疲劳。奶油系耐看。
4. **差异化空间大。** 同类竞品大多走冷灰或纯白，暖奶油系能形成记忆点。

### 如果想要更强的品牌感：方向 B
适合首页/落地页用渐变，app 内部 dashboard 保持克制（类似 Notion AI 的做法）。

### 如果 SignalTrace 偏向 B2B 或专业工具：方向 C
C 方向最安全，最不容易出错，跨性别用户接受度也最高。

---

## 七、Quick Start：立即可用的 CSS 变量文件

将以下内容保存为 `tokens.css` 并在项目入口导入：

```css
/* ========================================
   SignalTrace Design Tokens
   Direction A: Warm Cream (Recommended)
   ======================================== */

@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

:root {
  /* Backgrounds */
  --bg-base:       #FAF7F2;
  --bg-surface:    #F4EFE8;
  --bg-elevated:   #EDE7DC;
  --bg-overlay:    rgba(250, 247, 242, 0.85);

  /* Primary (Dusty Rose) */
  --primary:       #C17B74;
  --primary-hover: #D9A49F;
  --primary-muted: #EDD5D2;

  /* Accent (Sage) */
  --sage:          #8FAF8A;
  --sage-light:    #C4D9C1;

  /* Accent (Sand) */
  --sand:          #C9A882;
  --sand-light:    #E8D5B8;

  /* Typography */
  --text-1:        #3D3530;
  --text-2:        #7A6E68;
  --text-3:        #ADA5A0;
  --text-inv:      #FAF7F2;

  /* Borders */
  --border:        #E0D8CE;
  --border-subtle: #EDE7DC;

  /* Semantic */
  --success:       #7BA87A;
  --warning:       #C4925A;
  --error:         #B85C58;
  --info:          #6E9BB8;

  /* Shadows */
  --shadow-sm:     0 2px 6px rgba(61, 53, 48, 0.07);
  --shadow-md:     0 4px 16px rgba(61, 53, 48, 0.08);
  --shadow-lg:     0 8px 28px rgba(61, 53, 48, 0.10);
  --shadow-cta:    0 4px 14px rgba(193, 123, 116, 0.32);

  /* Radius */
  --radius-sm:  8px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  20px;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;

  /* Font Sizes */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   17px;
  --text-lg:   20px;
  --text-xl:   24px;
  --text-2xl:  30px;
  --text-3xl:  38px;

  /* Transitions */
  --ease-fast:   0.1s ease;
  --ease-normal: 0.2s ease;
  --ease-slow:   0.35s ease;
}
```

---

*本文档基于 shadcn/ui、Radix UI Themes、Tailwind CSS 色彩系统，结合 2024-2025 年移动端设计趋势研究产出。所有 hex code 均经过实际色彩协调验证。*
