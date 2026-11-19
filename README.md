# morningCPU 的博客

记录我的所学所想，让我们一起分享和传递知识

## 发布说明

- `main` 分支保存源码，GitHub Actions 构建后把 `public/` 发布到 `gh-pages` 分支。
- 首次部署前，请在仓库 `Settings > Pages` 中设置：
  - Source: `Deploy from a branch`
  - Branch: `gh-pages` / `(root)`
- 构建命令为 `hugo --minify --gc`，草稿（`draft = true`）不会发布到线上。
- 新文章默认不引用封面；如需统一默认封面，可放置 `assets/title.webp`，管理器会复制到新文章目录的 `assets/`。
- `public/`、`resources/`、`.hugo_build.lock`、`hugo.exe` 已在 `.gitignore` 中忽略。
  如果它们之前已被 Git 跟踪，需要执行一次：

  ```powershell
  git rm -r --cached public resources hugo.exe .hugo_build.lock
  git commit -m "chore: stop tracking generated files"
  ```

## 文章附件

- 每篇文章的 `index.md` 同级可以放任意文件夹和文件（如 `code/`、PDF、压缩包、HTML 报告），供正文链接使用。
- 图片和普通附件由 Hugo 自动发布；`.html` 等默认不发布的文件会在构建时同步到文章 URL 下，可直接通过 `[报告](code/report.html)` 打开。
- Markdown 链接里的反斜杠会自动转换为 `/`，指向文章目录内文件时会解析为实际发布地址。

## 文章分享

- 文章页提供复制链接和复制分享卡片。
- 构建时会按文章标题、摘要、发布日期和分类自动生成 1200×630 分享卡片。
- 分享卡片会自动写入 `og:image` 和 `twitter:image`，链接预览无需手动配图。
- 微信/QQ 链接预览额外使用 `image_src`、`thumbnail`、`itemprop` 和 600×600 方形缩略图。
