import request from '@/utils/axios';

// 首页组件 (home widgets): workplace apps shown as fixed-height rows on the app's
// Home page. Order is top to bottom; access groups apply to who sees them.

export function widgetGet() {
  return request({ url: '/manager/workplace/widget', method: 'get' });
}

export function widgetPost(data: { app_id: string; height: number }) {
  return request({ url: '/manager/workplace/widget', method: 'post', data });
}

export function widgetPut(app_id: string, data: { height?: number; status?: number }) {
  return request({ url: `/manager/workplace/widgets/${app_id}`, method: 'put', data });
}

export function widgetDelete(app_id: string) {
  return request({ url: `/manager/workplace/widgets/${app_id}`, method: 'delete' });
}

export function widgetReorderPut(app_ids: string[]) {
  return request({ url: '/manager/workplace/widget/reorder', method: 'put', data: { app_ids } });
}
