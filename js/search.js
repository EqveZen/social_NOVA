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
    
    console.log('✅ Текущий пользователь:', currentUser.id)
    
    const searchInput = document.getElementById('searchInput')
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch)
        searchInput.focus()
    }
    
    // Загружаем всех пользователей при открытии
    await loadAllUsers()
}

// Загрузка всех пользователей
async function loadAllUsers() {
    try {
        console.log('📦 Загрузка пользователей...')
        
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, email, avatar_url')
            .neq('id', currentUser.id)
            .limit(50)
        
        if (error) {
            console.error('❌ Ошибка загрузки:', error)
            throw error
        }
        
        console.log('✅ Найдено пользователей:', users?.length || 0)
        displayResults(users || [])
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователей:', error)
        showError('Не удалось загрузить пользователей')
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
        console.log('🔍 Поиск:', query)
        
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, email, avatar_url')
            .neq('id', currentUser.id)
            .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(20)
        
        if (error) throw error
        
        console.log('✅ Найдено:', users?.length)
        displayResults(users || [])
        
    } catch (error) {
        console.error('❌ Ошибка поиска:', error)
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

function showError(message) {
    const container = document.getElementById('searchResults')
    if (container) {
        container.innerHTML = `<div class="no-results" style="color: #ff6b6b;">❌ ${message}</div>`
    }
}

window.startChat = async function(userId) {
    try {
        console.log('🚀 Создание чата с:', userId)
        console.log('👤 Текущий пользователь:', currentUser.id)
        
        if (!currentUser) {
            alert('Ошибка: пользователь не авторизован')
            return
        }
        
        // Проверяем существующий чат через RPC
        const { data: chatId, error } = await supabase
            .rpc('get_or_create_chat', {
                user1_id: currentUser.id,
                user2_id: userId
            })
        
        if (error) {
            console.error('❌ Ошибка RPC:', error)
            throw error
        }
        
        console.log('✅ Чат создан/найден, ID:', chatId)
        
        if (chatId) {
            // Успешно - переходим в чат
            window.location.href = `/nova-social/chat.html?id=${chatId}`
        } else {
            throw new Error('Не удалось создать чат')
        }
        
    } catch (error) {
        console.error('❌ Ошибка создания чата:', error)
        alert('Не удалось создать чат. Пожалуйста, попробуйте ещё раз.')
    }
}