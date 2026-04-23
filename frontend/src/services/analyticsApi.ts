import { apiClient } from "./apiClient";

export async function fetchOverview(userId: string, questionType: string = "All Types") {
  const { data } = await apiClient.get(`/analytics/users/${userId}/overview`, {
    params: { question_type: questionType },
  });
  return data;
}

export async function fetchTrends(userId: string, questionType: string = "All Types") {
  const { data } = await apiClient.get(`/analytics/users/${userId}/trends`, {
    params: { question_type: questionType },
  });
  return data;
}

export async function fetchBreakdown(userId: string, questionType: string = "All Types") {
  const { data } = await apiClient.get(`/analytics/users/${userId}/breakdown`, {
    params: { question_type: questionType },
  });
  return data;
}

export async function fetchHistory(userId: string, questionType: string = "All Types", limit: number = 25) {
  const { data } = await apiClient.get(`/analytics/users/${userId}/history`, {
    params: { question_type: questionType, limit },
  });
  return data;
}
