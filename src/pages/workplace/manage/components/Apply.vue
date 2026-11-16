<template>
  <el-dialog
    :model-value="value"
    :width="600"
    :align-center="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :draggable="true"
    :z-index="99"
    :title="title"
    @close="onClose"
  >
    <el-form :model="formData" label-width="96px">
      <el-form-item label="应用名称">
        <el-input v-model="formData.name" placeholder="请输入应用名称" maxlength="10" show-word-limit />
      </el-form-item>
      <el-form-item label="应用图标">
        <el-upload
          ref="upload"
          class="bd-upload"
          :action="actionURL"
          list-type="picture-card"
          :show-file-list="false"
          :headers="headers"
          :before-upload="beforeUploadFile"
          :on-success="onFileSuccess"
        >
          <img v-if="formData.icon" :src="`${BU_DOU_CONFIG.APP_URL}${formData.icon}`" class="avatar" />
          <el-icon v-else><Plus /></el-icon>
        </el-upload>
        <div class="bd-form-tip">建议 256×256 像素（不小于 160×160），正方形 PNG / JPG，客户端会自动裁成圆角，无需自带圆角。</div>
      </el-form-item>
      <el-form-item label="打开方式">
        <el-radio-group v-model="formData.jump_type">
          <el-radio :label="0">网页</el-radio>
          <el-radio :label="1">APP</el-radio>
          <el-radio :label="2">小程序</el-radio>
        </el-radio-group>
        <div class="bd-form-tip">
          网页：在应用内打开网址；APP：打开手机上的其他应用（如 maps://）；小程序：上传 .zip 包，客户端下载后在本地打开。
        </div>
      </el-form-item>
      <template v-if="formData.jump_type === 2">
        <!-- 小程序: a .zip with index.html at its root; clients download and open it locally -->
        <el-form-item label="小程序包">
          <el-upload
            v-loading="packageUploading"
            class="bd-package-upload"
            drag
            :action="packageActionURL"
            :headers="headers"
            accept=".zip,application/zip"
            :show-file-list="false"
            :before-upload="beforeUploadPackage"
            :on-success="onPackageSuccess"
            :on-error="onPackageError"
          >
            <el-icon class="bd-package-icon"><UploadFilled /></el-icon>
            <div v-if="formData.app_route" class="bd-package-text">
              <div class="bd-package-done">✓ 已上传</div>
              <div class="bd-package-path">{{ packageFileName }}</div>
              <div v-if="packageVersion" class="bd-package-version">版本：{{ packageVersion }} 上传</div>
              <div>拖入新的 .zip 或<em>点击重新上传</em>以发布新版本</div>
            </div>
            <div v-else class="bd-package-text">拖入 .zip 小程序包，或<em>点击上传</em></div>
          </el-upload>
          <div class="bd-package-tip">
            zip 根目录（或唯一的顶层文件夹）需包含 index.html，最大 50MB。每次上传都会生成新版本，客户端下次打开时自动更新。
          </div>
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item label="网页地址">
          <el-input v-model="formData.web_route" placeholder="请输入网页地址" />
        </el-form-item>
        <el-form-item label="APP地址">
          <el-input v-model="formData.app_route" placeholder="请输入APP地址" />
        </el-form-item>
      </template>
      <el-form-item label="付款">
        <el-radio-group v-model="formData.is_paid_app">
          <el-radio :label="0">免费</el-radio>
          <el-radio :label="1">付费</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="应用描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :autosize="{ minRows: 6, maxRows: 8 }"
          placeholder="请输入应用描述"
          show-word-limit
          maxlength="500"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-space>
        <el-button @click="onClose">取消</el-button>
        <el-button type="primary" :loading="loaging" @click="onConfirm">保存</el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script lang="ts" name="Apply" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, UploadFilled } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/modules/user';
// API 接口
import { appPost, appPut } from '@/api/workplace/app';
import { feileGet } from '@/api/file';

import { BU_DOU_CONFIG } from '@/config';

interface IProps {
  value: boolean;
  title: string;
  type: 'add' | 'edit';
  data: object;
  /** 新增时默认的打开方式: 0 网页, 1 APP, 2 小程序 */
  defaultJumpType?: number;
}
const props = withDefaults(defineProps<IProps>(), {
  value: false,
  title: '新增应用',
  type: 'add',
  defaultJumpType: 0
});
const userStore = useUserStore();

const content = ref('');
const loaging = ref<boolean>(false);
const formData = ref({
  icon: '',
  name: '',
  jump_type: 0,
  description: '',
  app_route: '',
  web_route: '',
  is_paid_app: 0
});

const emits = defineEmits<{
  (e: 'update:value', item: boolean): void;
  (e: 'ok', item: any): void;
}>();

