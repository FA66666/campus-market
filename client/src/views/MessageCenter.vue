<template>
    <div class="chat-container">
        <el-card class="chat-card" :body-style="{ padding: '0px', height: '100%', display: 'flex' }">

            <div class="chat-sidebar">
                <div class="sidebar-header">消息列表</div>
                <el-scrollbar>
                    <div v-for="conv in conversations" :key="conv.counterpart_id" class="conv-item"
                        :class="{ active: currentChatUser?.user_id === conv.counterpart_id }" @click="selectUser(conv)">
                        <el-badge :value="conv.unread_count" :hidden="conv.unread_count === 0" class="avatar-badge">
                            <el-avatar :size="40">{{ conv.counterpart_name.charAt(0).toUpperCase() }}</el-avatar>
                        </el-badge>
                        <div class="conv-info">
                            <div class="conv-name">{{ conv.counterpart_name }}</div>
                            <div class="conv-msg text-truncate">{{ conv.last_message }}</div>
                        </div>
                        <div class="conv-time">{{ formatTime(conv.created_at) }}</div>
                    </div>
                    <el-empty v-if="conversations.length === 0" description="暂无消息" image-size="60" />
                </el-scrollbar>
            </div>

            <div class="chat-main">
                <template v-if="currentChatUser">
                    <div class="chat-header">
                        <span>{{ currentChatUser.username }}</span>
                    </div>

                    <el-scrollbar class="chat-history" ref="historyScroll">
                        <div v-for="msg in messageList" :key="msg.message_id" class="msg-row"
                            :class="{ 'msg-mine': msg.sender_id === myId }">
                            <div class="msg-bubble">
                                {{ msg.content }}
                            </div>
                        </div>
                    </el-scrollbar>

                    <div class="chat-input">
                        <el-input v-model="inputContent" placeholder="按 Enter 发送消息..." @keyup.enter="handleSend">
                            <template #append>
                                <el-button @click="handleSend" :loading="sending">发送</el-button>
                            </template>
                        </el-input>
                    </div>
                </template>
                <el-empty v-else description="请选择左侧联系人开始聊天" />
            </div>

        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import request from '../utils/request';
import { useUserStore } from '../stores/user';
import { useRoute } from 'vue-router';

const userStore = useUserStore();
const route = useRoute();
const myId = userStore.userInfo?.id;

const conversations = ref<any[]>([]);
const messageList = ref<any[]>([]);
const currentChatUser = ref<any>(null);
const inputContent = ref('');
const historyScroll = ref();
const sending = ref(false);

// 定时器引用
let msgTimer: any = null;
let convTimer: any = null;

// 1. 获取会话列表 (静默刷新)
const fetchConversations = async () => {
    try {
        const res: any = await request.get('/messages/conversations');
        if (res.code === 200) {
            // 这里可以做一个简单对比，如果没有变化就不赋值，避免列表闪烁
            // 简单起见直接赋值，Vue 的 diff 算法会处理 DOM 更新
            conversations.value = res.data;
        }
    } catch (e) { }
};

// 2. 选中某人聊天
const selectUser = async (conv: any) => {
    // 如果点击的是当前正在聊的人，不做操作
    if (currentChatUser.value?.user_id === conv.counterpart_id) return;

    currentChatUser.value = {
        user_id: conv.counterpart_id,
        username: conv.counterpart_name
    };

    // 切换用户时，先清空消息列表，给用户加载中的感觉(或者保留旧的也行，这里选择清空避免误会)
    messageList.value = [];

    // 立即加载一次，并强制滚动到底部
    await loadHistory(conv.counterpart_id, true);

    // 本地清除未读红点
    conv.unread_count = 0;

    // 开启消息轮询
    startMsgPolling(conv.counterpart_id);
};

// 开启消息轮询
const startMsgPolling = (targetId: number) => {
    stopMsgPolling(); // 先清除旧的
    msgTimer = setInterval(() => {
        // 轮询时不强制滚动，除非有新消息
        loadHistory(targetId, false);
    }, 3000); // 每3秒刷新一次
};

const stopMsgPolling = () => {
    if (msgTimer) {
        clearInterval(msgTimer);
        msgTimer = null;
    }
};

