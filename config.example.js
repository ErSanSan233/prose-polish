// 配置文件示例
// 使用方法：
// 1. 复制此文件并重命名为 config.js
// 2. 将下面的示例 API 密钥替换为你的实际密钥

export const CONFIG = {
    // 通义千问 API 密钥
    // 获取方式：访问 https://dashscope.aliyun.com/
    TONGYI_API_KEY: 'your-tongyi-api-key-here',

    // DeepSeek API 密钥
    // 获取方式：访问 https://platform.deepseek.com
    DEEPSEEK_API_KEY: 'your-deepseek-api-key-here',

    // Ollama配置
    OLLAMA_BASE_URL: 'http://localhost:11434', //可在此处修改端口

    // 自定义模型配置
    // 如果不需要自定义模型，可以保持为 null
    CUSTOM_MODEL: {
        BASE_URL: '',  // 例如：https://api.openai.com/v1
        API_KEY: '',   // 你的 API Key
        MODEL: ''      // 例如：gpt-3.5-turbo
    },

    // AI 助手的系统设定
    SYSTEM_MESSAGE: {
        role: 'system',
        content: '你是一个专业的文字编辑，熟知中国的出版规范，精通编校质量标准。同时，对于任何请求，你都会直接给出结果，不会做过多的解释。'
    }
}; 