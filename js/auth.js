// js/auth.js
import { supabase } from './supabase.js'

// РЕГИСТРАЦИЯ
async function register(username, email, password) {
    console.log('🚀 Начинаем регистрацию:', { username, email })
    
    try {
        // Проверяем подключение
        console.log('📡 Supabase URL:', supabase.supabaseUrl)
        
        // 1. Проверяем логин
        console.log('🔍 Проверяем логин...')
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle()
        
        console.log('Результат проверки:', { existingUser, checkError })
        
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
        console.log('📝 Создаем пользователя в Auth...')
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        })

        console.log('Ответ от Auth:', { authData, authError })

        if (authError) {
            if (authError.message.includes('already registered')) {
                alert('❌ Эта почта уже зарегистрирована!')
            } else {
                throw authError
            }
            return
        }

        if (authData.user) {
            console.log('✅ Пользователь создан в Auth!')
            
            // Проверяем, создался ли профиль
            setTimeout(async () => {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single()
                
                if (profile) {
                    console.log('✅ Профиль создан в таблице:', profile)
                } else {
                    console.log('⚠️ Профиль еще не создался, проверь триггер')
                }
            }, 2000)
            
            alert('✅ Регистрация успешна! Проверьте почту для подтверждения.')
            
            setTimeout(() => {
                window.location.href = '/log.html'
            }, 2000)
        }

    } catch (err) {
        console.error('❌ ОШИБКА:', err)
        alert('Ошибка при регистрации: ' + err.message)
    }
}

// ВХОД
async function login(email, password) {
    console.log('🚀 Попытка входа:', { email })
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        console.log('Ответ от Auth:', { data, error })

        if (error) {
            if (error.message.includes('Invalid login')) {
                alert('❌ Неверная почта или пароль!')
            } else {
                throw error
            }
            return
        }

        if (data.user) {
            console.log('✅ Вход выполнен!')
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', data.user.id)
                .single()
            
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                username: profile?.username || data.user.user_metadata?.username
            }))
            
            window.location.href = '/feed.html'
        }

    } catch (err) {
        console.error('❌ ОШИБКА:', err)
        alert('Ошибка при входе: ' + err.message)
    }
}

// ВЫХОД
async function logout() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('user')
        window.location.href = '/log.html'
    } catch (err) {
        console.error('Ошибка выхода:', err)
    }
}

// ПРОВЕРКА АВТОРИЗАЦИИ
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        const currentPage = window.location.pathname
        if (!currentPage.includes('log.html') && !currentPage.includes('reg.html')) {
            window.location.href = '/log.html'
        }
    }
    return user
}

// Делаем функции доступными глобально
window.register = register
window.login = login
window.logout = logout
window.checkAuth = checkAuth