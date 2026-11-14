<template>
  <bd-page class="flex">
    <!-- 左侧: 权限组列表 -->
    <div class="w-280px mr-12px el-card border-none flex-col box-border overflow-hidden">
      <div class="h-50px pl-12px pr-12px box-border flex items-center justify-between bd-title">
        <p class="m-0 font-600">应用权限组</p>
        <el-button type="primary" size="small" @click="openGroupDialog('add')">新增权限组</el-button>
      </div>
      <div v-loading="loadGroups" class="flex-1 overflow-auto p-8px">
        <el-empty v-if="!groups.length && !loadGroups" description="还没有权限组" :image-size="80" />
        <div
          v-for="g in groups"
          :key="g.group_no"
          class="access-group p-10px mb-6px rounded-6px cursor-pointer"
          :class="{ 'is-active': current?.group_no === g.group_no }"
          @click="selectGroup(g)"
        >
          <div class="flex items-center justify-between">
            <span class="font-600 truncate">{{ g.name }}</span>
            <span class="text-12px opacity-60 whitespace-nowrap ml-8px">{{ g.app_count }} 应用 · {{ g.member_count }} 人</span>
          </div>
          <div v-if="g.remark" class="text-12px opacity-60 mt-4px truncate">{{ g.remark }}</div>
        </div>
      </div>
      <div class="p-12px text-12px opacity-70 leading-18px">
        不在任何权限组里的应用对所有人可见；加入权限组后，只有该组成员可见。用户属于多个组时，可用应用为各组之和。
      </div>
    </div>

    <!-- 右侧: 选中的权限组 -->
    <div class="flex-1 el-card border-none flex-col box-border overflow-hidden">
      <div class="h-50px pl-12px pr-12px box-border flex items-center justify-between bd-title">
        <div class="flex items-center min-w-0">
          <p class="m-0 font-600 truncate">{{ current ? current.name : '请选择权限组' }}</p>
          <template v-if="current">
            <el-button link type="primary" class="ml-12px" @click="openGroupDialog('edit')">编辑</el-button>
            <el-button link type="danger" @click="onDeleteGroup">删除</el-button>
          </template>
        </div>
        <el-button @click="checkUserValue = true">查询用户可用应用</el-button>
      </div>

      <div v-if="current" class="flex-1 overflow-hidden p-12px flex-col">
        <el-tabs v-model="tab" class="flex-1 flex-col overflow-hidden access-tabs">
          <!-- 应用 -->
          <el-tab-pane :label="`应用 (${selectedApps.length})`" name="apps">
            <div class="flex items-center justify-between mb-12px">
              <el-input v-model="appKeyword" placeholder="搜索应用" clearable class="!w-240px" />
              <el-space>
                <el-button :disabled="!appsDirty" @click="resetApps">撤销</el-button>
                <el-button type="primary" :disabled="!appsDirty" :loading="savingApps" @click="saveApps">保存</el-button>
              </el-space>
            </div>
            <div v-loading="loadApps" class="overflow-auto access-app-grid">
              <el-checkbox-group v-model="selectedApps">
                <el-checkbox v-for="app in filteredApps" :key="app.app_id" :label="app.app_id" border class="access-app">
                  <div class="flex items-center">
                    <img v-if="app.icon" :src="iconURL(app.icon)" class="w-28px h-28px rounded-6px mr-8px" />
                    <div class="min-w-0">
                      <div class="truncate">{{ app.name }}</div>
                      <div class="text-12px opacity-60 truncate">
                        <template v-if="otherGroups(app.app_id).length">也在: {{ otherGroups(app.app_id).join('、') }}</template>
                        <template v-else-if="app.status !== 1">已禁用</template>
                        <template v-else-if="!selectedApps.includes(app.app_id)">所有人可见</template>
                      </div>
                    </div>
                  </div>
                </el-checkbox>
              </el-checkbox-group>
              <el-empty v-if="!filteredApps.length && !loadApps" description="没有应用" :image-size="80" />
            </div>
          </el-tab-pane>

          <!-- 成员 -->
          <el-tab-pane :label="`成员 (${members.length})`" name="members">
            <div class="flex items-center justify-end mb-12px">
              <el-button type="primary" @click="openAddMembers">添加成员</el-button>
            </div>
            <el-table v-loading="loadMembers" :data="members" :border="true" height="100%">
              <el-table-column type="index" width="50" align="center" />
              <el-table-column prop="name" label="名称" min-width="140" />
              <el-table-column prop="phone" label="手机号" min-width="140" />
              <el-table-column prop="short_no" label="短号" min-width="120" />
              <el-table-column prop="uid" label="用户ID" min-width="260" />
              <el-table-column label="操作" width="100" align="center">
                <template #default="scope">
                  <el-button link type="danger" @click="onRemoveMember(scope.row)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
      <el-empty v-else class="flex-1" description="在左侧选择或新增一个权限组" />
    </div>

    <!-- 新增/编辑权限组 -->
    <el-dialog v-model="groupDialog" :title="groupDialogType === 'add' ? '新增权限组' : '编辑权限组'" width="420" align-center>
      <el-form label-width="60px">
        <el-form-item label="名称" required>
          <el-input v-model="groupForm.name" maxlength="50" placeholder="例如: 销售部" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="groupForm.remark" maxlength="200" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingGroup" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加成员 -->
    <el-dialog v-model="memberDialog" title="添加成员" width="720" align-center>
      <div class="flex mb-12px">
        <el-input
          v-model="userQuery.keyword"
          placeholder="名称 / 手机号 / 短号"
          clearable
          class="mr-12px"
          @keyup.enter="searchUsers"
        />
        <el-button type="primary" @click="searchUsers">查询</el-button>
      </div>
      <el-table
        ref="userTable"
        v-loading="loadUsers"
        :data="users"
        :border="true"
        height="360"
        row-key="uid"
        @selection-change="(rows: any[]) => (pickedUsers = rows)"
      >
        <el-table-column type="selection" width="44" :selectable="(row: any) => !memberUIDs.has(row.uid)" reserve-selection />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="short_no" label="短号" min-width="110" />
        <el-table-column label="" width="80" align="center">
          <template #default="scope">
            <el-tag v-if="memberUIDs.has(scope.row.uid)" size="small" type="info">已在组</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex justify-end mt-12px">
        <el-pagination
          v-model:current-page="userQuery.page_index"
          :page-size="userQuery.page_size"
          layout="total, prev, pager, next"
          :total="userTotal"
          @current-change="searchUsers"
        />
      </div>
      <template #footer>
        <el-button @click="memberDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!pickedUsers.length" :loading="savingMembers" @click="addMembers">
          添加 {{ pickedUsers.length || '' }} 人
        </el-button>
      </template>
    </el-dialog>

    <!-- 查询用户可用应用 -->
    <el-dialog v-model="checkUserValue" title="查询用户可用应用" width="560" align-center>
      <div class="flex mb-12px">
        <el-input v-model="checkKeyword" placeholder="名称 / 手机号 / 短号" clearable class="mr-12px" @keyup.enter="checkUser" />
        <el-button type="primary" :loading="checking" @click="checkUser">查询</el-button>
      </div>
      <div v-if="checkResult">
        <p class="m-0 mb-8px font-600">{{ checkResult.user.name }} ({{ checkResult.user.phone }})</p>
        <p class="m-0 mb-8px">
          权限组:
          <el-tag v-for="g in checkResult.groups" :key="g.group_no" class="mr-6px" size="small">{{ g.name }}</el-tag>
          <span v-if="!checkResult.groups.length" class="opacity-60">无</span>
        </p>
        <p class="m-0 mb-6px">可用应用:</p>
        <div>
          <el-tag v-for="a in checkResult.apps" :key="a.app_id" class="mr-6px mb-6px" :type="a.open_to_all ? 'info' : 'success'">
            {{ a.name }}{{ a.open_to_all ? ' (所有人)' : '' }}
          </el-tag>
          <span v-if="!checkResult.apps.length" class="opacity-60">无</span>
        </div>
      </div>
    </el-dialog>
  </bd-page>