// 3. 加载历史记录
// forceScroll: 是否强制滚动到底部（切换联系人时为true，轮询时为false）
const loadHistory = async (targetId: number, forceScroll = false) => {
    try {
        const res: any = await request.get(`/messages/history/${targetId}`);
        if (res.code === 200) {
            const newMessages = res.data || [];
            const oldLength = messageList.value.length;

            messageList.value = newMessages;

            // 智能滚动逻辑：
            // 1. 如果是强制滚动 (刚进来) -> 滚
            // 2. 如果消息数量变多了 (收到新消息) -> 滚
            if (forceScroll || newMessages.length > oldLength) {
                scrollToBottom();
            }
        }
    } catch (e) { }
};

// 4. 发送消息
const handleSend = async () => {
    if (!inputContent.value.trim()) return;
    const content = inputContent.value;
    const targetId = currentChatUser.value.user_id;

    sending.value = true;
    try {
        const res: any = await request.post('/messages', {
            receiver_id: targetId,
            content: content
        });

        if (res.code === 200) {
            inputContent.value = '';
            // 发送成功后，立即刷新一次列表，确保包含最新消息
            await loadHistory(targetId, true);
            // 同时也刷新会话列表，更新“最后一条消息”
            fetchConversations();
        }
    } catch (e) {
    } finally {
        sending.value = false;
    }
};

const scrollToBottom = () => {
    nextTick(() => {
        if (historyScroll.value) {
            const wrap = historyScroll.value.wrapRef;
            wrap.scrollTop = wrap.scrollHeight;
        }
    });
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    // 如果是今天的消息，只显示时间，否则显示日期
    if (date.toDateString() === now.toDateString()) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return date.toLocaleDateString();
};

onMounted(async () => {
    await fetchConversations();

    // 如果 URL 带了参数 (从商品详情页跳过来)
    const targetId = route.query.to;
    const targetName = route.query.name;
    if (targetId) {
        currentChatUser.value = { user_id: Number(targetId), username: targetName };
        await loadHistory(Number(targetId), true);
        startMsgPolling(Number(targetId));
    }

    // 全局开启会话列表轮询 (每5秒检查是否有新的人发消息给我)
    convTimer = setInterval(() => {
        fetchConversations();
    }, 1000);
});

onUnmounted(() => {
    stopMsgPolling();
    if (convTimer) clearInterval(convTimer);
});
</script>

<style scoped>
.chat-container {
    padding: 20px;
    height: calc(100vh - 100px);
}

.chat-card {
    height: 100%;
}

/* 左侧 */
.chat-sidebar {
    width: 250px;
    border-right: 1px solid #eee;
    display: flex;
    flex-direction: column;
    background: #fcfcfc;
}

.sidebar-header {
    padding: 15px;
    font-weight: bold;
    border-bottom: 1px solid #eee;
    color: #333;
}

.conv-item {
    display: flex;
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    align-items: center;
    gap: 10px;
    transition: background-color 0.2s;
}

.conv-item:hover {
    background: #f0f2f5;
}

.conv-item.active {
    background: #e6f7ff;
    border-right: 3px solid #1890ff;
}

.conv-info {
    flex: 1;
    overflow: hidden;
}

.conv-name {
    font-weight: 600;
    font-size: 14px;
    color: #333;
}

.conv-msg {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

.conv-time {
    font-size: 11px;
    color: #ccc;
    min-width: 35px;
    text-align: right;
}

.text-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 右侧 */
.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #fff;
}

.chat-header {
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    font-weight: bold;
    font-size: 16px;
    display: flex;
    align-items: center;
    height: 55px;
    box-sizing: border-box;
}

.chat-history {
    flex: 1;
    padding: 20px;
    background: #f9f9f9;
}

.chat-input {
    padding: 15px 20px;
    border-top: 1px solid #eee;
    background: #fff;
}

/* 消息气泡 */
.msg-row {
    display: flex;
    margin-bottom: 15px;
    animation: fadeIn 0.3s ease;
}

.msg-mine {
    justify-content: flex-end;
}

.msg-bubble {
    max-width: 70%;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    background: #fff;
    color: #333;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    word-break: break-all;
}

.msg-mine .msg-bubble {
    background: #409EFF;
    color: #fff;
    border-bottom-right-radius: 2px;
    box-shadow: 0 1px 2px rgba(64, 158, 255, 0.2);
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>