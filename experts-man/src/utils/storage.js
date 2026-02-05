const API_BASE = 'http://localhost:3001/api';
const FORM_DATA_KEY = 'expert_form_data';

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Generate random password (6 digits)
export function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get all experts
export async function getExperts() {
  const response = await fetch(`${API_BASE}/experts`);
  if (!response.ok) throw new Error('데이터를 불러오는데 실패했습니다.');
  return await response.json();
}

// Get expert by ID
export async function getExpertById(id) {
  const experts = await getExperts();
  return experts.find(e => e.id === id);
}

// Save expert (create or update)
export async function saveExpert(expert) {
  const response = await fetch(`${API_BASE}/experts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expert)
  });
  if (!response.ok) throw new Error('실패했습니다.');
  return expert;
}

// Delete expert
export async function deleteExpert(id) {
  const response = await fetch(`${API_BASE}/experts/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('실패했습니다.');
}

// Create new expert with link
export async function createExpert(expertData) {
  const expert = {
    id: generateId(),
    password: generatePassword(),
    createdAt: new Date().toISOString(),
    ...expertData
  };
  return await saveExpert(expert);
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

// Bulk update votes for a member
export async function updateMemberVotes(expertId, voterName, selectedSlotIds) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/vote`, {
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
export async function getVoters(expertId) {
  const expert = await getExpertById(expertId);
  if (!expert || !expert.pollingSlots) return [];

  const voters = new Set();
  expert.pollingSlots.forEach(slot => {
    if (slot.voters) {
      slot.voters.forEach(v => voters.add(v));
    }
  });
  return Array.from(voters);
}

// Check if voter password matches or set it if new
export async function checkVoterPassword(expertId, voterName, password) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterName, password })
  });
  if (!response.ok) throw new Error('비밀번호 확인에 실패했습니다.');
  return await response.json();
}

// Add polling slot
export async function addPollingSlot(expertId, slot) {
  const slotData = {
    id: generateId(),
    ...slot
  };
  const response = await fetch(`${API_BASE}/experts/${expertId}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slotData)
  });
  if (!response.ok) throw new Error('슬롯 추가에 실패했습니다.');
  return await getExpertById(expertId);
}

// Start polling for expert
export async function startPolling(expertId) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/start-polling`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('투표 시작에 실패했습니다.');
  return await getExpertById(expertId);
}

// Delete polling slot
export async function deletePollingSlot(expertId, slotId) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/slots/${slotId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('슬롯 삭제에 실패했습니다.');
  return await getExpertById(expertId);
}

// Confirm slots for expert selection
export async function confirmSlots(expertId, slotIds) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotIds })
  });
  if (!response.ok) throw new Error('일정 확정에 실패했습니다.');
  return await getExpertById(expertId);
}

// Expert selects a final slot
export async function selectExpertSlot(expertId, slot) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/select-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot })
  });
  if (!response.ok) throw new Error('슬롯 선택에 실패했습니다.');
  return await getExpertById(expertId);
}

// Reset confirmation (일정 변경 - 확정 취소)
export async function resetConfirmation(expertId) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/reset-confirmation`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('일정 확정 취소에 실패했습니다.');
  return await getExpertById(expertId);
}

// Expert marks no available schedule
export async function markNoAvailableSchedule(expertId) {
  const response = await fetch(`${API_BASE}/experts/${expertId}/no-available-schedule`, {
    method: 'POST'
  });
  if (!response.ok) throw new Error('요청 처리에 실패했습니다.');
  return await getExpertById(expertId);
}
