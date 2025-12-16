<template>
    <div class="chat-container">
        <el-card class="chat-card" :body-style="{ padding: '0px', height: '100%', display: 'flex' }">

            <div class="chat-sidebar">
                <div class="sidebar-header">消息列表</div>
                <el-scrollbar>
                    <div v-for="conv in conversations" :key="conv.counterpart_id" class="conv-item"
                        :class="{ active: currentChatUser?.user_id === conv.counterpart_id }" @click="selectUser(conv)"
                        @mouseenter="conv.showDel = true" @mouseleave="conv.showDel = false">
                        <el-badge :value="conv.unread_count" :hidden="conv.unread_count === 0" class="avatar-badge">
                            <el-avatar :size="40">{{ (conv.counterpart_name || 'U').charAt(0).toUpperCase()
                            }}</el-avatar>
                        </el-badge>
                        <div class="conv-info">
                            <div class="conv-name">{{ conv.counterpart_name }}</div>
                            <div class="conv-msg text-truncate">{{ conv.last_message }}</div>
                        </div>
                        <div class="conv-time">{{ formatTime(conv.created_at) }}</div>

                        <div v-if="conv.showDel" class="del-btn" @click.stop="handleDeleteConv(conv)">
                            <el-icon>
                                <Delete />
                            </el-icon>
                        </div>
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
                        <div class="history-inner">
                            <div v-for="msg in messageList" :key="msg.message_id" class="msg-row"
                                :class="{ 'msg-mine': isMyMessage(msg) }">
                                <el-avatar v-if="!isMyMessage(msg)" :size="32" class="msg-avatar-left">
                                    {{ currentChatUser.username.charAt(0).toUpperCase() }}
                                </el-avatar>

                                <div class="msg-content-wrapper">
                                    <div class="msg-bubble">
                                        {{ msg.content }}
                                    </div>
                                    <div class="msg-time-tip">{{ formatDetailTime(msg.created_at) }}</div>
                                </div>

                                <el-avatar v-if="isMyMessage(msg)" :size="32" class="msg-avatar-right"
                                    style="background-color: #409EFF">
                                    我
                                </el-avatar>
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
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue';
import request from '../utils/request';
import { useUserStore } from '../stores/user';
import { useRoute } from 'vue-router';
// ✅ 新增：引入 Delete 图标和 ElMessageBox
import { Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const userStore = useUserStore();
const route = useRoute();

const myId = computed(() => userStore.userInfo?.user_id || userStore.userInfo?.id);

const conversations = ref<any[]>([]);
const messageList = ref<any[]>([]);
const currentChatUser = ref<any>(null);
const inputContent = ref('');
const historyScroll = ref();
const sending = ref(false);

let msgTimer: any = null;
let convTimer: any = null;

const isMyMessage = (msg: any) => {
    return msg.sender_id === myId.value;
};

// 1. 获取会话列表
const fetchConversations = async () => {
    try {
        const res: any = await request.get('/messages/contacts');
        if (res.code === 200) {
            // 保留 showDel 状态
            const oldMap = new Map(conversations.value.map(c => [c.counterpart_id, c.showDel]));

            conversations.value = res.data.map((c: any) => ({
                ...c,
                showDel: oldMap.get(c.counterpart_id) || false
            }));
        }
    } catch (e) { }
};

// 2. 选中某人聊天
const selectUser = async (conv: any) => {
    if (currentChatUser.value?.user_id === conv.counterpart_id) return;

    currentChatUser.value = {
        user_id: conv.counterpart_id,
        username: conv.counterpart_name
    };

    messageList.value = [];
    await loadHistory(conv.counterpart_id, true);

    conv.unread_count = 0;
    startMsgPolling(conv.counterpart_id);
};

// ✅ 新增：删除会话逻辑
const handleDeleteConv = async (conv: any) => {
    try {
        await ElMessageBox.confirm('确定删除该会话及所有聊天记录吗？此操作不可恢复。', '删除确认', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消'
        });

        const res: any = await request.delete(`/messages/conversations/${conv.counterpart_id}`);
        if (res.code === 200) {
            ElMessage.success('删除成功');
            // 如果删除的是当前正在聊的，清空右侧
            if (currentChatUser.value?.user_id === conv.counterpart_id) {
                currentChatUser.value = null;
                messageList.value = [];
                stopMsgPolling();
            }
            fetchConversations();
        }
    } catch (e) {
        // 取消或失败
    }
};

