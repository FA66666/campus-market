<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { Plus } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import request from "../utils/request";
import { useRouter } from "vue-router";

const router = useRouter();
const formRef = ref();
const fileList = ref<any[]>([]);

// ✅ [新增] 分类数据状态
const categoryOptions = ref([]);

const form = reactive({
    title: "",
    price: 0,
    description: "",
    stock_quantity: 1,
    category_id: null, // 这里将存储选中的分类ID
});

const rules = {
    title: [{ required: true, message: "请输入商品标题", trigger: "blur" }],
    price: [{ required: true, message: "请输入价格", trigger: "blur" }],
    category_id: [{ required: true, message: "请选择分类", trigger: "change" }],
    description: [{ required: true, message: "请输入描述", trigger: "blur" }],
};

// ✅ [新增] 获取分类树
const fetchCategories = async () => {
    try {
        const res: any = await request.get('/categories');
        if (res.code === 200) {
            categoryOptions.value = res.data;
        }
    } catch (error) {
        console.error("获取分类失败", error);
    }
};

const handleExceed = () => {
    ElMessage.warning("最多只能上传 5 张图片");
};

const submitForm = async () => {
    if (!formRef.value) return;

    await formRef.value.validate(async (valid: boolean) => {
        if (valid) {
            if (fileList.value.length === 0) {
                ElMessage.warning("请至少上传一张图片");
                return;
            }

            const formData = new FormData();
            formData.append("title", form.title);
            formData.append("price", form.price.toString());
            formData.append("description", form.description);
            formData.append("stock_quantity", form.stock_quantity.toString());
            // ✅ 此时 category_id 已经是选中的叶子节点 ID
            formData.append("category_id", form.category_id?.toString() || "");

            fileList.value.forEach((file) => {
                formData.append("images", file.raw);
            });

            try {
                const res: any = await request.post("/items", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                if (res.code === 201) {
                    ElMessage.success("发布成功，等待审核");
                    router.push("/profile");
                } else {
                    ElMessage.error(res.message || "发布失败");
                }
            } catch (err) {
                ElMessage.error("发布异常");
            }
        }
    });
};

onMounted(() => {
    fetchCategories();
});
</script>

<template>
    <div class="publish-container">
        <div class="form-card">
            <h2>📦 发布闲置</h2>
            <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="publish-form">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="form.title" placeholder="品牌型号 / 关键信息" />
                </el-form-item>

                <el-form-item label="价格" prop="price">
                    <el-input-number v-model="form.price" :min="0" :precision="2" />
                </el-form-item>

                <el-form-item label="库存" prop="stock_quantity">
                    <el-input-number v-model="form.stock_quantity" :min="1" :max="99" />
                </el-form-item>

                <el-form-item label="分类" prop="category_id">
                    <el-cascader v-model="form.category_id" :options="categoryOptions" :props="{
                        value: 'category_id',
                        label: 'category_name',
                        children: 'children',
                        emitPath: false // 只获取选中的最后一级ID
                    }" placeholder="请选择商品分类" style="width: 100%" clearable />
                </el-form-item>

                <el-form-item label="描述" prop="description">
                    <el-input v-model="form.description" type="textarea" rows="4" placeholder="描述宝贝的转手原因、新旧程度..." />
                </el-form-item>

                <el-form-item label="图片">
                    <el-upload v-model:file-list="fileList" action="#" list-type="picture-card" :auto-upload="false"
                        :limit="5" :on-exceed="handleExceed" multiple>
                        <el-icon>
                            <Plus />
                        </el-icon>
                    </el-upload>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="submitForm" size="large" class="submit-btn">
                        立即发布
                    </el-button>
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>

<style scoped>
.publish-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.form-card {
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

h2 {
    text-align: center;
    margin-bottom: 30px;
    color: #303133;
}

.submit-btn {
    width: 100%;
}
</style>