// js/chat.js
import { supabase } from './supabase.js'

let currentUser = null
let currentChatId = null
let otherUser = null
let messagesSubscription = null

export async function initChat(chatId) {
    console.log('🚀 Загрузка чата:', chatId)
    
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    currentChatId = chatId
    
    if (!currentUser || !currentChatId) return
    
    // Загружаем информацию о собеседнике
    await loadChatInfo()
    
    // Загружаем сообщения
    await loadMessages()
    
    // ПОДПИСЫВАЕМСЯ НА НОВЫЕ СООБЩЕНИЯ (ВАЖНО!)
    subscribeToMessages()
    
    // Настраиваем ввод
    setupMessageInput()
    
    // Отмечаем сообщения как прочитанные
    markMessagesAsRead()
}

// Загрузка информации о чате
async function loadChatInfo() {
    try {
        // Получаем всех участников чата
        const { data: participants, error } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', currentChatId)
        
        if (error) throw error
        
        if (!participants || participants.length === 0) return
        
        // Находим собеседника
        const otherUserId = participants.find(p => p.user_id !== currentUser.id)?.user_id
        if (!otherUserId) return
        
        // Получаем данные профиля
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, email, avatar_url, bio')
            .eq('id', otherUserId)
            .single()
        
        if (profileError) throw profileError
        
        otherUser = profile
        
        document.getElementById('chatUserName').textContent = otherUser.username || 'Пользователь'
        document.getElementById('chatAvatar').textContent = 
            otherUser.username ? otherUser.username[0].toUpperCase() : '?'
            
    } catch (error) {
        console.error('❌ Ошибка загрузки информации:', error)
    }
}

// Загрузка сообщений
async function loadMessages() {
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', currentChatId)
            .order('created_at', { ascending: true })
        
        if (error) throw error
        
        console.log('📦 Загружено сообщений:', messages.length)
        
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
        
    } catch (error) {
        console.error('❌ Ошибка загрузки сообщений:', error)
    }
}

// Добавление сообщения в контейнер
function addMessageToContainer(message, container) {
    const div = document.createElement('div')
    div.className = `message-wrapper ${message.user_id === currentUser.id ? 'own' : ''}`
    div.setAttribute('data-message-id', message.id)
    
    const time = new Date(message.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    })
    
    const status = message.user_id === currentUser.id 
        ? (message.read ? ' ✓✓' : ' ✓') 
        : ''
    
    div.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${escapeHtml(message.content)}</div>
            <div class="message-time">
                ${time}${status}
            </div>
        </div>
    `
    
    container.appendChild(div)
}

// Разделитель даты
function addDateDivider(container, date) {
    const div = document.createElement('div')
    div.className = 'date-divider'
    
    const dateText = new Date(date).toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
    })
    
    div.innerHTML = `<span>${dateText}</span>`
    container.appendChild(div)
}

// ПОДПИСКА НА НОВЫЕ СООБЩЕНИЯ (ИСПРАВЛЕНО)
function subscribeToMessages() {
    console.log('🔔 Подписываемся на новые сообщения...')
    
    // Отписываемся от старой подписки если есть
    if (messagesSubscription) {
        messagesSubscription.unsubscribe()
    }
    
    // Создаём новую подписку
    messagesSubscription = supabase
        .channel(`chat-${currentChatId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${currentChatId}`
            },
            (payload) => {
                console.log('📨 Получено новое сообщение:', payload.new)
                
                // Добавляем сообщение в контейнер
                const container = document.getElementById('messagesContainer')
                addMessageToContainer(payload.new, container)
                scrollToBottom()
                
                // Если сообщение не наше, отмечаем как прочитанное
                if (payload.new.user_id !== currentUser.id) {
                    markMessageAsRead(payload.new.id)
                }
            }
        )
        .subscribe((status) => {
            console.log('📡 Статус подписки:', status)
        })
}

// Отправка сообщения
export async function sendMessage() {
    const input = document.getElementById('messageInput')
    const content = input.value.trim()
    
    if (!content) return
    
    // Очищаем input и отключаем кнопку
    input.value = ''
    document.getElementById('sendBtn').disabled = true
    
    console.log('📤 Отправляем сообщение:', content)
    
    // Вставляем сообщение в БД
    const { data, error } = await supabase
        .from('messages')
        .insert({
            chat_id: currentChatId,
            user_id: currentUser.id,
            content: content,
            read: false,
            created_at: new Date().toISOString()
        })
        .select()
    
    if (error) {
        console.error('❌ Ошибка отправки:', error)
        alert('Не удалось отправить сообщение')
        return
    }
    
    console.log('✅ Сообщение отправлено:', data)
    
    // Обновляем последнее сообщение в чате
    await supabase
        .from('chats')
        .update({ 
            last_message: content,
            last_message_time: new Date().toISOString()
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
    
    // Делаем функцию доступной глобально
    window.sendMessage = sendMessage
}

// Отметить сообщение как прочитанное
async function markMessageAsRead(messageId) {
    await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
}

// Отметить все сообщения как прочитанные
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

// Защита от XSS
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// Очистка при выходе
export function cleanup() {
    if (messagesSubscription) {
        messagesSubscription.unsubscribe()
    }
}
