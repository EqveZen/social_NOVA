// js/chat.js
import { supabase } from './supabase.js'

let currentUser = null
let currentChatId = null
let otherUser = null
let messagesSubscription = null
let typingTimeout = null

export async function initChat(chatId) {
    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    currentChatId = chatId
    
    if (!currentUser || !currentChatId) return
    
    // Загружаем информацию о чате
    await loadChatInfo()
    
    // Загружаем сообщения
    await loadMessages()
    
    // Подписываемся на новые сообщения
    subscribeToMessages()
    
    // Настраиваем ввод сообщения
    setupMessageInput()
    
    // Отмечаем сообщения как прочитанные
    markMessagesAsRead()
}

// Загрузка информации о чате
async function loadChatInfo() {
    // Получаем собеседника
    const { data: participants, error } = await supabase
        .from('chat_participants')
        .select(`
            user_id,
            profiles:user_id (
                username,
                email,
                avatar_url
            )
        `)
        .eq('chat_id', currentChatId)
        .neq('user_id', currentUser.id)
    
    if (error || !participants || participants.length === 0) {
        console.error('Ошибка загрузки участников:', error)
        return
    }
    
    otherUser = participants[0].profiles
    
    // Обновляем UI
    document.getElementById('chatUserName').textContent = otherUser.username || 'Пользователь'
    document.getElementById('chatAvatar').textContent = 
        otherUser.username ? otherUser.username[0].toUpperCase() : '?'
    
    // Проверяем онлайн статус (будет позже)
    checkUserOnline()
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
        const messageDate = new Date(msg.created_at).toDateString()
        
        // Добавляем разделитель даты
        if (messageDate !== lastDate) {
            addDateDivider(container, msg.created_at)
            lastDate = messageDate
        }
        
        // Добавляем сообщение
        addMessageToContainer(msg, container)
    })
    
    // Прокручиваем вниз
    scrollToBottom()
}

// Добавление сообщения в контейнер
function addMessageToContainer(message, container) {
    const template = document.getElementById('messageTemplate')
    const clone = template.content.cloneNode(true)
    
    const wrapper = clone.querySelector('.message-wrapper')
    const text = clone.querySelector('.message-text')
    const timeText = clone.querySelector('.time-text')
    const statusSpan = clone.querySelector('.message-status')
    
    // Определяем, своё сообщение или нет
    if (message.user_id === currentUser.id) {
        wrapper.classList.add('own')
    }
    
    text.textContent = message.content
    timeText.textContent = formatTime(message.created_at)
    
    // Статус сообщения (прочитано/доставлено)
    if (message.user_id === currentUser.id) {
        statusSpan.textContent = message.read ? '✓✓' : '✓'
    }
    
    container.appendChild(clone)
}

// Добавление разделителя даты
function addDateDivider(container, date) {
    const divider = document.createElement('div')
    divider.className = 'date-divider'
    
    const dateText = formatDate(date)
    divider.innerHTML = `<span>${dateText}</span>`
    
    container.appendChild(divider)
}

// Подписка на новые сообщения
function subscribeToMessages() {
    messagesSubscription = supabase
        .channel(`chat:${currentChatId}`)
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `chat_id=eq.${currentChatId}`
            }, 
            payload => {
                // Новое сообщение
                const container = document.getElementById('messagesContainer')
                addMessageToContainer(payload.new, container)
                scrollToBottom()
                
                // Если сообщение не наше, отмечаем как прочитанное
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
    
    // Очищаем инпут
    input.value = ''
    document.getElementById('sendBtn').disabled = true
    
    // Отправляем сообщение
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
    
    // Обновляем last_message в чате
    await supabase
        .from('chats')
        .update({ 
            last_message: content,
            last_message_time: new Date()
        })
        .eq('id', currentChatId)
}

// Настройка ввода сообщения
function setupMessageInput() {
    const input = document.getElementById('messageInput')
    const sendBtn = document.getElementById('sendBtn')
    
    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim()
        
        // Показываем индикатор печатания (будет позже)
        showTypingIndicator()
    })
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    })
}

// Показать индикатор печатания
function showTypingIndicator() {
    // Очищаем предыдущий таймаут
    if (typingTimeout) clearTimeout(typingTimeout)
    
    // Показываем индикатор (будет позже с realtime)
    
    // Скрываем через 2 секунды
    typingTimeout = setTimeout(() => {
        // Скрываем индикатор
    }, 2000)
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

// Проверка онлайн статуса (будет позже)
function checkUserOnline() {
    document.getElementById('chatUserStatus').textContent = 'был(а) недавно'
}

// Опции чата
export function showChatOptions() {
    // Меню с опциями (очистить чат, пожаловаться и т.д.)
    console.log('Опции чата')
}

// Прикрепление файла
export function attachFile() {
    // Загрузка фото/файлов (будет позже)
    alert('Загрузка файлов будет позже')
}

// Прокрутка вниз
function scrollToBottom() {
    const container = document.getElementById('messagesContainer')
    container.scrollTop = container.scrollHeight
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Форматирование даты
function formatDate(timestamp) {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня'
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера'
    } else {
        return date.toLocaleDateString([], { day: 'numeric', month: 'long' })
    }
}

// Очистка при выходе
export function cleanup() {
    if (messagesSubscription) {
        messagesSubscription.unsubscribe()
    }
}
