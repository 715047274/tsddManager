import request from '@/utils/axios';

// 应用权限组 (app access groups). An app in no group is open to everyone;
// an app in groups is open only to those groups' members.

export function accessGroupGet() {
  return request({ url: '/manager/workplace/access/group', method: 'get' });
}

export function accessGroupPost(data: { name: string; remark?: string }) {
  return request({ url: '/manager/workplace/access/group', method: 'post', data });
}

export function accessGroupPut(group_no: string, data: { name: string; remark?: string }) {
  return request({ url: `/manager/workplace/access/groups/${group_no}`, method: 'put', data });
}

export function accessGroupDelete(group_no: string) {
  return request({ url: `/manager/workplace/access/groups/${group_no}`, method: 'delete' });
}

export function accessGroupAppGet(group_no: string) {
  return request({ url: `/manager/workplace/access/groups/${group_no}/app`, method: 'get' });
}

export function accessGroupAppPut(group_no: string, app_ids: string[]) {
  return request({ url: `/manager/workplace/access/groups/${group_no}/app`, method: 'put', data: { app_ids } });
}

export function accessGroupMemberGet(group_no: string) {
  return request({ url: `/manager/workplace/access/groups/${group_no}/member`, method: 'get' });
}

export function accessGroupMemberPost(group_no: string, uids: string[]) {
  return request({ url: `/manager/workplace/access/groups/${group_no}/member`, method: 'post', data: { uids } });
}

export function accessGroupMemberDelete(group_no: string, uid: string) {
  return request({ url: `/manager/workplace/access/groups/${group_no}/members/${uid}`, method: 'delete' });
}

// { app_id: [group names] } — apps missing from it are open to everyone.
export function accessAppGroupsGet() {
  return request({ url: '/manager/workplace/access/app_groups', method: 'get' });
}

// A user's groups and every app they can use.
export function accessUserGet(uid: string) {
  return request({ url: `/manager/workplace/access/users/${uid}`, method: 'get' });
}
