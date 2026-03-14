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
        document.getElementById('profileEmail').textContent = currentUser.email
        document.getElementById('editUsername').value = profile.username || ''
        document.getElementById('editEmail').value = currentUser.email || ''
        
        // Аватар
        if (profile.avatar_url) {
            document.getElementById('avatarImg').src = profile.avatar_url
            document.getElementById('avatarImg').style.display = 'block'
            document.getElementById('avatarText').style.display = 'none'
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
        
        const { error } = await supabase
            .from('profiles')
            .update({ username: newUsername })
            .eq('id', currentUser.id)
        
        if (error) throw error
        
        alert('Профиль обновлён!')
        location.reload()
        
    } catch (err) {
        alert('Ошибка: ' + err.message)
    }
}

function setupAvatarUpload() {
    document.getElementById('avatarInput').addEventListener('change', async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
            const fileName = `${currentUser.id}/${Date.now()}.${file.name.split('.').pop()}`
            
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
            alert('Ошибка загрузки: ' + err.message)
        }
    })
}
