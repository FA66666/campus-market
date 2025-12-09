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
                                <el-button @click="handleSend">发送</el-button>
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
import { ref, onMounted, nextTick } from 'vue';
import request from '../utils/request';
import { useUserStore } from '../stores/user';
import { useRoute } from 'vue-router';

const userStore = useUserStore();
const route = useRoute();
const myId = userStore.userInfo?.id; // 确保 store 里存了 id

const conversations = ref<any[]>([]);
const messageList = ref<any[]>([]);
const currentChatUser = ref<any>(null);
const inputContent = ref('');
const historyScroll = ref();

// 1. 获取会话列表
const fetchConversations = async () => {
    try {
        const res: any = await request.get('/messages/conversations');
        if (res.code === 200) {
            conversations.value = res.data;
        }
    } catch (e) { }
};

// 2. 选中某人聊天
const selectUser = async (conv: any) => {
    currentChatUser.value = {
        user_id: conv.counterpart_id,
        username: conv.counterpart_name
    };
    await loadHistory(conv.counterpart_id);
    // 清除未读红点（前端效果，后端已在 loadHistory 里更新）
    conv.unread_count = 0;
};

// 3. 加载历史记录
const loadHistory = async (targetId: number) => {
    const res: any = await request.get(`/messages/history/${targetId}`);
    if (res.code === 200) {
        messageList.value = res.data;
        scrollToBottom();
    }
};

// 4. 发送消息
const handleSend = async () => {
    if (!inputContent.value.trim()) return;
    const content = inputContent.value;
    const targetId = currentChatUser.value.user_id;

    try {
        const res: any = await request.post('/messages', {
            receiver_id: targetId,
            content: content
        });

        if (res.code === 200) {
            // 乐观更新：直接把消息推入列表
            messageList.value.push({
                message_id: Date.now(), // 临时ID
                sender_id: myId,
                receiver_id: targetId,
                content: content,
                created_at: new Date()
            });
            inputContent.value = '';
            scrollToBottom();
            fetchConversations(); // 刷新左侧列表的“最后一条消息”
        }
    } catch (e) { }
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
    const date = new Date(timeStr);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

onMounted(async () => {
    await fetchConversations();

    // 如果 URL 带了 targetId (从商品详情页跳过来)，自动选中
    const targetId = route.query.to;
    const targetName = route.query.name;
    if (targetId) {
        // 模拟选中
        currentChatUser.value = { user_id: Number(targetId), username: targetName };
        await loadHistory(Number(targetId));
    }
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
}

.conv-item {
    display: flex;
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    align-items: center;
    gap: 10px;
}

.conv-item:hover {
    background: #f0f2f5;
}

.conv-item.active {
    background: #e6f7ff;
}

.conv-info {
    flex: 1;
    overflow: hidden;
}

.conv-name {
    font-weight: 500;
    font-size: 14px;
}

.conv-msg {
    font-size: 12px;
    color: #999;
}

.conv-time {
    font-size: 12px;
    color: #ccc;
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
}

.chat-header {
    padding: 15px;
    border-bottom: 1px solid #eee;
    font-weight: bold;
}

.chat-history {
    flex: 1;
    padding: 20px;
    background: #fff;
}

.chat-input {
    padding: 20px;
    border-top: 1px solid #eee;
}

/* 消息气泡 */
.msg-row {
    display: flex;
    margin-bottom: 15px;
}

.msg-mine {
    justify-content: flex-end;
}

.msg-bubble {
    max-width: 70%;
    padding: 10px 15px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.5;
    background: #f4f4f5;
    color: #333;
}

.msg-mine .msg-bubble {
    background: #409EFF;
    color: #fff;
    border-bottom-right-radius: 2px;
}
</style>