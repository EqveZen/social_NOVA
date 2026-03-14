// js/profile.js
import { checkAuth } from './auth.js'
import { supabase } from './supabase.js'

let currentUser = null

// Загрузка профиля
export async function loadProfile() {
    try {
        currentUser = await checkAuth()
        if (!currentUser) return
        
        // Загружаем профиль из БД
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
        
        if (error) throw error
        
        // Обновляем интерфейс
        document.getElementById('profileName').textContent = profile.username || 'Пользователь'
        document.getElementById('profileEmail').textContent = currentUser.email
        document.getElementById('editUsername').value = profile.username || ''
        document.getElementById('editEmail').value = currentUser.email || ''
        
        // Загружаем аватар если есть
        if (profile.avatar_url) {
            document.getElementById('avatarImg').src = profile.avatar_url
            document.getElementById('avatarImg').style.display = 'block'
            document.getElementById('avatarText').style.display = 'none'
        } else {
            document.getElementById('avatarText').textContent = (profile.username || '?')[0].toUpperCase()
        }
        
        // Загружаем статистику
        await loadStats(currentUser.id)
        
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err)
    }
}

// Загрузка статистики
async function loadStats(userId) {
    // TODO: добавить подсчет постов, подписчиков
    document.getElementById('postsCount').textContent = '0'
    document.getElementById('followersCount').textContent = '0'
    document.getElementById('followingCount').textContent = '0'
}

// Показать/скрыть форму редактирования
export function toggleEditForm() {
    document.getElementById('editForm').classList.toggle('show')
}

// Обновление профиля
export async function updateProfile() {
    try {
        const newUsername = document.getElementById('editUsername').value.trim()
        const newEmail = document.getElementById('editEmail').value.trim()
        
        if (!newUsername) {
            alert('Имя пользователя не может быть пустым')
            return
        }
        
        // Обновляем в таблице profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ username: newUsername })
            .eq('id', currentUser.id)
        
        if (profileError) throw profileError
        
        // Обновляем email если изменился
        if (newEmail !== currentUser.email) {
            const { error: emailError } = await supabase.auth.updateUser({
                email: newEmail
            })
            if (emailError) throw emailError
            alert('Подтвердите новый email по ссылке в письме')
        }
        
        alert('Профиль обновлён!')
        location.reload()
        
    } catch (err) {
        console.error('Ошибка обновления:', err)
        alert('Ошибка: ' + err.message)
    }
}

// Загрузка аватара
export function setupAvatarUpload() {
    document.getElementById('avatarInput').addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
            // Загружаем файл в Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file)
            
            if (uploadError) throw uploadError
            
            // Получаем публичный URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)
            
            // Обновляем профиль
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id)
            
            if (updateError) throw updateError
            
            location.reload()
            
        } catch (err) {
            console.error('Ошибка загрузки аватара:', err)
            alert('Ошибка при загрузке аватара')
        }
    })
}

// Инициализация страницы профиля
export async function initProfile() {
    await loadProfile()
    setupAvatarUpload()
}
