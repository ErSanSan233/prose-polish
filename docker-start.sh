#!/bin/bash

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "\n${GREEN}正在安装项目依赖..."
    npm install
fi

# 读取启动模式，1 为完整模式，2 为本地模式
mode=${MODE:-1}  # 默认值为 1

case $mode in
    1)
        echo "正在启动完整模式..."
        npm start
        ;;
    2)
        echo "正在启动本地模式..."
        npm run dev
        ;;
    *)
        echo "无效的启动模式，请设置 MODE 环境变量为 1 或 2。"
        exit 1
        ;;
esac