// 3. 消息轮询
const startMsgPolling = (targetId: number) => {
    stopMsgPolling();
    msgTimer = setInterval(() => {
        loadHistory(targetId, false);
    }, 3000);
};

const stopMsgPolling = () => {
    if (msgTimer) {
        clearInterval(msgTimer);
        msgTimer = null;
    }
};

// 4. 加载历史记录
const loadHistory = async (targetId: number, forceScroll = false) => {
    try {
        const res: any = await request.get(`/messages/history?target_id=${targetId}`);
        if (res.code === 200) {
            const newMessages = res.data || [];
            if (forceScroll || newMessages.length > messageList.value.length) {
                messageList.value = newMessages;
                scrollToBottom();
            } else {
                messageList.value = newMessages;
            }
        }
    } catch (e) { }
};

// 5. 发送消息
const handleSend = async () => {
    if (!inputContent.value.trim()) return;
    const content = inputContent.value;
    const targetId = currentChatUser.value.user_id;

    sending.value = true;
    try {
        const res: any = await request.post('/messages/send', {
            receiver_id: targetId,
            content: content
        });

        if (res.code === 200) {
            inputContent.value = '';
            await loadHistory(targetId, true);
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
    if (date.toDateString() === now.toDateString()) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return date.toLocaleDateString();
};

const formatDetailTime = (timeStr: string) => {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleString();
}

onMounted(async () => {
    await fetchConversations();

    const targetId = route.query.to;
    const targetName = route.query.name;
    if (targetId) {
        currentChatUser.value = { user_id: Number(targetId), username: targetName };
        await loadHistory(Number(targetId), true);
        startMsgPolling(Number(targetId));
    }

    convTimer = setInterval(() => {
        fetchConversations();
    }, 5000);
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

.chat-sidebar {
    width: 260px;
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
    padding: 15px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    align-items: center;
    gap: 12px;
    transition: background-color 0.2s;
    position: relative;
    /* 为删除按钮定位 */
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
    margin-bottom: 4px;
}

.conv-msg {
    font-size: 12px;
    color: #999;
}

.conv-time {
    font-size: 11px;
    color: #ccc;
    min-width: 40px;
    text-align: right;
}

.text-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ✅ 新增：删除按钮样式 */
.del-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: #fff;
    border-radius: 4px;
    padding: 6px;
    color: #f56c6c;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.del-btn:hover {
    background: #fef0f0;
}

/* 右侧 */
.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #fff;
}

.chat-header {
    padding: 0 20px;
    border-bottom: 1px solid #eee;
    font-weight: bold;
    font-size: 16px;
    display: flex;
    align-items: center;
    height: 60px;
    box-sizing: border-box;
}

.chat-history {
    flex: 1;
    background: #f9f9f9;
}

.history-inner {
    padding: 20px;
}

.chat-input {
    padding: 20px;
    border-top: 1px solid #eee;
    background: #fff;
}

.msg-row {
    display: flex;
    margin-bottom: 20px;
    align-items: flex-start;
    animation: fadeIn 0.3s ease;
}

.msg-row.msg-mine {
    flex-direction: row-reverse;
}

.msg-avatar-left {
    margin-right: 10px;
    background-color: #909399;
}

.msg-avatar-right {
    margin-left: 10px;
}

.msg-content-wrapper {
    max-width: 70%;
    display: flex;
    flex-direction: column;
}

.msg-mine .msg-content-wrapper {
    align-items: flex-end;
}

.msg-bubble {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    background: #fff;
    color: #333;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    word-break: break-all;
    position: relative;
    border: 1px solid #eee;
}

.msg-mine .msg-bubble {
    background: #409EFF;
    color: #fff;
    border: none;
    box-shadow: 0 1px 4px rgba(64, 158, 255, 0.3);
}

.msg-time-tip {
    font-size: 11px;
    color: #ccc;
    margin-top: 5px;
    margin-left: 2px;
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