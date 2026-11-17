# morningCPU 的博客

记录我的所学所想，让我们一起分享和传递知识

## 发布说明

- `main` 分支保存源码，GitHub Actions 构建后把 `public/` 发布到 `gh-pages` 分支。
- 首次部署前，请在仓库 `Settings > Pages` 中设置：
  - Source: `Deploy from a branch`
  - Branch: `gh-pages` / `(root)`
- 构建命令为 `hugo --minify --gc`，草稿（`draft = true`）不会发布到线上。
- 新文章默认不引用封面；如需统一默认封面，可放置 `static/images/title.webp`，管理器会复制到新文章目录。
- `public/`、`resources/`、`.hugo_build.lock`、`hugo.exe` 已在 `.gitignore` 中忽略。
  如果它们之前已被 Git 跟踪，需要执行一次：

  ```powershell
  git rm -r --cached public resources hugo.exe .hugo_build.lock
  git commit -m "chore: stop tracking generated files"
  ```
