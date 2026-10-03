# 🔐 Cloud-Based Secure File Storage and Data Encryption

A secure cloud-based file storage application that encrypts files before uploading them to the cloud. Users can securely register, log in, upload encrypted files, download and decrypt them using a password, and delete their files.

## 🚀 Features

- 🔐 User registration and login
- 🔒 Client-side AES-256-GCM file encryption
- 🔑 Password-based encryption key derivation using PBKDF2
- ☁️ Secure cloud file storage using Supabase Storage
- 👤 User-specific file access
- 📂 View uploaded files
- ⬆️ Encrypt and upload files
- ⬇️ Decrypt and download files
- 🗑️ Delete uploaded files
- 🛡️ Row Level Security (RLS) for database protection
- 🔒 Private Supabase storage bucket
- 📱 Responsive web interface

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ Client-Side     │        │   Supabase      │
        │ Encryption      │        │ Authentication  │
        │ AES-256-GCM     │        └─────────────────┘
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Supabase Storage│
        │ Private Bucket  │
        └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   PostgreSQL    │
        │ File Metadata   │
        └─────────────────┘
