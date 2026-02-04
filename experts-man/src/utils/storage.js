const EXPERTS_KEY = 'experts_data'
const FORM_DATA_KEY = 'expert_form_data'

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Generate random password (6 digits)
export function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Get all experts
export function getExperts() {
  const data = localStorage.getItem(EXPERTS_KEY)
  return data ? JSON.parse(data) : []
}

// Get expert by ID
export function getExpertById(id) {
  const experts = getExperts()
  return experts.find(e => e.id === id)
}

// Save expert (create or update)
export function saveExpert(expert) {
  const experts = getExperts()
  const index = experts.findIndex(e => e.id === expert.id)
  
  if (index >= 0) {
    experts[index] = { ...experts[index], ...expert }
  } else {
    experts.push(expert)
  }
  
  localStorage.setItem(EXPERTS_KEY, JSON.stringify(experts))
  return expert
}

// Delete expert
export function deleteExpert(id) {
  const experts = getExperts()
  const filtered = experts.filter(e => e.id !== id)
  localStorage.setItem(EXPERTS_KEY, JSON.stringify(filtered))
}

// Create new expert with link
export function createExpert(expertData) {
  const expert = {
    id: generateId(),
    password: generatePassword(),
    createdAt: new Date().toISOString(),
    ...expertData
  }
  return saveExpert(expert)
}

// Save form data (temporary save)
export function saveFormData(expertId, formData) {
  const key = `${FORM_DATA_KEY}_${expertId}`
  localStorage.setItem(key, JSON.stringify({
    ...formData,
    savedAt: new Date().toISOString()
  }))
}

// Get form data
export function getFormData(expertId) {
  const key = `${FORM_DATA_KEY}_${expertId}`
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : null
}

// Clear form data
export function clearFormData(expertId) {
  const key = `${FORM_DATA_KEY}_${expertId}`
  localStorage.removeItem(key)
}
