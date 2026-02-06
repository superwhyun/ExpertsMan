const API_BASE = 'http://localhost:3001/api';
const FORM_DATA_KEY = 'expert_form_data';

// Get workspace slug from URL
export function getWorkspaceSlug() {
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  if (match && match[1] !== 'godgod') {
    return match[1];
  }
  return null;
}

// Get workspace API base URL
function getWorkspaceApiBase(workspace) {
  const slug = workspace || getWorkspaceSlug();
  if (!slug) throw new Error('워크스페이스가 지정되지 않았습니다.');
  return `${API_BASE}/workspaces/${slug}`;
}

// Get auth headers for workspace
function getAuthHeaders(workspace) {
  const slug = workspace || getWorkspaceSlug();
  const token = localStorage.getItem(`workspace_token_${slug}`);
  return {
    'Content-Type': 'application/json',
    'X-Workspace-Token': token || ''
  };
}

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Generate random password (6 digits)
export function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get all experts in workspace
export async function getExperts(workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts`, {
    headers: getAuthHeaders(workspace)
  });
  if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
  return await response.json();
}

// Get expert by ID (public - no auth required)
export async function getExpertById(id, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${id}`);
  if (!response.ok) return null;
  return await response.json();
}

// Save expert (create or update)
export async function saveExpert(expert, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts`, {
    method: 'POST',
    headers: getAuthHeaders(workspace),
    body: JSON.stringify(expert)
  });
  if (!response.ok) throw new Error('실패했습니다.');
  return expert;
}

// Delete expert
export async function deleteExpert(id, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(workspace)
  });
  if (!response.ok) throw new Error('실패했습니다.');
}

// Create new expert with link
export async function createExpert(expertData, workspace) {
  const expert = {
    id: generateId(),
    password: generatePassword(),
    createdAt: new Date().toISOString(),
    ...expertData
  };
  return await saveExpert(expert, workspace);
}

// Save form data (temporary save in localStorage)
export function saveFormData(expertId, formData) {
  const key = `${FORM_DATA_KEY}_${expertId}`;
  localStorage.setItem(key, JSON.stringify({
    ...formData,
    savedAt: new Date().toISOString()
  }));
}

// Get form data (localStorage)
export function getFormData(expertId) {
  const key = `${FORM_DATA_KEY}_${expertId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// Clear form data (localStorage)
export function clearFormData(expertId) {
  const key = `${FORM_DATA_KEY}_${expertId}`;
  localStorage.removeItem(key);
}

// Bulk update votes for a member (public - no auth required)
export async function updateMemberVotes(expertId, voterName, selectedSlotIds, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterName, selectedSlotIds })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '투표 저장에 실패했습니다.');
  }
}

// Get all voters for an expert's poll
export async function getVoters(expertId, workspace) {
  const expert = await getExpertById(expertId, workspace);
  if (!expert || !expert.pollingSlots) return [];

  const voters = new Set();
  expert.pollingSlots.forEach(slot => {
    if (slot.voters) {
      slot.voters.forEach(v => voters.add(v));
    }
  });
  return Array.from(voters);
}

// Check if voter password matches or set it if new (public - no auth required)
export async function checkVoterPassword(expertId, voterName, password, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterName, password })
  });
  if (!response.ok) throw new Error('비밀번호 확인에 실패했습니다.');
  return await response.json();
}

// Add polling slot
export async function addPollingSlot(expertId, slot, workspace) {
  const slotData = {
    id: generateId(),
    ...slot
  };
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/slots`, {
    method: 'POST',
    headers: getAuthHeaders(workspace),
    body: JSON.stringify(slotData)
  });
  if (!response.ok) throw new Error('슬롯 추가에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}

// Start polling for expert
export async function startPolling(expertId, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/start-polling`, {
    method: 'POST',
    headers: getAuthHeaders(workspace)
  });
  if (!response.ok) throw new Error('투표 시작에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}

// Delete polling slot
export async function deletePollingSlot(expertId, slotId, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/slots/${slotId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(workspace)
  });
  if (!response.ok) throw new Error('슬롯 삭제에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}

// Confirm slots for expert selection
export async function confirmSlots(expertId, slotIds, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(workspace),
    body: JSON.stringify({ slotIds })
  });
  if (!response.ok) throw new Error('일정 확정에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}

// Expert selects a final slot (public - no auth required)
export async function selectExpertSlot(expertId, slot, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/select-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot })
  });
  if (!response.ok) throw new Error('슬롯 선택에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}

// Reset confirmation (일정 변경 - 확정 취소)
export async function resetConfirmation(expertId, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/reset-confirmation`, {
    method: 'POST',
    headers: getAuthHeaders(workspace)
  });
  if (!response.ok) throw new Error('일정 확정 취소에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}

// Expert marks no available schedule (public - no auth required)
export async function markNoAvailableSchedule(expertId, workspace) {
  const response = await fetch(`${getWorkspaceApiBase(workspace)}/experts/${expertId}/no-available-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('요청 처리에 실패했습니다.');
  return await getExpertById(expertId, workspace);
}
