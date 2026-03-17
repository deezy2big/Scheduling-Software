import React, { useState, useRef } from 'react';

/**
 * AvatarUpload Component
 *
 * Handles user avatar upload with preview, validation, and deletion
 *
 * @param {Object} props
 * @param {number} props.userId - User ID for avatar upload
 * @param {string} props.currentAvatarUrl - Current avatar URL (null if no avatar)
 * @param {function} props.onUploadComplete - Callback when upload completes (url) => void
 */
export function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentAvatarUrl);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  /**
   * Handle file selection and upload
   */
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and GIF images are allowed.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('rms_token');
      const res = await fetch(`http://localhost:3001/api/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setPreview(data.avatar_url);

      if (onUploadComplete) {
        onUploadComplete(data.avatar_url);
      }
    } catch (err) {
      setError(err.message);
      setPreview(currentAvatarUrl); // Revert to current avatar on error
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle avatar deletion
   */
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your avatar?')) {
      return;
    }

    setError('');
    setUploading(true);

    try {
      const token = localStorage.getItem('rms_token');
      const res = await fetch(`http://localhost:3001/api/users/${userId}/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete avatar');
      }

      setPreview(null);

      if (onUploadComplete) {
        onUploadComplete(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Get initials from user info for fallback display
   */
  const getInitials = () => {
    // This will be passed from parent or you can fetch from user context
    return '?';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar Preview */}
      <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0">
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-medium text-slate-400">
            {getInitials()}
          </span>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-sm btn-secondary"
          >
            {uploading ? 'Uploading...' : preview ? 'Change Avatar' : 'Upload Avatar'}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="btn btn-sm btn-secondary"
            >
              Remove
            </button>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {uploading && (
          <p className="text-sm text-blue-400">Processing image...</p>
        )}
        <p className="text-xs text-slate-500">
          Max size: 5MB • Formats: JPG, PNG, GIF
        </p>
      </div>
    </div>
  );
}

export default AvatarUpload;
