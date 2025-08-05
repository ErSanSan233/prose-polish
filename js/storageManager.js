// 存储管理器类
export class StorageManager {
    constructor() {
        this.STORAGE_KEY = "prose_polish_data";
        this.isRestoring = false; // 添加恢复状态标志
    }

    // 保存所有数据到本地存储
    saveToLocalStorage() {
        // 如果正在恢复数据，则跳过保存
        if (this.isRestoring) {
            return;
        }

        try {
            // 检查全局对象是否存在
            if (!window.cardManager) {
                // cardManager不存在
            }
            if (!window.markdownHandler) {
                // markdownHandler不存在
            }
            if (!window.connectionManager) {
                // connectionManager不存在
            }

            // 获取提示词卡片数据
            const promptCards = this.getPromptCardsData();

            // 获取文本卡片数据
            const textCards = this.getTextCardsData();

            // 获取连接数据
            const connections = this.getConnectionsData();

            // 组合所有数据
            const data = {
                promptCards,
                textCards,
                connections,
                lastSaved: new Date().toISOString(),
            };

            // 保存到本地存储
            const dataString = JSON.stringify(data);
            localStorage.setItem(this.STORAGE_KEY, dataString);
        } catch (error) {
            // 尝试保存部分数据
            try {
                const partialData = {
                    lastSaved: new Date().toISOString(),
                    error: error.message,
                };
                localStorage.setItem(
                    this.STORAGE_KEY + "_error",
                    JSON.stringify(partialData)
                );
            } catch (e) {
                // 保存错误信息也失败
            }
        }
    }

    // 从本地存储加载数据
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (!savedData) {
                return null;
            }

            const parsedData = JSON.parse(savedData);

            // 验证数据结构
            if (
                !parsedData.promptCards ||
                !Array.isArray(parsedData.promptCards)
            ) {
                // 没有有效的提示词卡片数据
            }

            if (!parsedData.textCards || !Array.isArray(parsedData.textCards)) {
                // 没有有效的文本卡片数据
            }

            if (
                !parsedData.connections ||
                !Array.isArray(parsedData.connections)
            ) {
                // 没有有效的连接数据
            }

