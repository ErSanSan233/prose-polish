export class ConnectionManager {
    constructor() {
        this.connections = new Map(); // 存储所有连接
        this.portConnections = new Map(); // 存储端口的连接状态
        this.chainConnections = new Map(); // 存储链式连接的状态
        this.svgContainer = document.querySelector('.connections-container');
        this.currentConnection = null; // 当前正在创建的连接
        this.startPort = null; // 开始连接的端口
        
        this.setupEventListeners();
        this.setupScrollListeners();
    }

    // 设置事件监听
    setupEventListeners() {
        // 监听所有端口的鼠标按下事件
        document.addEventListener('mousedown', (e) => {
            const port = e.target.closest('.connection-port, .text-card-port, .text-card-chain-port');
            if (!port) return;

            // 检查是否是从插座开始拖拽
            if (port.classList.contains('text-card-port')) {
                // 如果是插座，找到下方的卡片并选择它
                const card = port.closest('.paragraph-card');
                if (card) {
                    // 获取卡片的坐标
                    const cardRect = card.getBoundingClientRect();
                    // 触发卡片的拖动逻辑，并传入相对坐标
                    card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: e.clientX, clientY: e.clientY}));
                }
                return;
            }

            this.startConnection(port, e);
        });

        // 监听鼠标移动
        document.addEventListener('mousemove', (e) => {
            if (this.currentConnection) {
                this.updateTempConnection(e);
            }
        });

        // 监听鼠标松开
        document.addEventListener('mouseup', (e) => {
            if (!this.currentConnection) return;

            const endPort = e.target.closest('.connection-port, .text-card-port, .text-card-chain-port');
            if (endPort && this.canConnect(this.startPort, endPort)) {
                this.completeConnection(endPort);
            } else {
                this.cancelConnection();
            }
        });
    }

    // 设置滚动监听
    setupScrollListeners() {
        // 监听提示词卡片区域的滚动
        const promptCards = document.querySelector('.prompt-cards');
        promptCards.addEventListener('scroll', () => {
            requestAnimationFrame(() => this.updateConnections());
        });

        // 监听段落卡片区域的滚动
        const paragraphContainer = document.querySelector('.paragraph-container');
        paragraphContainer.addEventListener('scroll', () => {
            requestAnimationFrame(() => this.updateConnections());
        });

        // 监听整个页面的滚动
        window.addEventListener('scroll', () => {
            requestAnimationFrame(() => this.updateConnections());
        });

        // 使用 MutationObserver 监听卡片内容变化
        const observer = new MutationObserver(() => {
            requestAnimationFrame(() => this.updateConnections());
        });

        // 监听段落容器的变化
        observer.observe(paragraphContainer, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['style']
        });
    }

    // 检查端口是否已经连接
    isPortConnected(port) {
        // 对于文本卡片的蓝色插座，允许同时连接提示词卡片和其他文本卡片
        if (port.classList.contains('text-card-port')) {
            // 获取当前端口的连接ID
            const portId = port.dataset.cardId;
            const chainConnectionId = this.portConnections.get(`${portId}_chain`);
            const promptConnectionId = this.portConnections.get(`${portId}_prompt`);
            
            // 检查是否已经有连接
            if (chainConnectionId !== undefined || promptConnectionId !== undefined) {
                return true; // 如果已经有连接，返回
            }

            // 如果当前尝试建立的是链式连接（来自紫色插头）
            if (this.startPort?.classList.contains('text-card-chain-port')) {
                return false; // 不允许多个插头
            }
            // 如果当前尝试建立的是提示词连接
            if (this.startPort?.classList.contains('connection-port')) {
                return false; // 不允许多个插头
            }
            return false;
        }
        
        // 对于紫色插头，只检查它自己的连接状态
        if (port.classList.contains('text-card-chain-port')) {
            return this.portConnections.has(port.dataset.cardId);
        }
        
        // 对于提示词卡片的黄色插头，保持单一连接
        return this.portConnections.has(port.dataset.portId);
    }

    // 添加端口连接
    addPortConnection(port1, port2, connectionId) {
        const port1Id = port1.dataset.portId || port1.dataset.cardId;
        const port2Id = port2.dataset.portId || port2.dataset.cardId;
        
        // 如果是文本卡片的蓝色插座，使用复合键来存储不同类型的连接
        if (port2.classList.contains('text-card-port')) {
            const connectionType = port1.classList.contains('text-card-chain-port') ? 'chain' : 'prompt';
            this.portConnections.set(`${port2Id}_${connectionType}`, connectionId);
        } else {
            this.portConnections.set(port2Id, connectionId);
        }
        
        // 对于发起连接的端口，始终使用单一连接
        this.portConnections.set(port1Id, connectionId);
    }

    // 移除卡片的所有连接
    removeCardConnections(cardId) {
        // 找到所有与该卡片相关的端口
        const ports = document.querySelectorAll(`[data-port-id^="${cardId}_port_"]`);
        ports.forEach(port => {
            this.removePortConnection(port);
        });
    }

    // 移除端口连接
    removePortConnection(port) {
        const isTextCardPort = port.classList.contains('text-card-port');
        let connectionIds = [];
        
        if (isTextCardPort) {
            // 对于文本卡片的蓝色插座，获取所有类型的连接
            const portId = port.dataset.cardId;
            const chainConnectionId = this.portConnections.get(`${portId}_chain`);
            const promptConnectionId = this.portConnections.get(`${portId}_prompt`);
            if (chainConnectionId) connectionIds.push(chainConnectionId);
            if (promptConnectionId) connectionIds.push(promptConnectionId);
            
            // 移除连接类型标识
            port.classList.remove('prompt-connected', 'chain-connected');
            
            // 确保SVG恢复初始状态（无旋转）
            const svg = port.querySelector('svg');
            if (svg) {
                svg.style.transform = 'none';
            }
        } else {
            // 对于其他端口，获取单一连接
            const connectionId = this.portConnections.get(port.dataset.portId || port.dataset.cardId);
            if (connectionId) connectionIds.push(connectionId);
        }

        // 移除所有相关连接
        connectionIds.forEach(connectionId => {
            const connection = this.connections.get(connectionId);
            if (connection) {
                // 移除连接状态类
                connection.startPort.classList.remove('connected');
                connection.endPort.classList.remove('connected');
                
                // 确保蓝色插座恢复初始状态
                if (connection.endPort.classList.contains('text-card-port')) {
                    const svg = connection.endPort.querySelector('svg');
                    if (svg) {
                        // svg.style.transform = 'none';
                    }
                    connection.endPort.classList.remove('prompt-connected', 'chain-connected');
                    
                    // 恢复原始SVG路径
                    const path = connection.endPort.querySelector('path');
                    path.setAttribute('d', 'M 512 256 C 512 114.615112 397.384888 0 256 0 C 114.615105 0 0 114.615112 0 256 C 0 397.384888 114.615105 512 256 512 C 397.384888 512 512 397.384888 512 256 Z M 40 256 C 40 136.706482 136.706497 40 256 40 C 375.293518 40 472 136.706482 472 256 C 472 375.293518 375.293518 472 256 472 C 136.706497 472 40 375.293518 40 256 Z M 255.27803 429.907074 C 159.728485 429.907074 82 352.171173 82 256.629089 C 82 161.086945 159.732193 83.354767 255.27803 83.354767 C 350.816406 83.354767 428.552307 161.086945 428.552307 256.629089 C 428.552307 352.174866 350.816406 429.907074 255.27803 429.907074 Z M 181.997467 230.213196 C 167.426392 230.213196 155.581589 242.061707 155.581589 256.629089 C 155.581589 271.196442 167.426392 283.044922 181.997467 283.044922 C 196.564819 283.044922 208.41333 271.196442 208.41333 256.629089 C 208.41333 242.061707 196.564819 230.213196 181.997467 230.213196 Z M 330.441895 230.213196 C 315.870789 230.213196 304.022308 242.061707 304.022308 256.629089 C 304.022308 271.196442 315.870789 283.044922 330.441895 283.044922 C 345.005524 283.044922 356.857788 271.196442 356.857788 256.629089 C 356.857788 242.061707 345.005524 230.213196 330.441895 230.213196 Z');
                    
                    // 移除第二个路径
                    const path2 = connection.endPort.querySelector('path:nth-child(2)');
                    if (path2) {
                        path2.remove();
                    }
                }

                // 移除连接线
                connection.line.remove();
                // 移除连接记录
                this.connections.delete(connectionId);

                // 清理端口连接状态
                const startPort = connection.startPort;
                const endPort = connection.endPort;
                
                if (startPort.classList.contains('text-card-chain-port')) {
                    this.portConnections.delete(`${endPort.dataset.cardId}_chain`);
                } else if (startPort.classList.contains('connection-port')) {
                    this.portConnections.delete(`${endPort.dataset.cardId}_prompt`);
                }
                this.portConnections.delete(startPort.dataset.portId || startPort.dataset.cardId);

                // 更新提示词卡片的连接状态
                if (startPort.classList.contains('connection-port')) {
                    const promptCard = this.getPromptCard(startPort);
                    if (promptCard) {
                        const portIndex = parseInt(startPort.dataset.portId.split('_port_')[1]) - 1;
                        promptCard.removeConnection(portIndex);
                    }
                }
            }
        });
    }

    // 开始创建连接
    startConnection(port, event) {
        // 如果端口已经连接，先移除旧连接
        if (this.isPortConnected(port)) {
            this.removePortConnection(port);
        }

        this.startPort = port;
        port.classList.add('connecting');

        // 添加防止选择的类
        document.body.classList.add('connecting-mode');

        // 创建临时连接线
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.classList.add('connection-line', 'temp');
        this.svgContainer.appendChild(line);
        this.currentConnection = line;

        // 更新连接线位置
        this.updateTempConnection(event);
    }

    // 更新临时连接线
    updateTempConnection(event) {
        const startRect = this.startPort.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const endX = event.clientX;
        const endY = event.clientY;

        // 创建贝塞尔曲线
        const path = this.createCurvePath(startX, startY, endX, endY);
        this.currentConnection.setAttribute('d', path);
    }

    // 完成连接
    completeConnection(endPort) {
        // 如果没有当前连接或起始端口，则创建一个新的连接线
        if (!this.currentConnection) {
            console.log("创建新的连接线");
            const line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            );
            line.classList.add("connection-line");
            this.svgContainer.appendChild(line);
            this.currentConnection = line;
        }
        // 移除防止选择的类
        document.body.classList.remove('connecting-mode');

        // 移除临时状态
        this.startPort.classList.remove('connecting');
        endPort.classList.remove('connecting');

        // 添加连接状态
        this.startPort.classList.add('connected');
        endPort.classList.add('connected');

        // 修改SVG路径
        if (this.startPort.classList.contains('text-card-chain-port') || 
            this.startPort.classList.contains('connection-port')) {
            const path = this.startPort.querySelector('path');
            path.setAttribute('d', 'M 82 256.629089 C 82 352.171173 159.728485 429.907074 255.27803 429.907074 C 350.816406 429.907074 428.552307 352.174866 428.552307 256.629089 C 428.552307 161.086945 350.816406 83.354767 255.27803 83.354767 C 159.732193 83.354767 82 161.086945 82 256.629089 Z M 255.277603 390.354767 C 181.538361 390.354767 121.552307 330.362976 121.552307 256.629517 C 121.552307 182.895966 181.541214 122.907074 255.277603 122.907074 C 329.00824 122.907074 389 182.895966 389 256.629517 C 389 330.365845 329.00824 390.354767 255.277603 390.354767 Z M 255.277161 164 C 204.199738 164 162.645233 205.554504 162.645233 256.629944 C 162.645233 307.705353 204.197754 349.261841 255.277161 349.261841 C 306.350586 349.261841 347.907074 307.707336 347.907074 256.629944 C 347.907074 205.554504 306.350586 164 255.277161 164 Z');
        }

        // 修改蓝色插座的SVG路径
        if (endPort.classList.contains('text-card-port')) {
            const path = endPort.querySelector('path');
            // 设置第一个路径
            path.setAttribute('d', 'M 148 23.829071 C 60.587349 64.560425 0 153.204742 0 256 C 0 397.384888 114.615105 512 256 512 C 397.384888 512 512 397.384888 512 256 C 512 152.813232 450.950226 63.885376 363 23.365753 L 363 68.322052 C 428.113617 105.525055 472 175.637421 472 256 C 472 375.293518 375.293518 472 256 472 C 136.706497 472 40 375.293518 40 256 C 40 176.0495 83.437454 106.244354 148 68.896942 L 148 23.829071 Z');
            
            // 添加第二个路径
            let path2 = endPort.querySelector('path:nth-child(2)');
            if (!path2) {
                path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                endPort.querySelector('svg').appendChild(path2);
            }
            path2.setAttribute('d', 'M 226.710999 12.780029 L 226.710999 -28 L 285.289001 -28 L 285.289001 12.780029 L 303.932007 12.780029 C 318.192993 12.780029 329.761017 24.346985 329.761017 38.608032 L 329.761017 84.307007 C 377.085999 105.748993 410.032013 153.360992 410.032013 208.692993 L 410.032013 265.661987 L 410.031006 265.661987 L 410.031006 332.503998 C 353.622009 332.503998 353.622009 332.503998 353.622009 332.503998 L 353.622009 359.466003 L 304.947021 359.466003 L 304.947021 332.503998 C 207.054993 332.503998 207.054993 332.503998 207.054993 332.503998 L 207.054993 359.466003 L 158.377991 359.466003 L 158.377991 332.503998 L 101.967987 332.503998 L 101.967987 250.541992 L 101.968994 250.541992 L 101.968994 208.692993 C 101.968994 153.360992 134.90799 105.747986 182.23999 84.307007 L 182.23999 38.608032 C 182.23999 24.346985 193.800995 12.780029 208.069 12.780029 Z');
            path2.setAttribute('fill', '#00b894');
        }

        // 根据连接类型添加额外的类名
        if (endPort.classList.contains('text-card-port')) {
            if (this.startPort.classList.contains('connection-port')) {
                endPort.classList.add('prompt-connected');
            } else if (this.startPort.classList.contains('text-card-chain-port')) {
                endPort.classList.add('chain-connected');
            }
        }

        // 更新连接线样式
        this.currentConnection.classList.remove('temp');

        // 存储连接信息
        const connectionId = `connection_${Date.now()}`;

        // 记录端口ID信息，用于调试
        const startPortId =
            this.startPort.dataset.portId || this.startPort.dataset.cardId;
        const endPortId = endPort.dataset.portId || endPort.dataset.cardId;
        console.log(
            `创建连接: ${connectionId}, 从 ${startPortId} (${this.getPortType(
                this.startPort
            )}) 到 ${endPortId} (${this.getPortType(endPort)})`
        );

        this.connections.set(connectionId, {
            id: connectionId,
            startPort: this.startPort,
            endPort: endPort,
            line: this.currentConnection
        });

        // 记录端口的连接状态
        this.addPortConnection(this.startPort, endPort, connectionId);

        // 处理不同类型的连接
        if (this.startPort.classList.contains('text-card-chain-port') || 
            endPort.classList.contains('text-card-chain-port')) {
            // 文本卡片链接
            this.handleChainConnection(this.startPort, endPort);
        } else {
            // 提示词卡片连接
            this.handlePromptConnection(this.startPort, endPort);
        }

        // 立即更新连接线位置，确保端点在端口中心
        const startRect = this.startPort.getBoundingClientRect();
        const endRect = endPort.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;
        
        const path = this.createCurvePath(startX, startY, endX, endY);
        this.currentConnection.setAttribute('d', path);

        // 重置当前连接状态
        this.currentConnection = null;
        this.startPort = null;

        // 触发保存操作，确保连接数据被保存
        if (window.storageManager) {
            console.log("连接创建完成，触发保存操作");
            setTimeout(() => {
                window.storageManager.saveToLocalStorage();
            }, 100); // 短暂延迟，确保DOM更新完成
        } else {
            console.warn("storageManager不存在，无法保存连接数据");
        }
    }

    // 取消连接
    cancelConnection() {
        if (this.currentConnection) {
            this.currentConnection.remove();
            this.currentConnection = null;
        }
        
        if (this.startPort) {
            this.startPort.classList.remove('connecting');
            
            // 如果是提示词卡片的端口或文本卡片的链式端口，需要恢复原始的插头形状
            if (this.startPort.classList.contains('connection-port') || 
                this.startPort.classList.contains('text-card-chain-port')) {
                const path = this.startPort.querySelector('path');
                path.setAttribute('d', 'M 285.289001 471.220001 L 285.289001 512 L 226.710999 512 L 226.710999 471.220001 L 208.067993 471.220001 C 193.807007 471.220001 182.238998 459.653015 182.238998 445.391998 L 182.238998 369.692993 C 134.914001 348.251007 101.968002 300.639008 101.968002 245.307007 L 101.968002 188.338013 L 101.969002 188.338013 L 101.969002 121.496002 L 158.378006 121.496002 L 158.378006 13.533997 C 158.378006 6.059998 164.431 0 171.904999 0 L 193.526993 0 C 201.001007 0 207.054001 6.059998 207.052994 13.533997 L 207.052994 121.496002 L 304.945007 121.496002 L 304.945007 13.533997 C 304.945007 6.059998 311.005005 0 318.471985 0 L 340.10199 0 C 347.569 0 353.622009 6.059998 353.622009 13.533997 L 353.622009 121.496002 L 410.032013 121.496002 L 410.032013 203.458008 L 410.031006 203.458008 L 410.031006 245.307007 C 410.031006 300.639008 377.09201 348.252014 329.76001 369.692993 L 329.76001 445.391998 C 329.76001 459.653015 318.199005 471.220001 303.931 471.220001 L 285.289001 471.220001 Z');
            }
            
            this.startPort = null;
        }
        
        document.body.classList.remove('connecting-mode');
    }

    // 检查是否可以连接
    canConnect(startPort, endPort) {
        if (!startPort || !endPort || startPort === endPort) return false;

        // 如果目标端口已经连接，不允许连接
        if (this.isPortConnected(endPort)) return false;

        // 检查是否是文本卡片之间的链接
        const isChainConnection = startPort.classList.contains('text-card-chain-port') || 
                                endPort.classList.contains('text-card-chain-port');
        
        if (isChainConnection) {
            // 文本卡片链接的规则：
            // 1. 一个是紫色插头，一个是蓝色插座
            const isStartChain = startPort.classList.contains('text-card-chain-port');
            const isEndSocket = endPort.classList.contains('text-card-port');
            
            // 2. 防止形成环
            if (isStartChain && isEndSocket) {
                return !this.wouldFormLoop(startPort, endPort);
            }
            return false;
        }

        // 原有的提示词卡片连接规则
        const isStartPrompt = startPort.classList.contains('connection-port');
        const isEndText = endPort.classList.contains('text-card-port');
        const isStartText = startPort.classList.contains('text-card-port');
        const isEndPrompt = endPort.classList.contains('connection-port');

        return (isStartPrompt && isEndText) || (isStartText && isEndPrompt);
    }

    // 检查是否会形成环
    wouldFormLoop(startPort, endPort) {
        const startCard = startPort.closest('.paragraph-card');
        const endCard = endPort.closest('.paragraph-card');
        
        // 检查是否已经存在从终点到起点的路径
        const visited = new Set();
        const checkPath = (currentCard) => {
            if (currentCard === startCard) return true;
            if (visited.has(currentCard)) return false;
            
            visited.add(currentCard);
            const chainPort = currentCard.querySelector('.text-card-chain-port');
            if (!chainPort) return false;
            
            const connectionId = this.portConnections.get(chainPort.dataset.cardId);
            if (!connectionId) return false;
            
            const connection = this.connections.get(connectionId);
            if (!connection) return false;
            
            const nextCard = connection.endPort.closest('.paragraph-card');
            return checkPath(nextCard);
        };
        
        return checkPath(endCard);
    }

    // 创建贝塞尔曲线路径
    createCurvePath(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;

        // 检查是否是文本卡片之间的链接（通过检查起点是否是紫色插头）
        const isChainConnection = this.startPort?.classList.contains('text-card-chain-port');
        
        if (isChainConnection) {
            // 文本卡片之间的链接：使用竖直控制点
            // 确保终点的控制点永远在终点上方
            const distance = Math.abs(dy); // 计算垂直距离
            const controlY1 = startY + dy * 0.5; // 起点控制点
            const controlY2 = endY - 60; // 终点控制点固定在终点上方50px处
            
            // 如果起点在终点下方，增加控制点的垂直距离以获得更平滑的曲线
            if (startY > endY) {
                return `M ${startX} ${startY} C ${startX} ${startY - distance * 0.5}, ${endX} ${controlY2}, ${endX} ${endY}`;
            } else {
                return `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
            }
        } else {
            // 提示词卡片到文本卡片的链接：使用水平控制点
            // 调整控制点权重，使终点处的弯曲更明显
            const controlX1 = startX + dx * 0.3; // 起点控制点权重减小到0.3
            const controlY1 = startY;
            const controlX2 = endX - dx * 0.7;   // 终点控制点权重增加到0.7
            const controlY2 = endY;
            return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
        }
    }

    // 获取提示词卡片实例
    getPromptCard(port) {
        const cardElement = port.closest('.prompt-card');
        if (!cardElement) return null;
        return window.cardManager.cards.get(cardElement.id);
    }

    // 获取文本卡片元素
    getTextCard(port) {
        return port.closest('.paragraph-card');
    }

    // 更新所有连接线的位置
    updateConnections() {
        this.connections.forEach(connection => {
            const startRect = connection.startPort.getBoundingClientRect();
            const endRect = connection.endPort.getBoundingClientRect();
            const startX = startRect.left + startRect.width / 2;
            const startY = startRect.top + startRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;

            // 临时保存当前的startPort，以便createCurvePath方法使用
            const originalStartPort = this.startPort;
            this.startPort = connection.startPort;
            
            const path = this.createCurvePath(startX, startY, endX, endY);
            connection.line.setAttribute('d', path);
            
            // 恢复原始的startPort
            this.startPort = originalStartPort;
        });
    }

    // 处理文本卡片之间的链接
    handleChainConnection(startPort, endPort) {
        const startCard = startPort.closest('.paragraph-card');
        const endCard = endPort.closest('.paragraph-card');
        
        // 记录链接关系
        this.chainConnections.set(startCard.dataset.cardId, endCard.dataset.cardId);
    }

    // 处理提示词卡片的连接
    handlePromptConnection(startPort, endPort) {
        const promptPort = startPort.classList.contains('connection-port') ? startPort : endPort;
        const textPort = startPort.classList.contains('text-card-port') ? startPort : endPort;
        const promptCard = this.getPromptCard(promptPort);
        const textCard = this.getTextCard(textPort);

        if (promptCard && textCard) {
            const portIndex = parseInt(promptPort.dataset.portId.split('_port_')[1]) - 1;
            // 获取链接文本，包括所有链接的卡片
            const content = this.getCombinedContent(textCard);
            promptCard.updateConnection(portIndex, content);
        }
    }

    // 获取组合后的文本内容
    getCombinedContent(startCard) {
        const contents = [];
        let currentCard = startCard;
        const visited = new Set();

        while (currentCard && !visited.has(currentCard.dataset.cardId)) {
            visited.add(currentCard.dataset.cardId);
            contents.push(currentCard.querySelector('.card-content').textContent);

            // 查找下一个链接的卡片
            const chainPort = currentCard.querySelector('.text-card-chain-port');
            if (!chainPort) break;

            const connectionId = this.portConnections.get(chainPort.dataset.cardId);
            if (!connectionId) break;

            const connection = this.connections.get(connectionId);
            if (!connection) break;

            currentCard = connection.endPort.closest('.paragraph-card');
            if (visited.has(currentCard?.dataset.cardId)) break;
        }

        return contents.join('\\n');
    }

    // 清除所有连接
    clearAllConnections() {
        // 获取所有端口
        const allPorts = document.querySelectorAll('.text-card-port, .text-card-chain-port, .connection-port');
        
        // 重置每个端口的状态
        allPorts.forEach(port => {
            // 移除所有连接相关的类
            port.classList.remove('connected', 'prompt-connected', 'chain-connected');
            
            // 重置SVG路径
            if (port.classList.contains('text-card-port')) {
                // 重置蓝色插座的SVG
                const path = port.querySelector('path');
                path.setAttribute('d', 'M 512 256 C 512 114.615112 397.384888 0 256 0 C 114.615105 0 0 114.615112 0 256 C 0 397.384888 114.615105 512 256 512 C 397.384888 512 512 397.384888 512 256 Z M 40 256 C 40 136.706482 136.706497 40 256 40 C 375.293518 40 472 136.706482 472 256 C 472 375.293518 375.293518 472 256 472 C 136.706497 472 40 375.293518 40 256 Z M 255.27803 429.907074 C 159.728485 429.907074 82 352.171173 82 256.629089 C 82 161.086945 159.732193 83.354767 255.27803 83.354767 C 350.816406 83.354767 428.552307 161.086945 428.552307 256.629089 C 428.552307 352.174866 350.816406 429.907074 255.27803 429.907074 Z M 181.997467 230.213196 C 167.426392 230.213196 155.581589 242.061707 155.581589 256.629089 C 155.581589 271.196442 167.426392 283.044922 181.997467 283.044922 C 196.564819 283.044922 208.41333 271.196442 208.41333 256.629089 C 208.41333 242.061707 196.564819 230.213196 181.997467 230.213196 Z M 330.441895 230.213196 C 315.870789 230.213196 304.022308 242.061707 304.022308 256.629089 C 304.022308 271.196442 315.870789 283.044922 330.441895 283.044922 C 345.005524 283.044922 356.857788 271.196442 356.857788 256.629089 C 356.857788 242.061707 345.005524 230.213196 330.441895 230.213196 Z');
                
                // 移除第二个路径（如果存在）
                const path2 = port.querySelector('path:nth-child(2)');
                if (path2) {
                    path2.remove();
                }
            } else if (port.classList.contains('text-card-chain-port') || 
                      port.classList.contains('connection-port')) {
                // 重置紫色插头和黄色插座的SVG
                const path = port.querySelector('path');
                path.setAttribute('d', 'M 285.289001 471.220001 L 285.289001 512 L 226.710999 512 L 226.710999 471.220001 L 208.067993 471.220001 C 193.807007 471.220001 182.238998 459.653015 182.238998 445.391998 L 182.238998 369.692993 C 134.914001 348.251007 101.968002 300.639008 101.968002 245.307007 L 101.968002 188.338013 L 101.969002 188.338013 L 101.969002 121.496002 L 158.378006 121.496002 L 158.378006 13.533997 C 158.378006 6.059998 164.431 0 171.904999 0 L 193.526993 0 C 201.001007 0 207.054001 6.059998 207.052994 13.533997 L 207.052994 121.496002 L 304.945007 121.496002 L 304.945007 13.533997 C 304.945007 6.059998 311.005005 0 318.471985 0 L 340.10199 0 C 347.569 0 353.622009 6.059998 353.622009 13.533997 L 353.622009 121.496002 L 410.032013 121.496002 L 410.032013 203.458008 L 410.031006 203.458008 L 410.031006 245.307007 C 410.031006 300.639008 377.09201 348.252014 329.76001 369.692993 L 329.76001 445.391998 C 329.76001 459.653015 318.199005 471.220001 303.931 471.220001 L 285.289001 471.220001 Z');
            }
        });

        // 移除所有连接线
        this.svgContainer.innerHTML = '';
        
        // 清空连接记录
        this.connections.clear();
        this.portConnections.clear();
        this.chainConnections.clear();
    }
    
    // 获取端口类型
    getPortType(port) {
        if (port.classList.contains("text-card-port")) {
            return "text-card-port";
        } else if (port.classList.contains("text-card-chain-port")) {
            return "text-card-chain-port";
        } else if (port.classList.contains("connection-port")) {
            return "connection-port";
        } else {
            return "unknown";
        }
    }
} 