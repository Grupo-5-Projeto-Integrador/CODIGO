export async function fetchNotifications() {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('failed to fetch notifications');
  return res.json();
}

export async function markNotificationAsRead(id: number) {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('failed to mark notification as read');
  return res.json();
}
