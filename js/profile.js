// js/profile.js
import { checkAuth } from './auth.js'
import { supabase } from './supabase.js'

let currentUser = null

export async function initProfile() {
    try {
        currentUser = await checkAuth()
        if (!currentUser) return
        
        // Загружаем профиль
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
        
        if (error) throw error
        
        // Отображаем данные
        document.getElementById('profileName').textContent = profile.username || 'Пользователь'
        document.getElementById('displayName').textContent = profile.username || 'Не указано'
        document.getElementById('displayEmail').textContent = currentUser.email
        
        // Отображаем био (если есть)
        const bioElement = document.getElementById('displayBio')
        if (bioElement) {
            bioElement.textContent = profile.bio || '🚀 Социальная сеть NOVA'
        }
        
        // Заполняем форму редактирования
        document.getElementById('editUsername').value = profile.username || ''
        document.getElementById('editEmail').value = currentUser.email || ''
        
        // Заполняем био в форме
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
        console.error('Ошибка загрузки профиля:', err)
    }
}

export function toggleEditForm() {
    document.getElementById('editForm').classList.toggle('show')
}

export async function updateProfile() {
    try {
        const newUsername = document.getElementById('editUsername').value.trim()
        const newEmail = document.getElementById('editEmail').value.trim()
        const newBio = document.getElementById('editBio')?.value.trim() || '🚀 Социальная сеть NOVA'
        
        if (!newUsername) {
            alert('Имя пользователя не может быть пустым')
            return
        }
        
        // Обновляем профиль с bio
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                username: newUsername,
                bio: newBio 
            })
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

function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput')
    if (!avatarInput) return
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file)
            
            if (uploadError) throw uploadError
            
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)
            
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
