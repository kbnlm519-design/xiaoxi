# Xiaoxi · 个人网站

一直往下滑的个人作品集网站，AI 主题，含开场动画、3D 照片球、视频展播与致谢页。

## 目录结构

```
Xiaoxi-Website/
├── index.html
├── css/style.css
├── js/
│   ├── main.js      # 鼠标、滚动、灯箱、BGM、星空
│   ├── moons.js     # 月亮散布 → AI 开场
│   └── sphere.js    # Three.js 3D 照片球
├── assets/
│   ├── images/
│   │   ├── thumbs/  # 球面贴图（512px）
│   │   └── medium/  # 点击放大图（1280px）
│   ├── video/showreel.mp4
│   └── audio/bgm.mp3   ← 把背景音乐放在这里（任意 mp3 重命名）
└── README.md
```

## 6 个滚动段

1. **开场** — 多个月亮散布飘动，1 秒后聚拢成 "AI" 字样
2. **Xiaoxi** — 名字大字 + 序言副标
3. **简介** — "下面是作品集 · 网站+作品 · 仅需两天 · 创造无限可能"
4. **作品集** — 45 张照片 3D 球面，拖拽旋转 / 滚轮缩放 / 点击放大
5. **视频** — AI 短剧 · AI 宣传片 · AI 视频 · "让你实现前所未有的创意"
6. **致谢** — "AI 时代，年轻的我永远无限可能 · 感谢观看 · 我是晓汐"

## 运行方式

⚠ **必须用本地服务器打开**（Three.js / 视频在 file:// 下会被浏览器拦截）。

任选一种：

### 方法 A — Python（最常见）
```powershell
cd C:\Users\wu\Desktop\Xiaoxi-Website
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

### 方法 B — Node.js
```powershell
cd C:\Users\wu\Desktop\Xiaoxi-Website
npx serve
```

### 方法 C — VS Code Live Server 扩展
在 VS Code 里打开此文件夹 → 右下角 "Go Live"。

## 配置 BGM

1. 准备一首 MP3（建议 1-3 分钟，舒缓 / 电子 / 氛围类）
2. 重命名为 `bgm.mp3`
3. 放进 `assets/audio/` 文件夹
4. 刷新页面，点击右上角圆形按钮即可播放

> 浏览器策略：BGM 必须由**用户点击**触发，不能自动播放（安全限制）。

## 自定义

- **改文字**：直接编辑 `index.html` 里对应 section
- **换头像 / 加更多照片**：把图丢进 `assets/images/medium/`，并生成 512px 缩略图丢进 `assets/images/thumbs/`，命名 `photo_46.jpg, photo_47.jpg…`，在 `js/sphere.js` 顶部把 `COUNT = 45` 改成新数量
- **换主色**：编辑 `css/style.css` 顶部 `:root` 里的颜色变量

## 部署到线上

这是纯静态站点，可直接上传到：
- Vercel / Netlify（拖拽文件夹即可）
- GitHub Pages
- 任意静态托管

注意视频体积 74MB；如要上传到 Vercel 免费版（单文件限 100MB 但带宽有限），建议把视频转 H.265 或上传到 B 站/抖音后 iframe 嵌入。