watch(
  () => props.value,
  (n, _o) => {
    props.value = n;
    if (n && props.type == 'edit') {
      formData.value = props.data as any;
    }
    if (n && props.type == 'add') {
      formData.value.jump_type = props.defaultJumpType;
    }
    if (!n) {
      formData.value = {
        icon: '',
        name: '',
        jump_type: 0,
        description: '',
        app_route: '',
        web_route: '',
        is_paid_app: 0
      };
    }
  }
);

/**
 * 上传图片
 */
const headers = {
  token: userStore.token
};
const actionURL = ref('');
// 图片上传前获取上传地址
const beforeUploadFile = async (rawFile: any) => {
  const fileData = {
    path: `/${rawFile.uid}/${rawFile.name}`,
    type: 'report'
  };
  const res = (await feileGet(fileData)) as any;
  if (res.url) {
    actionURL.value = res.url;
    return true;
  } else {
    return false;
  }
};
// 图片上传成功获取地址
const onFileSuccess = (response: any, _uploadFile: any) => {
  formData.value.icon = response.path;
};

/**
 * 上传小程序包 (.zip)
 */
const packageActionURL = ref('');
const packageUploading = ref<boolean>(false);
// 当前小程序包文件名 (app_route 的最后一段)
const packageFileName = computed(() => (formData.value.app_route || '').split('/').pop());
// 版本 = 上传时间 (路径为 /miniapp/<毫秒时间戳>-<uid>/<文件名>)，与客户端显示一致
const packageVersion = computed(() => {
  const parts = (formData.value.app_route || '').split('/');
  const ms = Number((parts[parts.length - 2] || '').split('-')[0]);
  if (!ms || ms < 1e12) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
});
const PACKAGE_MAX_BYTES = 50 * 1024 * 1024;
const beforeUploadPackage = async (rawFile: any) => {
  if (!/\.zip$/i.test(rawFile.name)) {
    ElMessage.error('请上传 .zip 格式的小程序包');
    return false;
  }
  if (rawFile.size > PACKAGE_MAX_BYTES) {
    ElMessage.error('小程序包不能超过 50MB');
    return false;
  }
  // A new path per upload, so every upload is a new version for clients.
  const fileData = {
    path: `/miniapp/${Date.now()}-${rawFile.uid}/${rawFile.name}`,
    type: 'common'
  };
  const res = (await feileGet(fileData)) as any;
  if (res.url) {
    packageActionURL.value = res.url;
    packageUploading.value = true;
    return true;
  }
  return false;
};
const onPackageSuccess = (response: any, _uploadFile: any) => {
  packageUploading.value = false;
  formData.value.app_route = response.path;
  formData.value.web_route = '';
  ElMessage.success('小程序包上传成功，保存后生效');
};
const onPackageError = () => {
  packageUploading.value = false;
  ElMessage.error('小程序包上传失败');
};

// 取消
const onClose = () => {
  emits('update:value', false);
};

// 新增应用
const addApp = () => {
  loaging.value = true;
  appPost(formData.value)
    .then((res: any) => {
      loaging.value = false;
      if (res.status == 200) {
        ElMessage.success('新增成功！');
        content.value = '';
        onClose();
        emits('ok', true);
      }
    })
    .catch(err => {
      loaging.value = false;
      if (err.status == 400) {
        ElMessage.error(err.msg);
      }
    });
};

// 编辑
const editApp = () => {
  loaging.value = true;
  const app_id = (props.data as any).app_id;
  appPut(formData.value, app_id)
    .then((res: any) => {
      loaging.value = false;
      if (res.status == 200) {
        ElMessage.success('编辑成功！');
        content.value = '';
        onClose();
        emits('ok', true);
      }
    })
    .catch(err => {
      loaging.value = false;
      if (err.status == 400) {
        ElMessage.error(err.msg);
      }
    });
};
// 发送
const onConfirm = () => {
  if (formData.value.jump_type === 2 && !formData.value.app_route) {
    ElMessage.error('请先上传小程序包');
    return;
  }
  // 新增
  if (props.type === 'add') {
    addApp();
  }
  // 编辑
  if (props.type === 'edit') {
    editApp();
  }
};
</script>

<style lang="scss" scoped>
.bd-upload {
  ::v-deep(.el-upload--picture-card) {
    height: 78px;
    width: 78px;
  }

  .avatar {
    height: 78px;
    width: 78px;
  }
}

.bd-form-tip {
  width: 100%;
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.bd-package-upload {
  width: 100%;

  ::v-deep(.el-upload-dragger) {
    padding: 18px 12px;
  }

  .bd-package-icon {
    font-size: 40px;
    color: var(--el-color-primary);
  }

  .bd-package-text {
    font-size: 13px;
    color: var(--el-text-color-regular);
    line-height: 1.6;

    em {
      color: var(--el-color-primary);
      font-style: normal;
    }
  }

  .bd-package-version {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .bd-package-done {
    color: var(--el-color-success);
    font-weight: 600;
  }
}

.bd-package-tip {
  width: 100%;
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.bd-package-path {
  color: var(--el-text-color-regular);
  word-break: break-all;
}
</style>
