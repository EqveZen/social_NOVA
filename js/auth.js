// js/auth.js
import { supabase } from './supabase.js'

// 👈 ДОБАВЛЯЕМ export
export async function register(username, email, password) {
    console.log('🚀 ===== НАЧАЛО РЕГИСТРАЦИИ =====')
    console.log('📝 Данные:', { username, email, password: '***' })
    
    try {
        // 1. Проверяем подключение
        console.log('📡 Проверка подключения к Supabase...')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        console.log('Сессия:', sessionData, 'Ошибка:', sessionError)

        // 2. Проверяем, свободен ли логин
        console.log('🔍 Проверяем логин:', username)
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle()
        
        console.log('Результат проверки логина:', { existingUser, checkError })
        
        if (existingUser) {
            alert('❌ Этот логин уже занят!')
            return
        }

        // 3. Проверяем почту
        console.log('🔍 Проверяем почту:', email)
        const { data: existingEmail, error: checkEmailError } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle()
        
        console.log('Результат проверки почты:', { existingEmail, checkEmailError })
        
        if (existingEmail) {
            alert('❌ Эта почта уже зарегистрирована!')
            return
        }

        // 4. Создаем пользователя
        console.log('📝 Отправляем запрос на создание пользователя...')
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        })

        console.log('📦 Ответ от Supabase Auth:', authData)
        console.log('❌ Ошибка от Supabase Auth:', authError)

        if (authError) {
            console.error('Ошибка создания пользователя:', authError)
            alert('Ошибка: ' + authError.message)
            return
        }

        if (authData?.user) {
            console.log('✅ Пользователь создан в Auth! ID:', authData.user.id)
            console.log('📧 Проверка почты требуется:', authData.user?.email_confirmed_at ? 'Нет' : 'Да')
            
            // Подождем немного и проверим, создался ли профиль
            console.log('⏳ Ждем 3 секунды и проверяем профиль...')
            
            setTimeout(async () => {
                console.log('🔍 Проверяем создание профиля...')
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .maybeSingle()
                
                if (profile) {
                    console.log('✅ Профиль успешно создан!', profile)
                } else {
                    console.log('❌ Профиль НЕ создался. Ошибка:', profileError)
                    console.log('Проверь, работает ли триггер в Supabase!')
                }
            }, 3000)
            
            alert('✅ Регистрация успешна! Проверьте почту для подтверждения.')
            
            // Перенаправляем на страницу входа
            setTimeout(() => {
                window.location.href = '/log.html'
            }, 2000)
        } else {
            console.log('❌ Что-то пошло не так: нет данных пользователя')
        }

    } catch (err) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', err)
        alert('Ошибка при регистрации: ' + err.message)
    }
    console.log('🏁 ===== КОНЕЦ РЕГИСТРАЦИИ =====')
}

// 👈 ДОБАВЛЯЕМ export
export async function login(email, password) {
    console.log('🚀 Попытка входа:', { email })
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        console.log('Ответ от Auth:', { data, error })

        if (error) {
            console.error('Ошибка входа:', error)
            alert('❌ ' + (error.message === 'Invalid login credentials' ? 'Неверная почта или пароль!' : error.message))
            return
        }

        if (data.user) {
            console.log('✅ Вход выполнен!')
            console.log('Пользователь:', data.user)
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', data.user.id)
                .single()
            
            console.log('Профиль пользователя:', profile)
            
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

// 👈 ДОБАВЛЯЕМ export
export async function logout() {
    try {
        await supabase.auth.signOut()
        localStorage.removeItem('user')
        window.location.href = '/log.html'
    } catch (err) {
        console.error('Ошибка выхода:', err)
    }
}

// 👈 ДОБАВЛЯЕМ export
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

// 👈 Оставляем для глобального доступа (onclick)
window.register = register
window.login = login
window.logout = logout
window.checkAuth = checkAuth
