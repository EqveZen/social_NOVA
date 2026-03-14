// js/messages.js
import { supabase } from './supabase.js'

let currentUser = null
let allChats = []

export async function initMessages() {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    if (!currentUser) return
    
    await loadChats()
    setupRealtime()
}

// Загрузка чатов
async function loadChats() {
    const { data: chats, error } = await supabase
        .from('chat_participants')
        .select(`
            chat_id,
            chats (
                id,
                last_message,
                last_message_time,
                last_message_user
            )
        `)
        .eq('user_id', currentUser.id)
        .order('last_message_time', { foreignTable: 'chats', ascending: false })
    
    if (error) {
        console.error('Ошибка загрузки чатов:', error)
        return
    }
    
    if (!chats || chats.length === 0) return
    
    const chatsList = document.getElementById('chatsList')
    if (!chatsList) return
    
    chatsList.innerHTML = ''
    allChats = []
    
    for (const item of chats) {
        await loadChatDetails(item.chat_id, chatsList)
    }
}

// Загрузка деталей чата
async function loadChatDetails(chatId, container) {
    // Получаем собеседника
    const { data: participants } = await supabase
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
    
    if (!participants || participants.length === 0) return
    
    const otherUser = participants[0].profiles
    
    // Получаем последнее сообщение
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
    
    const lastMessage = messages && messages[0]
    
    // Считаем непрочитанные
    const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('user_id', currentUser.id)
        .eq('read', false)
    
    const chatElement = createChatElement(chatId, otherUser, lastMessage, count)
    container.appendChild(chatElement)
    
    allChats.push({
        element: chatElement,
        name: (otherUser.username || '').toLowerCase(),
        lastMessage: lastMessage?.content || ''
    })
}

// Создание элемента чата
function createChatElement(chatId, user, lastMessage, unreadCount) {
    const div = document.createElement('div')
    div.className = 'chat-item'
    div.setAttribute('data-chat-id', chatId)
    div.setAttribute('data-name', (user.username || '').toLowerCase())
    div.onclick = () => window.location.href = `chat.html?id=${chatId}`
    
    const time = lastMessage ? formatTime(lastMessage.created_at) : ''
    const messageText = lastMessage ? lastMessage.content : 'Нет сообщений'
    const unreadBadge = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''
    
    div.innerHTML = `
        <div class="chat-avatar">${user.username ? user.username[0].toUpperCase() : '?'}</div>
        <div class="chat-info">
            <div class="chat-name-row">
                <span class="chat-name">${user.username || 'Пользователь'}</span>
                <span class="chat-time">${time}</span>
            </div>
            <div class="chat-last-message">
                <span class="message-text">${messageText}</span>
                ${unreadBadge}
            </div>
        </div>
    `
    
    return div
}

// Фильтр чатов
export function filterChats() {
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || ''
    
    allChats.forEach(chat => {
        if (chat.name.includes(searchText) || chat.lastMessage.toLowerCase().includes(searchText)) {
            chat.element.style.display = 'flex'
        } else {
            chat.element.style.display = 'none'
        }
    })
}

// Realtime обновления
function setupRealtime() {
    supabase
        .channel('messages-channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            () => loadChats()
        )
        .subscribe()
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

export { loadChats }
