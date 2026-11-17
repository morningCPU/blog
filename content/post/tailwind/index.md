+++
author = "morning"
title = 'Tailwind CSS 使用笔记'
description = "在 Node.js 项目中配置 Tailwind CSS 与 PostCSS 的实践记录"
date = 2026-02-19T17:41:44+08:00
image = "images/title.webp"

readingtime=true
math= false

categories = ["tailwindcss"]
tags = ["PostCSS", "前端工程"]

slug= "002"

series = []
aliases = []

draft = false
+++

## **1.** 使用
### **1.1** 要在node.js中使用
`npm init -y`
### **1.2** 安装一些需要的功能
tailwindcss,postcss-cli,autoprefixer
autoprefixer是postcss-cli的一个插件，使用postcss是为了对tailwindcss进行解析
注意要使用postcss的话tailwindcss要使用3.14.7版本，不然会冲突
`npm install tailwindcss@3.4.17 postcss-cli autoprefixer`
### **1.3** 初始化配置文件   
`npx init tailwindcss`   
完善content(tailwind.config.js)
就是给出要使用tailwindcss的文件   
```javascript
content: ["./public/**/*.{html,js}"],
```
### **1.4** 将加载 Tailwind 的指令添加到 CSS 文件中
这里写在 /css/tailwind.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
### **1.5** 配置postcss   
配置package.json
```javascript
"scripts": {
  "build": "postcss ./css/tailwind.css -o ./public/build/tailwind.css --watch"
},
```
配置postcss.config.js
```javascript
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
    plugins: [
        tailwindcss,
        autoprefixer,
    ],
};
```
### **1.6** 运行bulid   
`npm run build`
### **1.7** 编写html,引入build的tailwind.css   
注意要引入build生成的tailwind.css文件
```html
<h1 class="text-4xl font-bold text-center text-blue-500">Hello World!</h1>
```

***

## **2.** 一些基本的用法
### **2.1** 基本  
bg,px,py,mx,my,mt,h,rounded,shadow

### **2.2** 响应式布局
大小：default,sm,md,lg,xl
sm:...
也就是在不同的大小有不同的样式

### **2.3** 鼠标悬停与焦点
+ `hover:`
+ `focus:`
+ `active:`

### **2.4** 自定义样式组
`@apply`
ex.
```css
.btn {
    @apply block text-center mt-6 bg-blue-900 w-28 text-white mx-auto rounded-lg hover:bg-blue-200 active:bg-red-600;
}
```
+ 注意写在`@tailwind utilities;`上面,从而还能添加样式

### **2.5** 自定义系统
在`tailwind.config.js`的`extend: {},`中添加   
有哪些可以通过 `npx tailwindcss init tailwind-full.config.js --full`进行查看   
这个的作用是生成一个有完整默认配置的文件(不用担心会不会覆盖原来的，是一个新的文件，并且tailwind的默认配置文件名就是tailwein.config.js,要使用tailwind-full.config.js要使用 `npx tailwindcss -c tailwind-full.config.js
`)

### **2.6** 图标资源推荐
+ https://heroicons.com/
