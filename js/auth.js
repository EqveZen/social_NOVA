// js/auth.js
import { supabase } from './supabase.js'

export async function register(username, email, password) {
    console.log('🚀 Начинаем регистрацию:', { username, email })
    
    try {
        // 1. Проверяем, свободен ли логин
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle()
        
        if (existingUser) {
            alert('❌ Этот логин уже занят!')
            return
        }

        // 2. Проверяем почту
        const { data: existingEmail, error: checkEmailError } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle()
        
        if (existingEmail) {
            alert('❌ Эта почта уже зарегистрирована!')
            return
        }

        // 3. Создаем пользователя
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        })

        if (authError) throw authError

        if (authData?.user) {
            console.log('✅ Пользователь создан!')
            
            // Отключаем подтверждение почты для теста
            // или просто показываем сообщение
            
            alert('✅ Регистрация успешна! Сейчас войдём...')
            
            // ✅ СРАЗУ ЛОГИНИМСЯ И ПЕРЕХОДИМ В ЧАТЫ
            await login(email, password)
        }

    } catch (err) {
        console.error('❌ ОШИБКА:', err)
        alert('Ошибка при регистрации: ' + err.message)
    }
}

export async function login(email, password) {
    console.log('🚀 Попытка входа:', { email })
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        console.log('📦 Ответ от Auth:', { data, error })

        if (error) {
            console.error('❌ Ошибка входа:', error)
            alert('❌ ' + (error.message === 'Invalid login credentials' ? 'Неверная почта или пароль!' : error.message))
            return
        }

        if (data.user) {
            console.log('✅ Вход выполнен!')
            
            // Получаем профиль
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', data.user.id)
                .single()
            
            console.log('📋 Профиль:', profile)
            
            // Сохраняем в localStorage
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                username: profile?.username || data.user.user_metadata?.username
            }))
            
            console.log('➡️ Перенаправление на список чатов...')
            
            // ✅ МЕНЯЕМ С feed.html НА messages.html
            window.location.href = 'messages.html'
        }

    } catch (err) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err)
        alert('Ошибка при входе: ' + err.message)
    }
}

export async function logout() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('user')
        window.location.href = '/log.html'
    } catch (err) {
        console.error('Ошибка выхода:', err)
    }
}

export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        const currentPage = window.location.pathname
        if (!currentPage.includes('log.html') && !currentPage.includes('reg.html')) {
            window.location.href = '/log.html'
        }
    }
    return user
}

// Для onclick в HTML
window.register = register
window.login = login
window.logout = logout
window.checkAuth = checkAuth
