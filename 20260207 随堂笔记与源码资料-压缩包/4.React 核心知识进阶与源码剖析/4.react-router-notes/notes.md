# React19 路由方案与原理详解

## React-Router 基础使用

为什么有了状态还要考虑路由？
url、uri，地址跟资源匹配

前后端不分离
/api/getCurrentUser    ->   controller 返回当前用户数据
/index.html            ->   index.html 资源文件

前后端分离
/user                  ->   页面不在服务端，前端负责整个界面层开发，执行 js 动态创建 html 片段拼接页面 SPA
/detail
/home
这个时候前端决定了路由和组件的匹配关系


## React Router 实现原理剖析

地址栏变化 -> 状态更新 -> 视图更新