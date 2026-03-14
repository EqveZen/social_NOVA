// js/auth.js
import { supabase } from './supabase.js'

// РЕГИСТРАЦИЯ
export async function register(username, email, password) {
    console.log('🚀 Регистрация:', { username, email })
    
    try {
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle()
        
        if (existingUser) {
            alert('❌ Логин занят!')
            return
        }

        const { data: existingEmail } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle()
        
        if (existingEmail) {
            alert('❌ Email занят!')
            return
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { username: username }
            }
        })

        if (authError) throw authError

        if (authData?.user) {
            alert('✅ Регистрация успешна! Сейчас войдём...')
            await login(email, password)
        }

    } catch (err) {
        console.error('❌ Ошибка:', err)
        alert('Ошибка: ' + err.message)
    }
}

// ВХОД
export async function login(email, password) {
    console.log('🚀 Вход:', { email })
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if (error) throw error

        if (data.user) {
            console.log('✅ Вход выполнен')
            
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                email: data.user.email
            }))
            
            window.location.href = '/social_NOVA/messages.html'
        }

    } catch (err) {
        console.error('❌ Ошибка входа:', err)
        alert('❌ Неверный email или пароль')
    }
}

// ВЫХОД
export async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('user')
    window.location.href = '/social_NOVA/log.html'
}

// ПРОВЕРКА АВТОРИЗАЦИИ
export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        const path = window.location.pathname
        if (!path.includes('log.html') && !path.includes('reg.html')) {
            window.location.href = '/social_NOVA/log.html'
        }
    }
    return user
}

window.register = register
window.login = login
window.logout = logout
window.checkAuth = checkAuth
