import { createSupabaseClient } from './supabase'
import { Database } from './database.types'

export async function updateProgressStatus(
    taskId: string,
    week: number,
    status: Database['public']['Tables']['progress_reports']['Row']['status']
) {
    const supabase = createSupabaseClient()

    const { data, error } = await supabase
        .from('progress_reports')
        .upsert(
            { task_id: taskId, week, status, updated_at: new Date().toISOString() } as any,
            { onConflict: 'task_id,week' }
        )
        .select()

    if (error) {
        console.error("Error updating status:", error)
        throw error
    }
    return data
}

export async function uploadProofImage(
    taskId: string,
    week: number,
    fileUri: File
) {
    const supabase = createSupabaseClient()

    // 1. Upload file to Storage
    const fileExt = fileUri.name.split('.').pop()
    const fileName = `${taskId}-w${week}-${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('work_proofs')
        .upload(filePath, fileUri, {
            cacheControl: '3600',
            upsert: false
        })

    if (uploadError) {
        console.error("Error uploading image:", uploadError)
        throw uploadError
    }

    // 2. Get Public URL
    const { data: publicUrlData } = supabase.storage
        .from('work_proofs')
        .getPublicUrl(filePath)

    // 3. Update DB Record
    const { data, error: dbError } = await supabase
        .from('progress_reports')
        .upsert(
            {
                task_id: taskId,
                week,
                proof_image_url: publicUrlData.publicUrl,
                updated_at: new Date().toISOString()
            } as any,
            { onConflict: 'task_id,week' }
        )
        .select()

    if (dbError) {
        console.error("Error saving image URL to DB:", dbError)
        throw dbError
    }

    return data
}

export async function removeProofImage(
    taskId: string,
    week: number,
    imageUrl: string
) {
    const supabase = createSupabaseClient()

    // 1. Delete from Storage
    try {
        // Extract filename from URL (assumes basic supabase format)
        const parts = imageUrl.split('/')
        const fileName = parts.pop()

        if (fileName) {
            await supabase.storage
                .from('work_proofs')
                .remove([fileName])
        }
    } catch (e) {
        console.error("Failed to delete actual file from storage, continuing DB nullification:", e)
    }

    // 2. Set DB Record proof_image_url to null
    const { data, error: dbError } = await supabase
        .from('progress_reports')
        // @ts-ignore
        .update({
            proof_image_url: null,
            updated_at: new Date().toISOString()
        })
        .match({ task_id: taskId, week })
        .select()

    if (dbError) {
        console.error("Error removing image URL from DB:", dbError)
        throw dbError
    }

    return data
}
