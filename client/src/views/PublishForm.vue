<template>
    <div class="form-container">
        <el-card class="publish-card">
            <template #header>
                <div class="card-header">
                    <span>发布新商品</span>
                </div>
            </template>

            <el-form :model="form" label-width="100px" size="large">

                <el-form-item label="商品标题" required>
                    <el-input v-model="form.title" placeholder="品牌型号，如：iPhone 13 Pro Max" />
                </el-form-item>

                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="商品分类" required>
                            <el-select v-model="form.category_id" placeholder="选择分类" style="width: 100%">
                                <el-option label="数码产品" :value="1" />
                                <el-option label="教材书籍" :value="2" />
                                <el-option label="生活用品" :value="3" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="价格 (元)" required>
                            <el-input-number v-model="form.price" :precision="2" :step="10" :min="0"
                                style="width: 100%" />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-form-item label="库存数量">
                    <el-input-number v-model="form.stock_quantity" :min="1" :max="999" />
                </el-form-item>

                <el-form-item label="图片链接" required>
                    <el-input v-model="form.main_image" placeholder="请输入图片URL (暂不支持上传)" />
                    <div class="img-preview" v-if="form.main_image">
                        <span>预览：</span>
                        <el-image :src="form.main_image" style="width: 100px; height: 100px; border-radius: 4px;"
                            fit="cover" />
                    </div>
                    <div class="help-text">测试可用图：https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500</div>
                </el-form-item>

                <el-form-item label="商品描述">
                    <el-input v-model="form.description" type="textarea" :rows="4" placeholder="描述一下商品的新旧程度、入手渠道等..." />
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="onSubmit" :loading="submitting">立即发布</el-button>
                    <el-button @click="$router.push('/')">取消</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import request from '../utils/request';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';

const router = useRouter();
const submitting = ref(false);

const form = reactive({
    title: '',
    category_id: null,
    price: 0,
    stock_quantity: 1,
    main_image: '',
    description: ''
});

const onSubmit = async () => {
    if (!form.title || !form.category_id || !form.price || !form.main_image) {
        ElMessage.warning('请填写完整的必要信息');
        return;
    }

    submitting.value = true;
    try {
        // 调用我们在后端写的 createItem 接口
        const res: any = await request.post('/items', form);
        if (res.code === 201) {
            ElMessage.success('发布成功！');
            router.push('/'); // 发布成功后跳回首页
        }
    } catch (error) {
        // 错误在拦截器里处理了，这里不需要多写
    } finally {
        submitting.value = false;
    }
};
</script>

<style scoped>
.form-container {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.help-text {
    font-size: 12px;
    color: #999;
    margin-top: 5px;
}

.img-preview {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #666;
}
</style>