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

                <el-form-item label="商品图片" required>
                    <el-upload v-model:file-list="fileList" action="#" list-type="picture-card" :auto-upload="false"
                        :on-preview="handlePictureCardPreview" :on-remove="handleRemove" :limit="9" multiple
                        accept="image/*">
                        <el-icon>
                            <Plus />
                        </el-icon>
                    </el-upload>
                    <div class="help-text">第一张图片将作为商品封面，后续图片将显示在详情页中。</div>
                </el-form-item>

                <el-dialog v-model="dialogVisible">
                    <img w-full :src="dialogImageUrl" alt="Preview Image" style="width: 100%" />
                </el-dialog>

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
import { Plus } from '@element-plus/icons-vue';
import type { UploadProps, UploadUserFile } from 'element-plus';

const router = useRouter();
const submitting = ref(false);

// 表单数据
const form = reactive({
    title: '',
    category_id: null,
    price: 0,
    stock_quantity: 1,
    description: ''
});

// ✅ 上传相关状态
const fileList = ref<UploadUserFile[]>([]);
const dialogImageUrl = ref('');
const dialogVisible = ref(false);

// 移除图片回调
const handleRemove: UploadProps['onRemove'] = (uploadFile, uploadFiles) => {
    console.log(uploadFile, uploadFiles);
};

// 预览图片回调
const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
    dialogImageUrl.value = uploadFile.url!;
    dialogVisible.value = true;
};

// 提交表单
const onSubmit = async () => {
    if (!form.title || !form.category_id || !form.price) {
        ElMessage.warning('请填写完整的必要信息');
        return;
    }

    // ✅ 校验：至少上传一张图
    if (fileList.value.length === 0) {
        ElMessage.warning('请至少上传一张商品图片');
        return;
    }

    submitting.value = true;
    try {
        // ✅ 使用 FormData 构建提交数据
        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('category_id', String(form.category_id));
        formData.append('price', String(form.price));
        formData.append('stock_quantity', String(form.stock_quantity));
        formData.append('description', form.description || '');

        // 循环添加所有图片文件
        // 注意：后端接收的字段名必须是 'images'，与路由中的 upload.array('images') 对应
        fileList.value.forEach((file) => {
            if (file.raw) {
                formData.append('images', file.raw);
            }
        });

        // ✅ 关键修改：移除 headers 配置，让 Axios 自动处理 Boundary
        const res: any = await request.post('/items', formData);

        if (res.code === 201) {
            ElMessage.success('发布成功！');
            router.push('/');
        }
    } catch (error) {
        // 错误已由拦截器处理
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
    margin-top: 10px;
    width: 100%;
}
</style>