</template>

<route lang="yaml">
meta:
  title: 应用权限组
  isAffix: false
</route>

<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { BU_DOU_CONFIG } from '@/config';
import { appGet } from '@/api/workplace/app';
import { userListGet } from '@/api/user';
import {
  accessGroupGet,
  accessGroupPost,
  accessGroupPut,
  accessGroupDelete,
  accessGroupAppGet,
  accessGroupAppPut,
  accessGroupMemberGet,
  accessGroupMemberPost,
  accessGroupMemberDelete,
  accessAppGroupsGet,
  accessUserGet
} from '@/api/workplace/access';

interface Group {
  group_no: string;
  name: string;
  remark: string;
  app_count: number;
  member_count: number;
}
interface App {
  app_id: string;
  name: string;
  icon: string;
  status: number;
}

const iconURL = (icon: string) => (icon.startsWith('http') ? icon : `${BU_DOU_CONFIG.APP_URL}${icon}`);
const errMsg = (err: any) => ElMessage.error(err?.msg || '操作失败');

/** 权限组列表 */
const groups = ref<Group[]>([]);
const loadGroups = ref(false);
const current = ref<Group | null>(null);
const tab = ref('apps');

const getGroups = async () => {
  loadGroups.value = true;
  try {
    groups.value = ((await accessGroupGet()) as any) || [];
    if (current.value) {
      current.value = groups.value.find(g => g.group_no === current.value!.group_no) || null;
    }
    if (!current.value && groups.value.length) selectGroup(groups.value[0]);
  } catch (err) {
    errMsg(err);
  } finally {
    loadGroups.value = false;
  }
};

