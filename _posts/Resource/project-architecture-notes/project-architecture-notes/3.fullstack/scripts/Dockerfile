# 打包当前工程到 docker 镜像中
FROM node:18-alpine

# 复制当前工程到镜像中
COPY . /app

# 切换到镜像中的 /app 目录
WORKDIR /app

# 安装依赖
RUN pnpm install

# 启动工程
CMD ["pnpm", "start"]