// 生成唯一ID的辅助函数
function generateUniqueId(prefix = 'card') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 提示词卡片类
export class PromptCard {
    constructor(id, title, prompt, placeholders = []) {
        this.id = id;
        this.title = title;
        this.prompt = prompt;
        this.placeholders = this.detectPlaceholders(prompt);  // 使用检测到的占位符
        this.connections = new Array(this.placeholders.length).fill(null);
        this.element = this.createCardElement();
    }

    // 检测提示词中的占位符
    detectPlaceholders(text) {
        const regex = /\{\{([^}]+)\}\}/g;
        const placeholders = [];
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            placeholders.push(match[1].trim());
        }
        
        return placeholders;
    }

    // 更新卡片内容
    updateContent(title, prompt) {
        this.title = title;
        this.prompt = prompt;
        
        // 检测新的占位符
        const newPlaceholders = this.detectPlaceholders(prompt);
        
        // 如果占位符数量或内容发生变化，需要重新创建端口
        if (JSON.stringify(this.placeholders) !== JSON.stringify(newPlaceholders)) {
            this.placeholders = newPlaceholders;
            this.connections = new Array(this.placeholders.length).fill(null);
            
            // 移除旧的端口和连接
            const portContainer = this.element.querySelector('.port-container');
            if (portContainer) {
                // 移除所有现有连接
                const ports = portContainer.querySelectorAll('.connection-port');
                ports.forEach(port => {
                    if (window.connectionManager) {
                        window.connectionManager.removePortConnection(port);
                    }
                });
                portContainer.innerHTML = '';
            }
            
            // 创建新的端口
            this.createPorts(portContainer);
        }

        // 更新显示内容
        this.element.querySelector('h3').textContent = this.title;
        this.element.querySelector('.card-prompt').innerHTML = this.prompt;
    }

    createCardElement() {
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.id = this.id;
        
        // 创建卡片内容，使用HTML转义来防止XSS攻击
        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };
        
        card.innerHTML = `
            <div class="card-actions">
                <button class="edit-btn">✎</button>
                <button class="delete-btn">✕</button>
            </div>
            <h3>${escapeHtml(this.title)}</h3>
            <div class="card-prompt">${this.prompt}</div>
            <div class="port-container"></div>
        `;

        // 创建端口
        const portContainer = card.querySelector('.port-container');
        this.createPorts(portContainer);

        // 添加删除按钮事件
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这个提示词卡片吗？')) {
                // 删除所有连接端口的连接
                const ports = card.querySelectorAll('.connection-port');
                if (window.connectionManager) {
                    ports.forEach(port => {
                        window.connectionManager.removePortConnection(port);
                    });
                }
                
                // 从卡片管理器中移除
                window.cardManager.deleteCard(this.id);
            }
        };

        return card;
    }

    // 创建端口
    createPorts(container) {
        this.placeholders.forEach((placeholder, index) => {
            const port = document.createElement('div');
            port.className = 'connection-port';
            port.dataset.portId = `${this.id}_port_${index + 1}`;
            
            // 添加 SVG 内容
            port.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path d="M 285.289001 471.220001 L 285.289001 512 L 226.710999 512 L 226.710999 471.220001 L 208.067993 471.220001 C 193.807007 471.220001 182.238998 459.653015 182.238998 445.391998 L 182.238998 369.692993 C 134.914001 348.251007 101.968002 300.639008 101.968002 245.307007 L 101.968002 188.338013 L 101.969002 188.338013 L 101.969002 121.496002 L 158.378006 121.496002 L 158.378006 13.533997 C 158.378006 6.059998 164.431 0 171.904999 0 L 193.526993 0 C 201.001007 0 207.054001 6.059998 207.052994 13.533997 L 207.052994 121.496002 L 304.945007 121.496002 L 304.945007 13.533997 C 304.945007 6.059998 311.005005 0 318.471985 0 L 340.10199 0 C 347.569 0 353.622009 6.059998 353.622009 13.533997 L 353.622009 121.496002 L 410.032013 121.496002 L 410.032013 203.458008 L 410.031006 203.458008 L 410.031006 245.307007 C 410.031006 300.639008 377.09201 348.252014 329.76001 369.692993 L 329.76001 445.391998 C 329.76001 459.653015 318.199005 471.220001 303.931 471.220001 L 285.289001 471.220001 Z"/>
            </svg>`;
            
            // 添加占位符名称标签
            const label = document.createElement('span');
            label.className = 'port-label';
            label.textContent = placeholder;
            
            port.appendChild(label);
            container.appendChild(port);
        });
    }

    // 检查所有端口是否都已连接
    areAllPortsConnected() {
        return this.connections.every(connection => connection !== null);
    }

    // 获取未连接的端口序号
    getUnconnectedPorts() {
        return this.connections
            .map((connection, index) => connection === null ? this.placeholders[index] : null)
            .filter(index => index !== null);
    }

    // 更新连接状态
    updateConnection(portIndex, content) {
        this.connections[portIndex] = { content };
    }

    // 移除连接状态
    removeConnection(portIndex) {
        this.connections[portIndex] = null;
    }

    // 获取替换了占位符的提示词
    getPromptWithConnections() {
        // 检查是否所有端口都已连接
        if (!this.areAllPortsConnected()) {
            const unconnectedPorts = this.getUnconnectedPorts();
            throw new Error(`以下变量未连接：${unconnectedPorts.join(', ')}`);
        }

        let result = this.prompt;
        this.placeholders.forEach((placeholder, index) => {
            const pattern = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
            
            // 获取直接连接的文本卡片
            const startCard = this.getConnectedTextCard(index);
            if (!startCard) {
                throw new Error(`无法获取连接的文本卡片：${placeholder}`);
            }

            // 获取所有链式连接的文本
            const contents = this.getChainedContents(startCard);
            const combinedContent = contents.join('\\n');
            result = result.replace(pattern, combinedContent);
        });
        
        // 只输出最终的提示词
        return result;
    }

    // 获取连接到指定端口的文本卡片
    getConnectedTextCard(portIndex) {
        const port = this.element.querySelector(`[data-port-id="${this.id}_port_${portIndex + 1}"]`);
        if (!port) return null;

        const connectionId = window.connectionManager.portConnections.get(port.dataset.portId);
        if (!connectionId) return null;

        const connection = window.connectionManager.connections.get(connectionId);
        if (!connection) return null;

        return connection.endPort.closest('.paragraph-card');
    }

    // 获取所有链式连接的文本内容
    getChainedContents(startCard) {
        const contents = [];
        let currentCard = startCard;
        const visited = new Set();

        while (currentCard && !visited.has(currentCard.dataset.cardId)) {
            visited.add(currentCard.dataset.cardId);
            
            // 添加当前卡片的文本内容
            const content = currentCard.querySelector('.card-content').textContent.trim();
            if (content) {
                contents.push(content);
            }

            // 查找下一个链接的卡片
            const chainPort = currentCard.querySelector('.text-card-chain-port');
            if (!chainPort) break;

            // 查找从当前卡片的链接端口出发的连接
            const portId = chainPort.dataset.cardId;
            const connectionId = window.connectionManager.portConnections.get(portId);
            if (!connectionId) break;

            const connection = window.connectionManager.connections.get(connectionId);
            if (!connection) break;

            currentCard = connection.endPort.closest('.paragraph-card');
            if (visited.has(currentCard?.dataset.cardId)) break;
        }

        return contents;
    }
}

// 提示词卡片管理器
export class PromptCardManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.cards = new Map();
        this.selectedCard = null;
        this.onCardSelected = null;
        this.debouncedSelect = debounce(this.selectCard.bind(this), 100);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 使用事件委托来处理卡片的点击事件
        this.container.addEventListener('click', (e) => {
            const promptCard = e.target.closest('.prompt-card');
            if (!promptCard) return;

            // 处理编辑按钮点击
            if (e.target.matches('.edit-btn')) {
                e.stopPropagation();
                this.showEditDialog(promptCard.id);
                return;
            }

            // 处理删除按钮点击
            if (e.target.matches('.delete-btn')) {
                e.stopPropagation();
                if (confirm('确定要删除这个提示词卡片吗？')) {
                    this.deleteCard(promptCard.id);
                }
                return;
            }

            // 处理卡片选择
            if (!e.target.matches('button')) {
                this.debouncedSelect(promptCard.id);
            }
        });
    }

    // 检查ID是否已存在
    isIdExists(id) {
        return this.cards.has(id) || document.getElementById(id) !== null;
    }

    // 添加新卡片
    addCard(title, prompt, id = null) {
        let card;

        if (id) {
            // 使用指定的ID创建卡片
            card = new PromptCard(id, title, prompt);
            // 检查ID是否已存在，如果存在则生成新ID
            if (this.isIdExists(card.id)) {
                console.warn(`ID ${id} 已存在，将生成新ID`);
                card = new PromptCard(generateUniqueId(), title, prompt);
                while (this.isIdExists(card.id)) {
                    card = new PromptCard(generateUniqueId(), title, prompt);
                }
            }
        } else {
            // 生成新ID
            card = new PromptCard(generateUniqueId(), title, prompt);
            while (this.isIdExists(card.id)) {
                card = new PromptCard(generateUniqueId(), title, prompt);
            }
        }

        this.cards.set(card.id, card);
        this.container.appendChild(card.element);
        return card;
    }

    // 删除卡片
    deleteCard(cardId) {
        const cardElement = document.getElementById(cardId);
        if (cardElement) {
            cardElement.remove();
            this.cards.delete(cardId);
            if (this.selectedCard?.id === cardId) {
                this.selectedCard = null;
                this.onCardSelected?.(null);
            }
        }
    }

    // 编辑卡片
    editCard(cardId, title, prompt) {
        const card = this.cards.get(cardId);
        if (card) {
            card.updateContent(title, prompt);
        }
    }

    // 选择卡片
    selectCard(cardId) {
        if (!cardId) return;

        // 如果点击的是当前已选中的卡片，则取消选中
        if (this.selectedCard?.id === cardId) {
            this.selectedCard = null;
            document.querySelectorAll('.prompt-card').forEach(card => {
                card.classList.remove('selected');
            });
            if (this.onCardSelected) {
                this.onCardSelected(null);
            }
            return;
        }

        const allCards = this.container.querySelectorAll('.prompt-card');
        allCards.forEach(card => card.classList.remove('selected'));

        this.selectedCard = null;

        const cardElement = document.getElementById(cardId);
        if (cardElement) {
            const card = this.cards.get(cardId);
            if (card) {
                cardElement.classList.add('selected');
                this.selectedCard = card;
            }
        }
        
        if (this.onCardSelected) {
            this.onCardSelected(this.selectedCard);
        }
    }

    // 显示编辑对话框
    showEditDialog(cardId) {
        const card = cardId ? this.cards.get(cardId) : { title: '', prompt: '' };
        if (!card) return;

        const dialog = document.createElement('div');
        dialog.className = 'edit-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>${cardId ? '编辑提示词' : '新建提示词'}</h3>
                <input type="text" id="edit-title" placeholder="标题" value="${card.title || ''}">
                <textarea id="edit-prompt" placeholder="提示词内容" rows="4">${card.prompt || ''}</textarea>
                <div class="dialog-buttons">
                    <button id="save-edit">保存</button>
                    <button id="cancel-edit">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 保存按钮事件
        dialog.querySelector('#save-edit').addEventListener('click', () => {
            const title = dialog.querySelector('#edit-title').value;
            const prompt = dialog.querySelector('#edit-prompt').value;

            if (title && prompt) {
                if (cardId) {
                    this.editCard(cardId, title, prompt);
                } else {
                    this.addCard(title, prompt);
                }
                dialog.remove();
            } else {
                alert('标题和提示词内容不能为空');
            }
        });

        // 取消按钮事件
        dialog.querySelector('#cancel-edit').addEventListener('click', () => {
            dialog.remove();
        });
    }

    // 获取选中的提示词
    getSelectedPrompt() {
        return this.selectedCard?.prompt || null;
    }
}

// 导出卡片为JSON
export function exportCards() {
    const cards = document.querySelectorAll('.prompt-card');
    const cardsData = Array.from(cards).map(card => ({
        title: card.querySelector('h3').textContent,
        prompt: card.querySelector('.card-prompt').innerHTML
    }));

    const blob = new Blob([JSON.stringify(cardsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt-cards.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 导入卡片
export function importCards() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const cardsData = JSON.parse(text);
            
            if (!Array.isArray(cardsData)) {
                throw new Error('无效的卡片数据格式');
            }
            
            // 获取cardManager实例
            const cardManager = window.cardManager;
            
            // 添加新卡片（追加到现有卡片后面）
            cardsData.forEach(cardData => {
                if (cardData.title && cardData.prompt) {
                    cardManager.addCard(cardData.title, cardData.prompt);
                }
            });

            // 显示成功提示
            const count = cardsData.length;
            alert(`成功导入 ${count} 个卡片`);
        } catch (error) {
            alert('导入失败：' + error.message);
        }
    };
    
    input.click();
}

// 初始化导入导出按钮
export function initializeCardManagement() {
    const exportButton = document.getElementById('export-cards');
    const importButton = document.getElementById('import-cards');
    const clearButton = document.getElementById('clear-cards');
    const clearConnectionsButton = document.getElementById('clear-connections');
    
    exportButton.addEventListener('click', exportCards);
    importButton.addEventListener('click', importCards);
    
    // 添加清空功能
    clearButton.addEventListener('click', () => {
        if (confirm('确定要删除所有提示词卡片吗？此操作不可撤销。')) {
            const cardsContainer = document.querySelector('.prompt-cards');
            
            // 先删除所有提示词卡片的连接
            cardsContainer.querySelectorAll('.prompt-card').forEach(card => {
                const ports = card.querySelectorAll('.connection-port');
                if (window.connectionManager) {
                    ports.forEach(port => {
                        window.connectionManager.removePortConnection(port);
                    });
                }
            });
            
            // 然后清空容器和卡片管理器
            cardsContainer.innerHTML = '';
            window.cardManager.cards.clear();
        }
    });

    // 添加清除连线功能
    clearConnectionsButton.addEventListener('click', () => {
        // 清除所有SVG连线
        const connectionsContainer = document.querySelector('.connections-container');
        connectionsContainer.innerHTML = '';
        
        // 清除所有端口的连接状态
        document.querySelectorAll('.connection-port, .text-card-port').forEach(port => {
            port.classList.remove('connected');
            port.classList.remove('connecting');
        });
        
        // 重置所有卡片的连接状态
        window.cardManager.cards.forEach(card => {
            card.connections = new Array(card.placeholders.length).fill(null);
        });

        // 通知连接管理器重置状态
        if (window.connectionManager) {
            window.connectionManager.clearAllConnections();
        }
    });
} 