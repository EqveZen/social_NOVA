// js/auth.js
import { supabase } from './supabase.js'

// РЕГИСТРАЦИЯ
export async function register(username, email, password) {
    console.log('🚀 Начинаем регистрацию:', { username, email })
    
    try {
        // Проверяем логин
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle()
        
        if (existingUser) {
            alert('❌ Логин занят!')
            return
        }

        // Проверяем email
        const { data: existingEmail } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle()
        
        if (existingEmail) {
            alert('❌ Email занят!')
            return
        }

        // Создаём пользователя
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { username: username }
            }
        })

        if (authError) throw authError

        if (authData?.user) {
            console.log('✅ Пользователь создан! ID:', authData.user.id)
            
            alert('✅ Регистрация успешна! Сейчас войдём...')
            
            // Ждём 1 секунду и логинимся
            setTimeout(async () => {
                await login(email, password)
            }, 1000)
        }

    } catch (err) {
        console.error('❌ Ошибка:', err)
        alert('Ошибка: ' + err.message)
    }
}

// ВХОД
export async function login(email, password) {
    console.log('🚀 Попытка входа:', { email })
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if (error) throw error

        if (data.user) {
            console.log('✅ Вход выполнен!')
            
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email
            }))
            
            console.log('➡️ Переход в чаты...')
            window.location.href = '/nova-social/messages.html'
        }

    } catch (err) {
        console.error('❌ Ошибка входа:', err)
        alert('Ошибка входа: ' + err.message)
    }
}

// ВЫХОД
export async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('user')
    window.location.href = '/nova-social/log.html'
}

// ПРОВЕРКА АВТОРИЗАЦИИ
export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        const path = window.location.pathname
        if (!path.includes('log.html') && !path.includes('reg.html')) {
            window.location.href = '/nova-social/log.html'
        }
    }
    return user
}

// Для глобального доступа
window.register = register
window.login = login
window.logout = logout
window.checkAuth = checkAuth
