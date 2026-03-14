// js/messages.js
import { supabase } from './supabase.js'

let currentUser = null
let allChats = []

export async function initMessages() {
    console.log('🚀 Загрузка чатов...')
    
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    if (!currentUser) return
    
    await loadChats()
    setupRealtime()
}

// Загрузка чатов (ТОЛЬКО С СООБЩЕНИЯМИ)
async function loadChats() {
    try {
        // Получаем все чаты, где есть сообщения с текущим пользователем
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('chat_id')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        
        if (msgError) throw msgError
        
        // Также получаем чаты, где писали текущему пользователю
        const { data: receivedMessages, error: receivedError } = await supabase
            .from('messages')
            .select('chat_id')
            .neq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        
        if (receivedError) throw receivedError
        
        // Объединяем и удаляем дубликаты
        const allMessageChats = [
            ...(messages || []).map(m => m.chat_id),
            ...(receivedMessages || []).map(m => m.chat_id)
        ]
        
        const uniqueChatIds = [...new Set(allMessageChats)]
        
        console.log('📦 Найдено чатов с сообщениями:', uniqueChatIds.length)
        
        if (uniqueChatIds.length === 0) {
            showEmptyChats()
            return
        }
        
        // Получаем информацию о чатах
        const { data: chats, error: chatsError } = await supabase
            .from('chats')
            .select('*')
            .in('id', uniqueChatIds)
            .order('last_message_time', { ascending: false, nullsLast: true })
        
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
        // Получаем собеседника
        const { data: participants, error: partError } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id)
        
        if (partError) throw partError
        
        const otherUserId = participants.find(p => p.user_id !== currentUser.id)?.user_id
        if (!otherUserId) return
        
        // Получаем профиль собеседника
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', otherUserId)
            .single()
        
        if (profileError) throw profileError
        
        // Получаем последнее сообщение в чате
        const { data: lastMessages, error: lastError } = await supabase
            .from('messages')
            .select('content, created_at, user_id, read')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
        
        if (lastError) throw lastError
        
        const lastMessage = lastMessages && lastMessages[0]
        
        // Если нет сообщений - пропускаем чат
        if (!lastMessage) return
        
        // Считаем непрочитанные сообщения
        const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('user_id', otherUserId)  // сообщения от собеседника
            .eq('read', false)            // непрочитанные
        
        if (countError) throw countError
        
        const chatElement = createChatElement(chat.id, profile, lastMessage, count || 0)
        container.appendChild(chatElement)
        
    } catch (error) {
        console.error('❌ Ошибка загрузки деталей:', error)
    }
}

// Создание элемента чата
function createChatElement(chatId, user, lastMessage, unreadCount) {
    const div = document.createElement('div')
    div.className = 'chat-item'
    div.onclick = () => window.location.href = `chat.html?id=${chatId}`
    
    const time = lastMessage ? formatTime(lastMessage.created_at) : ''
    
    // Показываем, кто написал последнее сообщение
    let messagePrefix = ''
    if (lastMessage.user_id === currentUser.id) {
        messagePrefix = 'Вы: '
    }
    
    const messageText = lastMessage ? `${messagePrefix}${lastMessage.content}` : 'Нет сообщений'
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
            <h3>У вас пока нет сообщений</h3>
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
            (payload) => {
                console.log('🔄 Новое сообщение, обновляем чаты')
                
                // Проверяем, относится ли сообщение к текущему пользователю
                if (payload.new.user_id === currentUser.id || 
                    payload.new.chat_id) {
                    loadChats()
                }
            }
        )
        .subscribe()
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Сегодня
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    // Вчера
    else if (date.toDateString() === yesterday.toDateString()) {
        return 'вчера'
    }
    // Эта неделя
    else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'short' })
    }
    // Давно
    else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    }
}
