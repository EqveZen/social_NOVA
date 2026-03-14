// js/profile.js
import { checkAuth } from './auth.js'
import { supabase } from './supabase.js'

let currentUser = null

export async function loadProfile() {
    try {
        currentUser = await checkAuth()
        if (!currentUser) return
        
        console.log('✅ Текущий пользователь:', currentUser.id)
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
        
        if (error) throw error
        
        console.log('📦 Профиль из БД:', profile)
        
        document.getElementById('profileName').textContent = profile.username || 'Пользователь'
        document.getElementById('profileEmail').textContent = currentUser.email
        document.getElementById('editUsername').value = profile.username || ''
        document.getElementById('editEmail').value = currentUser.email || ''
        
        if (profile.avatar_url) {
            console.log('🖼 Загружаем аватар:', profile.avatar_url)
            document.getElementById('avatarImg').src = profile.avatar_url
            document.getElementById('avatarImg').style.display = 'block'
            document.getElementById('avatarText').style.display = 'none'
        } else {
            document.getElementById('avatarText').textContent = (profile.username || '?')[0].toUpperCase()
        }
        
        await loadStats(currentUser.id)
        
    } catch (err) {
        console.error('❌ Ошибка загрузки профиля:', err)
    }
}

export function toggleEditForm() {
    document.getElementById('editForm').classList.toggle('show')
}

export async function updateProfile() {
    try {
        const newUsername = document.getElementById('editUsername').value.trim()
        const newEmail = document.getElementById('editEmail').value.trim()
        
        if (!newUsername) {
            alert('Имя пользователя не может быть пустым')
            return
        }
        
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ username: newUsername })
            .eq('id', currentUser.id)
        
        if (profileError) throw profileError
        
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

export function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput')
    if (!avatarInput) {
        console.error('❌ Не найден элемент avatarInput')
        return
    }
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        console.log('📸 Выбран файл:', file.name, file.type, file.size)
        
        // Проверяем размер файла (макс 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Файл слишком большой! Максимум 2MB')
            return
        }
        
        // Проверяем тип файла
        if (!file.type.startsWith('image/')) {
            alert('Можно загружать только изображения!')
            return
        }
        
        try {
            // Создаем уникальное имя файла
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`
            
            console.log('⬆️ Загружаем файл:', fileName)
            
            // Загружаем в Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                })
            
            if (uploadError) {
                console.error('❌ Ошибка загрузки:', uploadError)
                throw uploadError
            }
            
            console.log('✅ Файл загружен:', data)
            
            // Получаем публичный URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)
            
            console.log('🔗 Публичный URL:', publicUrl)
            
            // Обновляем профиль
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id)
            
            if (updateError) throw updateError
            
            console.log('✅ Профиль обновлён с аватаром')
            alert('Аватар успешно загружен!')
            location.reload()
            
        } catch (err) {
            console.error('❌ Ошибка:', err)
            alert('Ошибка при загрузке: ' + err.message)
        }
    })
}

async function loadStats(userId) {
    document.getElementById('postsCount').textContent = '0'
    document.getElementById('followersCount').textContent = '0'
    document.getElementById('followingCount').textContent = '0'
}

export async function initProfile() {
    console.log('🚀 Инициализация профиля...')
    await loadProfile()
    setupAvatarUpload()
}