            return parsedData;
        } catch (error) {
            return null;
        }
    }

    // 获取提示词卡片数据
    getPromptCardsData() {
        if (!window.cardManager) return [];

        return Array.from(document.querySelectorAll(".prompt-card")).map(
            (cardElement) => {
                const id = cardElement.id;
                const title = cardElement.querySelector("h3").textContent;
                const prompt =
                    cardElement.querySelector(".card-prompt").innerHTML;

                // 获取卡片对象以获取占位符和连接信息
                const cardObj = window.cardManager.cards.get(id);
                const placeholders = cardObj ? cardObj.placeholders : [];
                const connections = cardObj ? cardObj.connections : [];

                // 获取位置信息
                const left = cardElement.style.left
                    ? parseInt(cardElement.style.left)
                    : 0;
                const top = cardElement.style.top
                    ? parseInt(cardElement.style.top)
                    : 0;

                return {
                    id,
                    title,
                    prompt,
                    position: {
                        left,
                        top,
                    },
                    placeholders,
                    connections,
                };
            }
        );
    }

    // 获取文本卡片数据
    getTextCardsData() {
        return Array.from(document.querySelectorAll(".paragraph-card")).map(
            (cardElement) => {
                const id = cardElement.dataset.cardId;
                const content =
                    cardElement.querySelector(".card-content").textContent;

                // 获取位置信息
                const left = cardElement.style.left
                    ? parseInt(cardElement.style.left)
                    : 0;
                const top = cardElement.style.top
                    ? parseInt(cardElement.style.top)
                    : 0;

                return {
                    id,
                    content,
                    position: {
                        left,
                        top,
                    },
                };
            }
        );
    }

    // 获取连接数据
    getConnectionsData() {
        if (
            !window.connectionManager ||
            !window.connectionManager.connections
        ) {
            return [];
        }

        // 如果连接为空，尝试调用调试方法
        if (window.connectionManager.connections.size === 0) {
            // 检查DOM中是否存在连接线
            const connectionLines = document.querySelectorAll(
                ".connection-line:not(.temp)"
            );
            if (connectionLines.length > 0) {
                // DOM中存在连接线，但connectionManager.connections为空
            }
            return [];
        }

        const connections = [];
        window.connectionManager.connections.forEach((connection, id) => {
            try {
                if (!connection.startPort || !connection.endPort) {
                    return;
                }

                // 检查DOM元素是否仍然存在
                if (
                    !document.body.contains(connection.startPort) ||
                    !document.body.contains(connection.endPort)
                ) {
                    return;
                }

                const startPortId =
                    connection.startPort.dataset.portId ||
                    connection.startPort.dataset.cardId;
                const endPortId =
                    connection.endPort.dataset.portId ||
                    connection.endPort.dataset.cardId;

                if (!startPortId || !endPortId) {
                    return;
                }

                // 获取端口类型
                const startPortType = this.getPortType(connection.startPort);
                const endPortType = this.getPortType(connection.endPort);

                connections.push({
                    id,
                    startPortId,
                    endPortId,
                    startPortType,
                    endPortType,
                });
            } catch (error) {
                // 处理连接时出错
            }
        });

        return connections;
    }

    // 获取端口类型
    getPortType(port) {
        if (port.classList.contains("connection-port")) return "prompt";
        if (port.classList.contains("text-card-port")) return "text";
        if (port.classList.contains("text-card-chain-port")) return "chain";
        return "unknown";
    }

    // 恢复提示词卡片
    restorePromptCards(promptCardsData) {
        if (!window.cardManager) return Promise.resolve([]);

        // 清除现有卡片
        document
            .querySelectorAll(".prompt-card")
            .forEach((card) => card.remove());
        window.cardManager.cards = new Map();

        // 批量处理卡片创建，减少DOM操作次数
        const fragment = document.createDocumentFragment();
        const cardPromises = [];

        // 恢复卡片
        promptCardsData.forEach((cardData) => {
            try {
                const card = window.cardManager.addCard(
                    cardData.title,
                    cardData.prompt,
                    cardData.id
                );

                // 设置位置
                if (cardData.position) {
                    card.element.style.left = `${cardData.position.left}px`;
                    card.element.style.top = `${cardData.position.top}px`;
                }

                // 创建一个Promise来跟踪此卡片的端口创建
                const portPromise = new Promise((resolve) => {
                    // 检查每个占位符是否都有对应的端口
                    const portResults = [];
                    cardData.placeholders.forEach((placeholder, i) => {
                        const portId = `${cardData.id}_port_${i + 1}`;
                        const port = document.querySelector(
                            `[data-port-id="${portId}"]`
                        );
                        portResults.push({
                            created: !!port,
                            portId,
                        });
                    });
                    resolve({ cardId: cardData.id, ports: portResults });
                });

                cardPromises.push(portPromise);
            } catch (error) {
                cardPromises.push(
                    Promise.resolve({
                        cardId: cardData.id,
                        error: error.message,
                    })
                );
            }
        });

        // 返回一个Promise，当所有端口创建完成后解决
        return Promise.all(cardPromises);
    }

    // 恢复文本卡片
    restoreTextCards(textCardsData) {
        if (!window.markdownHandler) return Promise.resolve();

        // 清除现有卡片
        document
            .querySelectorAll(".paragraph-card")
            .forEach((card) => card.remove());
        window.markdownHandler.cards = [];

        // 批量处理卡片创建
        const fragment = document.createDocumentFragment();

        // 恢复卡片
        textCardsData.forEach((cardData) => {
            const card = window.markdownHandler.createCard(cardData.content);
            card.dataset.cardId = cardData.id;

            // 更新端口的ID
            const textPort = card.querySelector(".text-card-port");
            if (textPort) textPort.dataset.cardId = cardData.id;

            const chainPort = card.querySelector(".text-card-chain-port");
            if (chainPort) chainPort.dataset.cardId = cardData.id;

            // 设置位置
            if (cardData.position) {
                card.style.left = `${cardData.position.left}px`;
                card.style.top = `${cardData.position.top}px`;
            }
        });

        // 返回一个Promise，表示文本卡片恢复完成
        return Promise.resolve();
    }

    // 查找端口的辅助函数
    findPort(portId, portType, promptPortMap) {
        let port = null;

        if (portType === "prompt") {
            // 直接从映射中查找
            port = promptPortMap.get(portId);

            // 如果没找到，尝试查找同一卡片的任何端口
            if (!port && portId.includes("_port_")) {
                const cardId = portId.split("_port_")[0];
                // 查找同一卡片的所有端口
                promptPortMap.forEach((p, id) => {
                    if (id.startsWith(cardId + "_port_")) {
                        port = p;
                    }
                });
            }
        } else if (portType === "text" || portType === "chain") {
            // 文本卡片端口
            const selector =
                portType === "text"
                    ? ".text-card-port"
                    : ".text-card-chain-port";

            // 尝试使用正确的属性名查找
            port = document.querySelector(
                `${selector}[data-card-id="${portId}"]`
            );

            // 如果没找到，尝试使用dataset.cardId属性查找
            if (!port) {
                const allPorts = document.querySelectorAll(selector);
                for (const p of allPorts) {
                    if (p.dataset.cardId === portId) {
                        port = p;
                        break;
                    }
                }
            }
        }

        return port;
    }

    // 恢复连接
    restoreConnections(connectionsData) {
        if (!window.connectionManager) {
            return Promise.reject("connectionManager不存在");
        }

        if (!connectionsData || connectionsData.length === 0) {
            return Promise.resolve([]);
        }

        // 清除现有连接
        window.connectionManager.clearAllConnections();

        // 删除重试机制
        const attemptRestore = () => {
            // 收集所有可用的端口信息，用于后续查找
            const allPromptPorts = document.querySelectorAll("[data-port-id]");
            const promptPortMap = new Map();
            allPromptPorts.forEach((port) => {
                promptPortMap.set(port.dataset.portId, port);
            });

            // 批量处理连接创建
            const connectionPromises = [];
            const restoredConnections = new Map(); // 用于存储恢复的连接

            connectionsData.forEach((connectionData) => {
                const connectionPromise = new Promise((resolve) => {
                    try {
                        // 查找起始端口和结束端口
                        const startPort = this.findPort(
                            connectionData.startPortId,
                            connectionData.startPortType,
                            promptPortMap
                        );

                        const endPort = this.findPort(
                            connectionData.endPortId,
                            connectionData.endPortType,
                            promptPortMap
                        );

                        if (!startPort || !endPort) {
                            resolve({
                                success: false,
                                id: connectionData.id,
                                error: !startPort
                                    ? "找不到起始端口"
                                    : "找不到结束端口",
                            });
                            return;
                        }

                        // 创建连接线
                        const line = document.createElementNS(
                            "http://www.w3.org/2000/svg",
                            "path"
                        );
                        line.classList.add("connection-line");
                        window.connectionManager.svgContainer.appendChild(line);

                        // 设置连接线的初始位置
                        const startRect = startPort.getBoundingClientRect();
                        const endRect = endPort.getBoundingClientRect();
                        const startX = startRect.left + startRect.width / 2;
                        const startY = startRect.top + startRect.height / 2;
                        const endX = endRect.left + endRect.width / 2;
                        const endY = endRect.top + endRect.height / 2;

                        // 临时保存当前的startPort，以便createCurvePath方法使用
                        const originalStartPort =
                            window.connectionManager.startPort;
                        window.connectionManager.startPort = startPort;

                        const path = window.connectionManager.createCurvePath(
                            startX,
                            startY,
                            endX,
                            endY
                        );
                        line.setAttribute("d", path);

                        // 恢复原始的startPort
                        window.connectionManager.startPort = originalStartPort;

                        // 手动创建连接对象，而不是调用completeConnection
                        // 这样可以避免completeConnection方法重置状态
                        startPort.classList.add("connected");
                        endPort.classList.add("connected");

                        // 根据连接类型添加额外的类名
                        if (endPort.classList.contains("text-card-port")) {
                            if (
                                startPort.classList.contains("connection-port")
                            ) {
                                endPort.classList.add("prompt-connected");
                            } else if (
                                startPort.classList.contains(
                                    "text-card-chain-port"
                                )
                            ) {
                                endPort.classList.add("chain-connected");
                            }

                            // 修改蓝色插座的SVG路径
                            const path = endPort.querySelector("path");
                            // 设置第一个路径
                            path.setAttribute(
                                "d",
                                "M 148 23.829071 C 60.587349 64.560425 0 153.204742 0 256 C 0 397.384888 114.615105 512 256 512 C 397.384888 512 512 397.384888 512 256 C 512 152.813232 450.950226 63.885376 363 23.365753 L 363 68.322052 C 428.113617 105.525055 472 175.637421 472 256 C 472 375.293518 375.293518 472 256 472 C 136.706497 472 40 375.293518 40 256 C 40 176.0495 83.437454 106.244354 148 68.896942 L 148 23.829071 Z"
                            );

                            // 添加第二个路径
                            let path2 =
                                endPort.querySelector("path:nth-child(2)");
                            if (!path2) {
                                path2 = document.createElementNS(
                                    "http://www.w3.org/2000/svg",
                                    "path"
                                );
                                endPort.querySelector("svg").appendChild(path2);
                            }
                            path2.setAttribute(
                                "d",
                                "M 226.710999 12.780029 L 226.710999 -28 L 285.289001 -28 L 285.289001 12.780029 L 303.932007 12.780029 C 318.192993 12.780029 329.761017 24.346985 329.761017 38.608032 L 329.761017 84.307007 C 377.085999 105.748993 410.032013 153.360992 410.032013 208.692993 L 410.032013 265.661987 L 410.031006 265.661987 L 410.031006 332.503998 C 353.622009 332.503998 353.622009 332.503998 353.622009 332.503998 L 353.622009 359.466003 L 304.947021 359.466003 L 304.947021 332.503998 C 207.054993 332.503998 207.054993 332.503998 207.054993 332.503998 L 207.054993 359.466003 L 158.377991 359.466003 L 158.377991 332.503998 L 101.967987 332.503998 L 101.967987 250.541992 L 101.968994 250.541992 L 101.968994 208.692993 C 101.968994 153.360992 134.90799 105.747986 182.23999 84.307007 L 182.23999 38.608032 C 182.23999 24.346985 193.800995 12.780029 208.069 12.780029 Z"
                            );
                            path2.setAttribute("fill", "#00b894");
                        }

                        // 修改SVG路径
                        if (
                            startPort.classList.contains(
                                "text-card-chain-port"
                            ) ||
                            startPort.classList.contains("connection-port")
                        ) {
                            const path = startPort.querySelector("path");
                            path.setAttribute(
                                "d",
                                "M 82 256.629089 C 82 352.171173 159.728485 429.907074 255.27803 429.907074 C 350.816406 429.907074 428.552307 352.174866 428.552307 256.629089 C 428.552307 161.086945 350.816406 83.354767 255.27803 83.354767 C 159.732193 83.354767 82 161.086945 82 256.629089 Z M 255.277603 390.354767 C 181.538361 390.354767 121.552307 330.362976 121.552307 256.629517 C 121.552307 182.895966 181.541214 122.907074 255.277603 122.907074 C 329.00824 122.907074 389 182.895966 389 256.629517 C 389 330.365845 329.00824 390.354767 255.277603 390.354767 Z M 255.277161 164 C 204.199738 164 162.645233 205.554504 162.645233 256.629944 C 162.645233 307.705353 204.197754 349.261841 255.277161 349.261841 C 306.350586 349.261841 347.907074 307.707336 347.907074 256.629944 C 347.907074 205.554504 306.350586 164 255.277161 164 Z"
                            );
                        }

                        // 存储连接信息
                        const connection = {
                            id: connectionData.id,
                            startPort: startPort,
                            endPort: endPort,
                            line: line,
                        };

                        // 添加到恢复的连接Map中
                        restoredConnections.set(connectionData.id, connection);

                        // 记录端口的连接状态
                        const startPortId =
                            startPort.dataset.portId ||
                            startPort.dataset.cardId;
                        const endPortId =
                            endPort.dataset.portId || endPort.dataset.cardId;

                        // 添加端口连接
                        if (endPort.classList.contains("text-card-port")) {
                            const connectionType = startPort.classList.contains(
                                "text-card-chain-port"
                            )
                                ? "chain"
                                : "prompt";
                            window.connectionManager.portConnections.set(
                                `${endPortId}_${connectionType}`,
                                connectionData.id
                            );
                        } else {
                            window.connectionManager.portConnections.set(
                                endPortId,
                                connectionData.id
                            );
                        }

                        // 对于发起连接的端口，始终使用单一连接
                        window.connectionManager.portConnections.set(
                            startPortId,
                            connectionData.id
                        );

                        // 处理不同类型的连接
                        if (
                            startPort.classList.contains(
                                "text-card-chain-port"
                            ) ||
                            endPort.classList.contains("text-card-chain-port")
                        ) {
                            // 文本卡片链接
                            const startCard =
                                startPort.closest(".paragraph-card");
                            const endCard = endPort.closest(".paragraph-card");

                            // 记录链接关系
                            if (startCard && endCard) {
                                window.connectionManager.chainConnections.set(
                                    startCard.dataset.cardId,
                                    endCard.dataset.cardId
                                );
                            }
                        } else {
                            // 提示词卡片连接
                            const promptPort = startPort.classList.contains(
                                "connection-port"
                            )
                                ? startPort
                                : endPort;
                            const textPort = startPort.classList.contains(
                                "text-card-port"
                            )
                                ? startPort
                                : endPort;
                            const promptCard =
                                window.connectionManager.getPromptCard(
                                    promptPort
                                );
                            const textCard =
                                window.connectionManager.getTextCard(textPort);

                            if (promptCard && textCard) {
                                const portIndex =
                                    parseInt(
                                        promptPort.dataset.portId.split(
                                            "_port_"
                                        )[1]
                                    ) - 1;
                                // 获取链接文本，包括所有链接的卡片
                                const content =
                                    window.connectionManager.getCombinedContent(
                                        textCard
                                    );
                                promptCard.updateConnection(portIndex, content);
                            }
                        }

                        resolve({ success: true, id: connectionData.id });
                    } catch (error) {
                        resolve({
                            success: false,
                            id: connectionData.id,
                            error: error.message,
                        });
                    }
                });

                connectionPromises.push(connectionPromise);
            });

            return Promise.all(connectionPromises).then((results) => {
                // 将恢复的连接设置到connectionManager
                window.connectionManager.connections = restoredConnections;

                // 更新所有连接线的位置
                window.connectionManager.updateConnections();
                return results;
            });
        };

        // 直接执行恢复操作，不再延迟
        return attemptRestore();
    }

    // 恢复所有数据
    restoreAllData(data) {
        this.isRestoring = true; // 设置恢复状态为 true

        // 预处理数据，减少不必要的处理
        const promptCards = data.promptCards || [];
        const textCards = data.textCards || [];
        const connections = data.connections || [];

        // 使用Promise.all并行处理卡片恢复，提高速度
        return Promise.all([
            this.restorePromptCards(promptCards),
            this.restoreTextCards(textCards),
        ])
            .then(([portResults]) => {
                // 检查端口创建情况
                const allPortsCreated = portResults.every(
                    (card) =>
                        !card.ports || card.ports.every((port) => port.created)
                );

                if (!allPortsCreated) {
                    // 部分端口未创建成功
                }

                // 恢复连接
                return this.restoreConnections(connections).then(() => {
                    this.isRestoring = false; // 恢复完成后设置状态为 false
                    return true;
                });
            })
            .catch((error) => {
                this.isRestoring = false; // 出错时也要重置状态
                return false;
            });
    }

    // 从本地存储恢复数据
    restoreData() {
        // 检查全局对象是否存在
        if (
            !window.cardManager ||
            !window.markdownHandler ||
            !window.connectionManager
        ) {
            return Promise.reject("缺少必要的全局对象");
        }

        const savedData = this.loadFromLocalStorage();
        if (!savedData) {
            return Promise.resolve(false);
        }

        return this.restoreAllData(savedData);
    }
}

