// js/messages.js
import { supabase } from './supabase.js'

let currentUser = null
let allUsers = []

export async function initMessages() {
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    if (!currentUser) return
    
    // Загружаем чаты
    await loadChats()
    
    // Загружаем всех пользователей для нового чата
    await loadUsers()
    
    // Настраиваем поиск
    setupSearch()
}

// Загрузка чатов
async function loadChats() {
    // Получаем все чаты пользователя
    const { data: participations, error } = await supabase
        .from('chat_participants')
        .select(`
            chat_id,
            chats (
                id,
                last_message,
                last_message_time
            )
        `)
        .eq('user_id', currentUser.id)
    
    if (error) {
        console.error('Ошибка загрузки чатов:', error)
        return
    }
    
    if (!participations || participations.length === 0) {
        return // Показываем пустой список
    }
    
    // Для каждого чата загружаем собеседника
    const chatsList = document.getElementById('chatsList')
    chatsList.innerHTML = ''
    
    for (const p of participations) {
        await loadChatPreview(p.chat_id, chatsList)
    }
}

// Загрузка превью чата
async function loadChatPreview(chatId, container) {
    // Получаем собеседника
    const { data: participants, error } = await supabase
        .from('chat_participants')
        .select(`
            user_id,
            profiles:user_id (
                username,
                avatar_url
            )
        `)
        .eq('chat_id', chatId)
        .neq('user_id', currentUser.id)
    
    if (error || !participants || participants.length === 0) return
    
    const otherUser = participants[0].profiles
    
    // Получаем последнее сообщение
    const { data: messages } = await supabase
        .from('messages')
        .select('content, created_at, read')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
    
    const lastMessage = messages && messages[0]
    
    // Создаем элемент чата
    const chatElement = document.createElement('div')
    chatElement.className = 'chat-item'
    chatElement.onclick = () => window.location.href = `chat.html?id=${chatId}`
    
    chatElement.innerHTML = `
        <div class="chat-avatar">
            ${otherUser.username ? otherUser.username[0].toUpperCase() : '?'}
        </div>
        <div class="chat-info">
            <div class="chat-name-row">
                <span class="chat-name">${otherUser.username || 'Пользователь'}</span>
                <span class="chat-time">${lastMessage ? formatTime(lastMessage.created_at) : ''}</span>
            </div>
            <div class="chat-last-message">
                <span class="message-text">${lastMessage ? lastMessage.content : 'Нет сообщений'}</span>
                ${lastMessage && !lastMessage.read ? '<span class="unread-badge">1</span>' : ''}
            </div>
        </div>
    `
    
    container.appendChild(chatElement)
}

// Загрузка всех пользователей
async function loadUsers() {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url')
        .neq('id', currentUser.id)
    
    if (error) {
        console.error('Ошибка загрузки пользователей:', error)
        return
    }
    
    allUsers = users
    displayUsers(users)
}

// Отображение пользователей
function displayUsers(users) {
    const usersList = document.getElementById('usersList')
    if (!usersList) return
    
    usersList.innerHTML = ''
    
    users.forEach(user => {
        const userElement = document.createElement('div')
        userElement.className = 'user-item'
        userElement.onclick = () => createNewChat(user.id)
        
        userElement.innerHTML = `
            <div class="user-avatar">
                ${user.username ? user.username[0].toUpperCase() : '?'}
            </div>
            <div class="user-info">
                <div class="name">${user.username || 'Пользователь'}</div>
                <div class="email">${user.email}</div>
            </div>
        `
        
        usersList.appendChild(userElement)
    })
}

// Поиск пользователей
function setupSearch() {
    const searchInput = document.getElementById('searchInput')
    if (!searchInput) return
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase()
        
        if (query.trim() === '') {
            displayUsers(allUsers)
        } else {
            const filtered = allUsers.filter(user => 
                (user.username && user.username.toLowerCase().includes(query)) ||
                (user.email && user.email.toLowerCase().includes(query))
            )
            displayUsers(filtered)
        }
    })
}

// Создание нового чата
async function createNewChat(otherUserId) {
    // Проверяем, есть ли уже чат с этим пользователем
    const { data: existingChats, error } = await supabase
        .rpc('get_existing_chat', {
            user1_id: currentUser.id,
            user2_id: otherUserId
        })
    
    if (existingChats && existingChats.length > 0) {
        // Чат уже существует - переходим в него
        window.location.href = `chat.html?id=${existingChats[0]}`
        return
    }
    
    // Создаем новый чат
    const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single()
    
    if (chatError) {
        alert('Ошибка создания чата')
        return
    }
    
    // Добавляем участников
    const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
            { chat_id: chat.id, user_id: currentUser.id },
            { chat_id: chat.id, user_id: otherUserId }
        ])
    
    if (participantsError) {
        alert('Ошибка добавления участников')
        return
    }
    
    // Переходим в новый чат
    window.location.href = `chat.html?id=${chat.id}`
}

export function openNewChat() {
    document.getElementById('newChatModal').classList.add('show')
}

export function closeModal() {
    document.getElementById('newChatModal').classList.remove('show')
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    }
}
