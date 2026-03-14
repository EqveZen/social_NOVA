// js/profile.js
import { checkAuth } from './auth.js'
import { supabase } from './supabase.js'

let currentUser = null

export async function initProfile() {
    console.log('🚀 Загрузка профиля...')
    
    try {
        currentUser = await checkAuth()
        if (!currentUser) {
            console.log('❌ Пользователь не авторизован')
            return
        }
        
        console.log('✅ Пользователь:', currentUser.id)
        
        // Загружаем профиль из БД
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
        
        if (error) {
            console.error('❌ Ошибка загрузки профиля:', error)
            return
        }
        
        console.log('📦 Данные профиля:', profile)
        
        // Отображаем имя
        document.getElementById('profileName').textContent = profile.username || 'Пользователь'
        document.getElementById('displayName').textContent = profile.username || 'Не указано'
        document.getElementById('displayEmail').textContent = currentUser.email
        
        // ОТОБРАЖАЕМ БИО
        const displayBio = document.getElementById('displayBio')
        if (displayBio) {
            displayBio.textContent = profile.bio || '🚀 Социальная сеть NOVA'
        }
        
        // Заполняем форму редактирования
        document.getElementById('editUsername').value = profile.username || ''
        document.getElementById('editEmail').value = currentUser.email || ''
        
        // ЗАПОЛНЯЕМ БИО В ФОРМЕ
        const editBio = document.getElementById('editBio')
        if (editBio) {
            editBio.value = profile.bio || '🚀 Социальная сеть NOVA'
        }
        
        // Аватар
        if (profile.avatar_url) {
            document.getElementById('avatarImg').src = profile.avatar_url
            document.getElementById('avatarImg').style.display = 'block'
            document.getElementById('avatarText').style.display = 'none'
        } else {
            document.getElementById('avatarText').textContent = 
                (profile.username || '?')[0].toUpperCase()
        }
        
        // Настраиваем загрузку аватара
        setupAvatarUpload()
        
    } catch (err) {
        console.error('❌ Критическая ошибка:', err)
    }
}

// Открыть/закрыть форму редактирования
export function toggleEditForm() {
    const form = document.getElementById('editForm')
    form.classList.toggle('show')
}

// СОХРАНЕНИЕ ПРОФИЛЯ (ВКЛЮЧАЯ БИО)
export async function updateProfile() {
    try {
        console.log('💾 Сохраняем профиль...')
        
        const newUsername = document.getElementById('editUsername').value.trim()
        const newEmail = document.getElementById('editEmail').value.trim()
        const newBio = document.getElementById('editBio')?.value.trim() || '🚀 Социальная сеть NOVA'
        
        if (!newUsername) {
            alert('Имя пользователя не может быть пустым')
            return
        }
        
        // СОХРАНЯЕМ ВСЕ ДАННЫЕ В БД
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                username: newUsername,
                bio: newBio  // 👈 СОХРАНЯЕМ БИО
            })
            .eq('id', currentUser.id)
        
        if (profileError) {
            console.error('❌ Ошибка сохранения:', profileError)
            throw profileError
        }
        
        console.log('✅ Профиль сохранён в БД')
        
        // Обновляем email если изменился
        if (newEmail !== currentUser.email) {
            console.log('📧 Обновляем email...')
            const { error: emailError } = await supabase.auth.updateUser({
                email: newEmail
            })
            if (emailError) throw emailError
            alert('✅ Подтвердите новый email по ссылке в письме')
        }
        
        alert('✅ Профиль успешно обновлён!')
        
        // Перезагружаем страницу чтобы показать изменения
        location.reload()
        
    } catch (err) {
        console.error('❌ Ошибка:', err)
        alert('❌ Ошибка при сохранении: ' + err.message)
    }
}

// Загрузка аватара
function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput')
    if (!avatarInput) return
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        console.log('📸 Загружаем аватар:', file.name)
        
        try {
            // Проверка размера
            if (file.size > 2 * 1024 * 1024) {
                alert('Файл слишком большой! Максимум 2MB')
                return
            }
            
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`
            
            // Загружаем в Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file)
            
            if (uploadError) throw uploadError
            
            // Получаем публичный URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)
            
            console.log('🔗 URL аватара:', publicUrl)
            
            // Обновляем профиль
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id)
            
            if (updateError) throw updateError
            
            console.log('✅ Аватар сохранён')
            location.reload()
            
        } catch (err) {
            console.error('❌ Ошибка загрузки аватара:', err)
            alert('Ошибка при загрузке аватара: ' + err.message)
        }
    })
}