// 创建自动保存功能
export function setupAutoSave() {
    const storageManager = new StorageManager();

    // 定义自动保存函数
    const autoSave = () => {
        storageManager.saveToLocalStorage();
    };

    // 监听卡片变化
    const cardContainer = document.querySelector(".prompt-cards");
    const paragraphContainer = document.getElementById("paragraph-cards");
    const svgContainer = document.querySelector(".connections-container");

    // 使用 MutationObserver 监听卡片内容和位置变化
    const observer = new MutationObserver(autoSave);

    // 监听各种容器的变化
    [cardContainer, paragraphContainer, svgContainer].forEach((container) => {
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["style", "class"],
            });
        }
    });

    // 监听卡片内容编辑
    document.addEventListener(
        "blur",
        (e) => {
            if (
                e.target.classList.contains("card-content") ||
                e.target.classList.contains("card-prompt")
            ) {
                autoSave();
            }
        },
        true
    );

    // 监听卡片拖拽结束
    document.addEventListener("mouseup", () => {
        setTimeout(autoSave, 100);
    });

    // 在页面加载完成后进行一次初始保存
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(autoSave, 3000); // 延长延迟时间，从 1000ms 增加到 3000ms
    });

    // 返回存储管理器和恢复数据的方法
    return {
        storageManager,
        restoreData: () => storageManager.restoreData(),
    };
}
