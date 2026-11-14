<template>
  <bd-page class="flex-col !p-0">
    <div ref="pageRef" class="flex-1 el-card border-none flex-col box-border overflow-hidden">
      <div class="h-50px pl-12px pr-12px box-border flex items-center justify-between bd-title">
        <div class="bd-title-left text-12px opacity-70">
          首页组件是固定高度的工作台应用（网页或小程序包），按下表顺序显示在 App 首页的问候语下方。拖动排序；应用权限组同样适用。
        </div>
        <el-button type="primary" @click="openAdd">新增组件</el-button>
      </div>

      <div class="flex-1 overflow-hidden p-12px">
        <el-table v-loading="loading" :data="widgets" row-key="app_id" :border="true" style="width: 100%; height: 100%">
          <el-table-column :width="42" align="center">
            <template #header><i-bd-drag size="16" /></template>
            <template #default><i-bd-drag class="bd-drag cursor-pointer" size="16" /></template>
          </el-table-column>
          <el-table-column label="应用" min-width="220">
            <template #default="{ row }">
              <div class="flex items-center">
                <img v-if="row.icon" :src="iconUrl(row.icon)" class="w-28px h-28px rounded-6px mr-8px" />
                <div>
                  <div>{{ row.name || row.app_id }}</div>
                  <div v-if="row.app_status !== 1" class="text-12px text-[var(--el-color-danger)]">应用已禁用，组件不显示</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="110">
            <template #default="{ row }">{{ typeLabel(row.jump_type) }}</template>
          </el-table-column>
          <el-table-column label="高度 (pt)" width="170">
            <template #default="{ row }">
              <el-input-number
                v-model="row.height"
                :min="60"
                :max="800"
                :step="10"
                size="small"
                @change="(v: number | undefined) => onHeight(row, v)"
              />
            </template>
          </el-table-column>
          <el-table-column label="显示" width="90" align="center">
            <template #default="{ row }">
              <el-switch :model-value="row.status === 1" @change="(v: any) => onStatus(row, v ? 1 : 0)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="danger" size="small" @click="onDelete(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="addValue" title="新增首页组件" width="520" align-center>
      <el-form label-width="80px">
        <el-form-item label="应用">
          <el-select v-model="addForm.app_id" filterable placeholder="选择工作台应用" class="w-full">
            <el-option v-for="a in addableApps" :key="a.app_id" :label="a.name" :value="a.app_id">
              <span>{{ a.name }}</span>
              <span class="float-right text-12px opacity-60">{{ typeLabel(a.jump_type) }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="高度 (pt)">
          <el-input-number v-model="addForm.height" :min="60" :max="800" :step="10" />
        </el-form-item>
        <div class="text-12px opacity-60 pl-80px">
          宽度为屏幕宽度。组件内容由应用提供：网页地址或上传的小程序包。只作为组件使用的应用不必加入任何分类。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="addValue = false">取消</el-button>
        <el-button type="primary" :disabled="!addForm.app_id" @click="onAdd">添加</el-button>
      </template>
    </el-dialog>
  </bd-page>
</template>

<script lang="ts" name="HomeWidget" setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import { BU_DOU_CONFIG } from '@/config';
import { appGet } from '@/api/workplace/app';
import { widgetGet, widgetPost, widgetPut, widgetDelete, widgetReorderPut } from '@/api/workplace/widget';

const pageRef = ref<HTMLElement>();
const loading = ref(false);
const widgets = ref<any[]>([]);
const allApps = ref<any[]>([]);

const typeLabels: Record<number, string> = { 0: '网页', 1: '原生', 2: '小程序包' };
const typeLabel = (t: number) => typeLabels[t] ?? '-';
const iconUrl = (icon: string) => (/^https?:/.test(icon) ? icon : `${BU_DOU_CONFIG.APP_URL}${icon}`);

const load = async () => {
  loading.value = true;
  try {
    widgets.value = ((await widgetGet()) as any) || [];
  } finally {
    loading.value = false;
  }
};

const addableApps = computed(() => {
  const used = new Set(widgets.value.map(w => w.app_id));
  return allApps.value.filter(a => !used.has(a.app_id));
});

const showError = (err: any) => ElMessage.error(err?.msg || '操作失败');

// 新增
const addValue = ref(false);
const addForm = reactive({ app_id: '', height: 160 });
const openAdd = async () => {
  const res: any = await appGet({ page_index: 1, page_size: 1000 });
  allApps.value = res.list || [];
  addForm.app_id = '';
  addForm.height = 160;
  addValue.value = true;
};
const onAdd = () => {
  widgetPost({ ...addForm })
    .then(() => {
      addValue.value = false;
      ElMessage.success('已添加，新组件在最上面，可拖动排序');
      load();
    })
    .catch(showError);
};

// 修改高度 / 显示
const onHeight = (row: any, v?: number) => {
  if (!v) return;
  widgetPut(row.app_id, { height: v }).catch(err => {
    showError(err);
    load();
  });
};
const onStatus = (row: any, status: number) => {
  widgetPut(row.app_id, { status })
    .then(() => (row.status = status))
    .catch(showError);
};

// 移除
const onDelete = (row: any) => {
  ElMessageBox.confirm(`将“${row.name || row.app_id}”从首页移除？应用本身不会被删除。`, '移除组件', {
    type: 'warning',
    confirmButtonText: '移除',
    cancelButtonText: '取消'
  })
    .then(() => widgetDelete(row.app_id).then(load).catch(showError))
    .catch(() => {});
};

// 拖动排序: 发送完整的新顺序
const setupDrag = () => {
  const body = pageRef.value?.querySelector('.el-table__body-wrapper tbody') as HTMLElement | null;
  if (!body) return;
  Sortable.create(body, {
    handle: '.bd-drag',
    animation: 300,
    onEnd({ newIndex, oldIndex }: any) {
      if (newIndex === oldIndex) return;
      const list = [...widgets.value];
      const [moved] = list.splice(oldIndex, 1);
      list.splice(newIndex, 0, moved);
      widgetReorderPut(list.map(w => w.app_id))
        .then(() => ElMessage.success('排序已保存'))
        .catch(showError)
        .finally(load);
    }
  });
};

onMounted(async () => {
  await load();
  await nextTick();
  setupDrag();
});
</script>