const selectGroup = (g: Group) => {
  if (current.value?.group_no === g.group_no) return;
  if (appsDirty.value && !window.confirm('应用改动还没有保存，确定离开？')) return;
  current.value = g;
  loadGroupDetail();
};

/** 新增/编辑权限组 */
const groupDialog = ref(false);
const groupDialogType = ref<'add' | 'edit'>('add');
const groupForm = reactive({ name: '', remark: '' });
const savingGroup = ref(false);

const openGroupDialog = (type: 'add' | 'edit') => {
  groupDialogType.value = type;
  groupForm.name = type === 'edit' ? current.value?.name || '' : '';
  groupForm.remark = type === 'edit' ? current.value?.remark || '' : '';
  groupDialog.value = true;
};

const saveGroup = async () => {
  if (!groupForm.name.trim()) return ElMessage.info('请输入权限组名称');
  savingGroup.value = true;
  try {
    if (groupDialogType.value === 'add') {
      const res: any = await accessGroupPost({ ...groupForm });
      current.value = { group_no: res.group_no } as Group;
      ElMessage.success('已新增权限组');
    } else {
      await accessGroupPut(current.value!.group_no, { ...groupForm });
      ElMessage.success('已保存');
    }
    groupDialog.value = false;
    await getGroups();
    if (groupDialogType.value === 'add') loadGroupDetail();
  } catch (err) {
    errMsg(err);
  } finally {
    savingGroup.value = false;
  }
};

const onDeleteGroup = () => {
  const g = current.value!;
  ElMessageBox.confirm(
    `删除“${g.name}”后，它的 ${g.member_count} 名成员将失去该组的应用；只属于该组的应用会变为所有人可见。`,
    '删除权限组',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  )
    .then(async () => {
      try {
        await accessGroupDelete(g.group_no);
        ElMessage.success('已删除');
        current.value = null;
        selectedApps.value = [];
        savedApps.value = [];
        getGroups();
        getAppGroups();
      } catch (err) {
        errMsg(err);
      }
    })
    .catch(() => {});
};

/** 应用 */
const allApps = ref<App[]>([]);
const appGroups = ref<Record<string, string[]>>({});
const selectedApps = ref<string[]>([]);
const savedApps = ref<string[]>([]);
const appKeyword = ref('');
const loadApps = ref(false);
const savingApps = ref(false);

const appsDirty = computed(() => {
  const a = [...selectedApps.value].sort().join();
  const b = [...savedApps.value].sort().join();
  return a !== b;
});
const filteredApps = computed(() => {
  const k = appKeyword.value.trim().toLowerCase();
  return k ? allApps.value.filter(a => a.name.toLowerCase().includes(k)) : allApps.value;
});
const otherGroups = (appId: string) => (appGroups.value[appId] || []).filter(n => n !== current.value?.name);

const getAllApps = async () => {
  const res: any = await appGet({ page_index: 1, page_size: 1000 });
  allApps.value = res.list || [];
};
const getAppGroups = async () => {
  appGroups.value = ((await accessAppGroupsGet()) as any) || {};
};

const resetApps = () => (selectedApps.value = [...savedApps.value]);

