// js/chat.js
import { supabase } from './supabase.js'

let currentUser = null
let currentChatId = null
let otherUser = null
let messagesSubscription = null

export async function initChat(chatId) {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    currentChatId = chatId
    
    if (!currentUser || !currentChatId) return
    
    await loadChatInfo()
    await loadMessages()
    subscribeToMessages()
    setupMessageInput()
    markMessagesAsRead()
}

// Загрузка информации о чате
async function loadChatInfo() {
    const { data: participants } = await supabase
        .from('chat_participants')
        .select(`
            user_id,
            profiles:user_id (
                username,
                email,
                avatar_url,
                bio
            )
        `)
        .eq('chat_id', currentChatId)
        .neq('user_id', currentUser.id)
    
    if (!participants || participants.length === 0) return
    
    otherUser = participants[0].profiles
    
    document.getElementById('chatUserName').textContent = otherUser.username || 'Пользователь'
    document.getElementById('chatAvatar').textContent = 
        otherUser.username ? otherUser.username[0].toUpperCase() : '?'
}

// Загрузка сообщений
async function loadMessages() {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true })
    
    if (error) {
        console.error('Ошибка загрузки сообщений:', error)
        return
    }
    
    const container = document.getElementById('messagesContainer')
    container.innerHTML = ''
    
    let lastDate = null
    
    messages.forEach(msg => {
        const msgDate = new Date(msg.created_at).toDateString()
        
        if (msgDate !== lastDate) {
            addDateDivider(container, msg.created_at)
            lastDate = msgDate
        }
        
        addMessageToContainer(msg, container)
    })
    
    scrollToBottom()
}

// Добавление сообщения
function addMessageToContainer(message, container) {
    const div = document.createElement('div')
    div.className = `message-wrapper ${message.user_id === currentUser.id ? 'own' : ''}`
    
    const time = new Date(message.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    })
    
    div.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${message.content}</div>
            <div class="message-time">
                ${time}
                ${message.user_id === currentUser.id ? (message.read ? ' ✓✓' : ' ✓') : ''}
            </div>
        </div>
    `
    
    container.appendChild(div)
}

// Разделитель даты
function addDateDivider(container, date) {
    const div = document.createElement('div')
    div.className = 'date-divider'
    
    const dateText = new Date(date).toLocaleDateString([], { 
        day: 'numeric', 
        month: 'long' 
    })
    
    div.innerHTML = `<span>${dateText}</span>`
    container.appendChild(div)
}

// Подписка на новые сообщения
function subscribeToMessages() {
    messagesSubscription = supabase
        .channel(`chat-${currentChatId}`)
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `chat_id=eq.${currentChatId}`
            }, 
            payload => {
                const container = document.getElementById('messagesContainer')
                addMessageToContainer(payload.new, container)
                scrollToBottom()
                
                if (payload.new.user_id !== currentUser.id) {
                    markMessageAsRead(payload.new.id)
                }
            }
        )
        .subscribe()
}

// Отправка сообщения
export async function sendMessage() {
    const input = document.getElementById('messageInput')
    const content = input.value.trim()
    
    if (!content) return
    
    input.value = ''
    document.getElementById('sendBtn').disabled = true
    
    const { error } = await supabase
        .from('messages')
        .insert({
            chat_id: currentChatId,
            user_id: currentUser.id,
            content: content,
            read: false
        })
    
    if (error) {
        console.error('Ошибка отправки:', error)
        alert('Не удалось отправить сообщение')
    }
    
    // Обновляем последнее сообщение в чате
    await supabase
        .from('chats')
        .update({ 
            last_message: content,
            last_message_time: new Date(),
            last_message_user: currentUser.id
        })
        .eq('id', currentChatId)
}

// Настройка ввода
function setupMessageInput() {
    const input = document.getElementById('messageInput')
    const sendBtn = document.getElementById('sendBtn')
    
    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim()
    })
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    })
    
    window.sendMessage = sendMessage
}

// Отметить как прочитанное
async function markMessageAsRead(messageId) {
    await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
}

async function markMessagesAsRead() {
    await supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', currentChatId)
        .neq('user_id', currentUser.id)
        .eq('read', false)
}

// Прокрутка вниз
function scrollToBottom() {
    const container = document.getElementById('messagesContainer')
    container.scrollTop = container.scrollHeight
}
