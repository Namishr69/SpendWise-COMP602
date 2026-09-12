import { apiRequest } from './client.js'

export function registerProfile(profile) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export function getMyProfile() {
  return apiRequest('/users/me')
}

export function updateMyProfile(profile) {
  return apiRequest('/users/me', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}
