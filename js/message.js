// js/messages.js
import { supabase } from './supabase.js'

let currentUser = null
let allChats = []

export async function initMessages() {
    console.log('🚀 Загрузка чатов...')
    
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    if (!currentUser) {
        console.log('❌ Пользователь не авторизован')
        return
    }
    
    await loadChats()
    setupRealtime()
}

// Загрузка чатов
async function loadChats() {
    try {
        // Получаем все чаты пользователя
        const { data: participations, error: partError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', currentUser.id)
        
        if (partError) throw partError
        
        if (!participations || participations.length === 0) {
            showEmptyChats()
            return
        }
        
        const chatIds = participations.map(p => p.chat_id)
        
        // Получаем информацию о чатах
        const { data: chats, error: chatsError } = await supabase
            .from('chats')
            .select('*')
            .in('id', chatIds)
            .order('last_message_time', { ascending: false })
        
        if (chatsError) throw chatsError
        
        const chatsList = document.getElementById('chatsList')
        if (!chatsList) return
        
        chatsList.innerHTML = ''
        allChats = []
        
        for (const chat of chats) {
            await loadChatDetails(chat, chatsList)
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки чатов:', error)
    }
}

// Загрузка деталей чата
async function loadChatDetails(chat, container) {
    try {
        // Получаем user_id собеседника
        const { data: participants, error: partError } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id)
            .neq('user_id', currentUser.id)
        
        if (partError) throw partError
        
        if (!participants || participants.length === 0) return
        
        const otherUserId = participants[0].user_id
        
        // Получаем данные профиля
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', otherUserId)
            .single()
        
        if (profileError) throw profileError
        
        // Получаем последнее сообщение
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
        
        if (msgError) throw msgError
        
        const lastMessage = messages && messages[0]
        
        // Считаем непрочитанные
        const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .neq('user_id', currentUser.id)
            .eq('read', false)
        
        if (countError) throw countError
        
        const chatElement = createChatElement(chat.id, profile, lastMessage, count || 0)
        container.appendChild(chatElement)
        
        allChats.push({
            element: chatElement,
            name: (profile.username || '').toLowerCase(),
            lastMessage: lastMessage?.content || ''
        })
        
    } catch (error) {
        console.error('❌ Ошибка загрузки деталей чата:', error)
    }
}

// Создание элемента чата
function createChatElement(chatId, user, lastMessage, unreadCount) {
    const div = document.createElement('div')
    div.className = 'chat-item'
    div.setAttribute('data-chat-id', chatId)
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

// Показать пустой список
function showEmptyChats() {
    const chatsList = document.getElementById('chatsList')
    if (!chatsList) return
    
    chatsList.innerHTML = `
        <div class="empty-chats">
            <h3>У вас пока нет чатов</h3>
            <p>Найдите людей и начните общение</p>
            <button class="start-chat-btn" onclick="window.location.href='search.html'">Найти собеседника</button>
        </div>
    `
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
