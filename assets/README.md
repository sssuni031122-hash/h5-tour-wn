# H5 正式素材替换说明

当前页面会在素材文件不存在时自动显示灰色占位框。设计师交付后，按下面文件名放入图片即可，无需修改 HTML、CSS 或 JavaScript。

## 统一输出尺寸

- 所有设计稿按 750px 宽度制作，在网页中按 375px 逻辑宽度显示。
- 设计稿 40px 安全边距，对应网页 20px。
- P1：750 × 1624px。
- P2：750 × 2000px。
- P3-1 至 P3-8：750 × 2600px；长文版本可延长至 3000px。
- P4：750 × 1624px。
- P5 顶部主视觉：750 × 420px。
- P1 按钮：325 × 180px；P2 按钮：325 × 240px。
- P3 通用按钮及 P5 提交按钮：670 × 104px。
- P4 两个按钮：670 × 160px。

## 页面主视觉

- `pages/p1-home.jpg`
- `pages/p2-overview.jpg`
- `pages/p4-entry.jpg`
- `pages/p5-form.jpg`

## 景点主图

- `spots/01-huashan.jpg`
- `spots/02-cangjiemiao.jpg`
- `spots/03-qiachuan.jpg`
- `spots/04-hancheng.jpg`
- `spots/05-tongguan.jpg`
- `spots/06-fengtuyicang.jpg`
- `spots/07-yaotouyao.jpg`
- `spots/08-laojie.jpg`

## 建议格式

- RGB 色彩模式。
- JPG/WebP 用于无透明背景图，PNG 用于需透明的素材。
- 建议设计基准宽度 750px。
- 首屏图片尽量不超过 2MB，单张景点图建议不超过 500KB。

如果设计师交付的扩展名不是 `.jpg`，请在 `config.js` 中只修改对应的素材路径。
