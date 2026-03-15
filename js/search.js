// js/search.js
import { supabase } from './supabase.js'

let currentUser = null
let searchTimeout = null

export async function initSearch() {
    console.log('🔍 Поиск инициализирован')
    
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    if (!currentUser) {
        window.location.href = '/nova-social/log.html'
        return
    }
    
    const searchInput = document.getElementById('searchInput')
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch)
        searchInput.focus()
    }
    
    // Загружаем всех пользователей при открытии
    loadAllUsers()
}

// Загрузка всех пользователей
async function loadAllUsers() {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, email, avatar_url')
            .neq('id', currentUser.id)
            .limit(50)
        
        if (error) throw error
        
        displayResults(users || [])
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error)
    }
}

async function handleSearch() {
    clearTimeout(searchTimeout)
    
    const query = document.getElementById('searchInput').value.trim()
    
    if (query.length < 2) {
        loadAllUsers()
        return
    }
    
    searchTimeout = setTimeout(() => performSearch(query), 500)
}

async function performSearch(query) {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, email, avatar_url')
            .neq('id', currentUser.id)
            .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(20)
        
        if (error) throw error
        
        displayResults(users || [])
        
    } catch (error) {
        console.error('Ошибка поиска:', error)
    }
}

function displayResults(users) {
    const container = document.getElementById('searchResults')
    
    if (!container) return
    
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
    
    const avatar = user.username ? user.username[0].toUpperCase() : '?'
    
    div.innerHTML = `
        <div class="user-avatar">${avatar}</div>
        <div class="user-info">
            <div class="user-name">${user.username || 'Пользователь'}</div>
            <div class="user-email">${user.email}</div>
        </div>
        <button class="start-chat-btn" onclick="window.startChat('${user.id}')">Написать</button>
    `
    
    return div
}

window.startChat = async function(userId) {
    try {
        console.log('🚀 Создание чата с:', userId)
        
        // Проверяем существующий чат
        const { data: existingChat, error: checkError } = await supchema
            .rpc('get_or_create_chat', {
                user1_id: currentUser.id,
                user2_id: userId
            })
        
        if (checkError) throw checkError
        
        if (existingChat) {
            window.location.href = `/nova-social/chat.html?id=${existingChat}`
        }
        
    } catch (error) {
        console.error('Ошибка создания чата:', error)
        alert('Не удалось создать чат')
    }
}