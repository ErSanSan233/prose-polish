# 使用 Node.js 官方镜像作为基础镜像
FROM node:20.17.0

# 设置工作目录
WORKDIR /app

# 将项目文件复制到容器内
COPY . /app

# 安装项目依赖
RUN npm install

# 暴露端口
EXPOSE 3000

# 设置启动脚本为可执行文件
RUN chmod +x /app/docker-start.sh

# 定义默认的启动命令
CMD ["/app/docker-start.sh"]
