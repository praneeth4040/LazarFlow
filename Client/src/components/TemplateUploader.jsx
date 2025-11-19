import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { validateTemplateFile, compressImage } from '../utils/templateHandler'
import './TemplateUploader.css'

function TemplateUploader({ tournamentId, onUploadSuccess, onClose }) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  // Handle file selection
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  // Main file upload handler
  const handleFile = async (file) => {
    setError(null)
    setSuccess(false)
    setProgress(0)

    try {
      // 1. Validate file
      const validation = validateTemplateFile(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      setLoading(true)
      setProgress(20)

      // 2. Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      setProgress(30)

      // 3. Compress image if needed
      let fileToUpload = file
      if (validation.isRaster) {
        console.log('Compressing image...')
        const compressedBlob = await compressImage(file, 0.85, 0.8)
        fileToUpload = new File([compressedBlob], file.name, { type: file.type })
      }

      setProgress(50)

      // 4. Upload to Supabase Storage
      const fileName = `template - ${user.id} -${tournamentId} -${Date.now()}.${validation.format} `
      const filePath = `custom - templates / ${user.id}/${fileName}`

      console.log(`Uploading file to ${filePath}...`)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      setProgress(70)

      // 5. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData.publicUrl

      setProgress(80)

      // 6. Save template metadata to database
      const { data: insertData, error: dbError } = await supabase
        .from('templates')
        .insert({
          name: file.name.replace(/\.[^.]+$/, ''), // Remove extension
          description: `Custom template uploaded for tournament`,
          template_type: 'custom',
          design_format: validation.format,
          design_url: publicUrl,
          placeholder_info: JSON.stringify({
            format: validation.format,
            uploadedAt: new Date().toISOString(),
            originalSize: file.size,
            compressedSize: fileToUpload.size
          }),
          created_by: user.id
        })
        .select()

      if (dbError) throw dbError

      setProgress(100)
      setSuccess(true)

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess(insertData[0])
      }

      // Reset after 2 seconds
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = ''
        setProgress(0)
        setSuccess(false)
      }, 2000)

    } catch (err) {
      console.error('❌ Upload error:', err)
      setError(err.message || 'Failed to upload template')
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="template-uploader">
      <div
        className={`upload-area ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">Uploading... {progress}%</p>
          </div>
        ) : success ? (
          <div className="upload-success">
            <div className="success-icon">✓</div>
            <p>Template uploaded successfully!</p>
          </div>
        ) : (
          <div
            className="upload-content"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📤</div>
            <h3>Upload Template</h3>
            <p>Drag and drop SVG or PNG file here</p>
            <p className="upload-hint">or click to browse</p>
            <p className="upload-specs">Max 5MB • Supported: SVG, PNG, JPG, WebP</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,.png,.jpg,.jpeg,.webp"
          onChange={handleInputChange}
          disabled={loading}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div className="upload-error">
          <span className="error-icon"><AlertTriangle size={20} /></span>
          <p>{error}</p>
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="uploader-info">
        <h4>Template Requirements</h4>
        <ul>
          <li><CheckCircle2 size={16} /> SVG or PNG format</li>
          <li><CheckCircle2 size={16} /> Maximum 5MB file size</li>
          <li><CheckCircle2 size={16} /> Width: 800px (recommended)</li>
          <li><CheckCircle2 size={16} /> Include placeholders like {'{TOURNAMENT_NAME}'}, {'{TEAM_NAME}'}</li>
        </ul>
      </div>
    </div>
  )
}

export default TemplateUploader
