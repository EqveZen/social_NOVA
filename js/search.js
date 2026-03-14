// js/search.js
import { supabase } from './supabase.js'

let currentUser = null
let searchTimeout = null

export async function initSearch() {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    const searchInput = document.getElementById('searchInput')
    searchInput.addEventListener('input', handleSearch)
}

async function handleSearch() {
    clearTimeout(searchTimeout)
    
    const query = document.getElementById('searchInput').value.trim()
    
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '<div class="no-results">Введите минимум 2 символа</div>'
        return
    }
    
    searchTimeout = setTimeout(() => performSearch(query), 500)
}

async function performSearch(query) {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url')
        .neq('id', currentUser.id)
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20)
    
    if (error) {
        console.error('Ошибка поиска:', error)
        return
    }
    
    displayResults(users)
}

function displayResults(users) {
    const container = document.getElementById('searchResults')
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="no-results">Ничего не найдено</div>'
        return
    }
    
    container.innerHTML = ''
    
    users.forEach(user => {
        const userElement = createUserElement(user)
        container.appendChild(userElement)
    })
}

function createUserElement(user) {
    const div = document.createElement('div')
    div.className = 'user-item'
    
    div.innerHTML = `
        <div class="user-avatar">${user.username ? user.username[0].toUpperCase() : '?'}</div>
        <div class="user-info">
            <div class="user-name">${user.username || 'Пользователь'}</div>
            <div class="user-email">${user.email}</div>
        </div>
        <button class="start-chat-btn" onclick="startChat('${user.id}')">Написать</button>
    `
    
    return div
}

window.startChat = async function(userId) {
    const { data: chatId, error } = await supabase
        .rpc('get_or_create_chat', {
            user1_id: currentUser.id,
            user2_id: userId
        })
    
    if (error) {
        console.error('Ошибка создания чата:', error)
        alert('Не удалось создать чат')
        return
    }
    
    window.location.href = `chat.html?id=${chatId}`
}