const saveApps = async () => {
  savingApps.value = true;
  try {
    await accessGroupAppPut(current.value!.group_no, selectedApps.value);
    savedApps.value = [...selectedApps.value];
    ElMessage.success('已保存，组成员现在可以使用这些应用');
    getGroups();
    getAppGroups();
  } catch (err) {
    errMsg(err);
  } finally {
    savingApps.value = false;
  }
};

/** 成员 */
const members = ref<any[]>([]);
const loadMembers = ref(false);
const memberUIDs = computed(() => new Set(members.value.map(m => m.uid)));

const getMembers = async () => {
  loadMembers.value = true;
  try {
    members.value = ((await accessGroupMemberGet(current.value!.group_no)) as any) || [];
  } finally {
    loadMembers.value = false;
  }
};

const loadGroupDetail = async () => {
  if (!current.value) return;
  loadApps.value = true;
  try {
    const apps: any[] = ((await accessGroupAppGet(current.value.group_no)) as any) || [];
    const ids = apps.map(a => a.app_id);
    savedApps.value = ids;
    selectedApps.value = [...ids];
  } catch (err) {
    errMsg(err);
  } finally {
    loadApps.value = false;
  }
  getMembers();
};

const onRemoveMember = (row: any) => {
  ElMessageBox.confirm(`将 ${row.name || row.uid} 移出“${current.value!.name}”？`, '移除成员', {
    type: 'warning',
    confirmButtonText: '移除',
    cancelButtonText: '取消'
  })
    .then(async () => {
      try {
        await accessGroupMemberDelete(current.value!.group_no, row.uid);
        ElMessage.success('已移除');
        getMembers();
        getGroups();
      } catch (err) {
        errMsg(err);
      }
    })
    .catch(() => {});
};

/** 添加成员 */
const memberDialog = ref(false);
const userTable = ref();
const users = ref<any[]>([]);
const userTotal = ref(0);
const loadUsers = ref(false);
const pickedUsers = ref<any[]>([]);
const savingMembers = ref(false);
const userQuery = reactive({ keyword: '', page_index: 1, page_size: 20 });

const searchUsers = async () => {
  loadUsers.value = true;
  try {
    const res: any = await userListGet(userQuery);
    users.value = res.list || [];
    userTotal.value = res.count || 0;
  } catch (err) {
    errMsg(err);
  } finally {
    loadUsers.value = false;
  }
};

const openAddMembers = () => {
  pickedUsers.value = [];
  userTable.value?.clearSelection();
  userQuery.keyword = '';
  userQuery.page_index = 1;
  memberDialog.value = true;
  searchUsers();
};

const addMembers = async () => {
  savingMembers.value = true;
  try {
    await accessGroupMemberPost(
      current.value!.group_no,
      pickedUsers.value.map(u => u.uid)
    );
    ElMessage.success(`已添加 ${pickedUsers.value.length} 人`);
    memberDialog.value = false;
    getMembers();
    getGroups();
  } catch (err) {
    errMsg(err);
  } finally {
    savingMembers.value = false;
  }
};

/** 查询用户可用应用 */
const checkUserValue = ref(false);
const checkKeyword = ref('');
const checking = ref(false);
const checkResult = ref<any>(null);

const checkUser = async () => {
  if (!checkKeyword.value.trim()) return ElMessage.info('请输入名称、手机号或短号');
  checking.value = true;
  checkResult.value = null;
  try {
    const res: any = await userListGet({ keyword: checkKeyword.value.trim(), page_index: 1, page_size: 1 });
    const user = (res.list || [])[0];
    if (!user) return ElMessage.info('没有找到这个用户');
    const access: any = await accessUserGet(user.uid);
    checkResult.value = { user, groups: access.groups || [], apps: access.apps || [] };
  } catch (err) {
    errMsg(err);
  } finally {
    checking.value = false;
  }
};

onMounted(async () => {
  try {
    await Promise.all([getAllApps(), getAppGroups()]);
  } catch (err) {
    errMsg(err);
  }
  getGroups();
});
</script>

<style scoped>
.access-group {
  border: 1px solid var(--el-border-color-lighter);
}
.access-group:hover {
  border-color: var(--el-color-primary-light-5);
}
.access-group.is-active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.access-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}
.access-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.access-app-grid {
  flex: 1;
}
.access-app-grid :deep(.el-checkbox-group) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.access-app {
  height: auto !important;
  margin-right: 0 !important;
  padding: 8px 12px !important;
}
.access-app :deep(.el-checkbox__label) {
  min-width: 0;
  flex: 1;
}
</style>
