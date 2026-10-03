import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../Dashboard.css";

// Convert bytes to Base64
const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
};

// Convert Base64 to bytes
const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

// Derive AES-256 key from password
const deriveKey = async (password, salt) => {
  const encoder = new TextEncoder();

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600000,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
};

function Dashboard() {
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionPassword, setEncryptionPassword] = useState("");

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [downloadingFileId, setDownloadingFileId] =
    useState(null);

  const [deletingFileId, setDeletingFileId] =
    useState(null);

  // Check logged-in user
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.hash = "login";
        return;
      }

      setUser(user);
      setCheckingUser(false);

      loadFiles(user.id);
    };

    checkUser();
  }, []);

  // Load user's files
  const loadFiles = async (userId) => {
    setLoadingFiles(true);

    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    setLoadingFiles(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setFiles(data || []);
  };

  // Select file
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setMessage("");
  };

  // Encrypt and upload
  const handleUpload = async () => {
    if (!selectedFile || !user) {
      setMessage("Please select a file first.");
      return;
    }

    if (!encryptionPassword) {
      setMessage("Please enter an encryption password.");
      return;
    }

    if (encryptionPassword.length < 8) {
      setMessage(
        "Encryption password must be at least 8 characters."
      );
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Generate random salt
      const salt = crypto.getRandomValues(
        new Uint8Array(16)
      );

      // Generate random IV
      const iv = crypto.getRandomValues(
        new Uint8Array(12)
      );

      // Create AES key
      const key = await deriveKey(
        encryptionPassword,
        salt
      );

      // Read original file
      const fileBuffer =
        await selectedFile.arrayBuffer();

      // Encrypt file
      const encryptedBuffer =
        await crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv,
          },
          key,
          fileBuffer
        );

      // Create encrypted Blob
      const encryptedBlob = new Blob(
        [encryptedBuffer],
        {
          type: "application/octet-stream",
        }
      );

      // Generate random storage filename
      const filePath = `${user.id}/${crypto.randomUUID()}.enc`;

      // Upload encrypted file
      const { error: uploadError } =
        await supabase.storage
          .from("secure-files")
          .upload(filePath, encryptedBlob);

      if (uploadError) {
        throw uploadError;
      }

      // Save file information
      const { error: databaseError } =
        await supabase
          .from("files")
          .insert({
            user_id: user.id,
            file_name: selectedFile.name,
            storage_path: filePath,
            file_size: selectedFile.size,
            encryption_salt:
              bytesToBase64(salt),
            encryption_iv:
              bytesToBase64(iv),
          });

      // Remove uploaded file if database insert fails
      if (databaseError) {
        await supabase.storage
          .from("secure-files")
          .remove([filePath]);

        throw databaseError;
      }

      setSelectedFile(null);
      setEncryptionPassword("");

      setMessage(
        "File encrypted and uploaded successfully! 🔐"
      );

      const fileInput =
        document.getElementById("file-input");

      if (fileInput) {
        fileInput.value = "";
      }

      await loadFiles(user.id);
    } catch (error) {
      setMessage(
        error.message ||
          "Encryption/upload failed."
      );
    }

    setUploading(false);
  };

  // Download and decrypt
  const handleDownload = async (file) => {
    setDownloadingFileId(file.id);
    setMessage("");

    try {
      const { data, error } =
        await supabase.storage
          .from("secure-files")
          .download(file.storage_path);

      if (error) {
        throw error;
      }

      // Older plaintext files
      if (
        !file.encryption_salt ||
        !file.encryption_iv
      ) {
        const url =
          URL.createObjectURL(data);

        const link =
          document.createElement("a");

        link.href = url;
        link.download = file.file_name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        setMessage(
          "This is an older file uploaded before encryption was enabled."
        );

        return;
      }

      const password = window.prompt(
        "Enter the encryption password for this file:"
      );

      if (!password) {
        setMessage("Download cancelled.");
        return;
      }

      const salt = base64ToBytes(
        file.encryption_salt
      );

      const iv = base64ToBytes(
        file.encryption_iv
      );

      const key = await deriveKey(
        password,
        salt
      );

      const encryptedBuffer =
        await data.arrayBuffer();

      const decryptedBuffer =
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv,
          },
          key,
          encryptedBuffer
        );

      const decryptedBlob = new Blob(
        [decryptedBuffer],
        {
          type: "application/octet-stream",
        }
      );

      const url =
        URL.createObjectURL(
          decryptedBlob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download = file.file_name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setMessage(
        "File decrypted and downloaded successfully! 🔓"
      );
    } catch (error) {
      setMessage(
        "Decryption failed. Check your encryption password."
      );
    }

    setDownloadingFileId(null);
  };

  // Delete file
  const handleDelete = async (file) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${file.file_name}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingFileId(file.id);
    setMessage("");

    try {
      // Delete from Storage
      const { error: storageError } =
        await supabase.storage
          .from("secure-files")
          .remove([file.storage_path]);

      if (storageError) {
        throw storageError;
      }

      // Delete database record
      const { error: databaseError } =
        await supabase
          .from("files")
          .delete()
          .eq("id", file.id)
          .eq("user_id", user.id);

      if (databaseError) {
        throw databaseError;
      }

      setMessage(
        "File deleted successfully! 🗑️"
      );

      await loadFiles(user.id);
    } catch (error) {
      setMessage(
        error.message ||
          "Failed to delete file."
      );
    }

    setDeletingFileId(null);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.hash = "login";
  };

  // Authentication loading
  if (checkingUser) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-card">
          <h2>
            Checking authentication...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">

        <div className="dashboard-icon">
          🔐
        </div>

        <h1>
          SecureCloud Dashboard
        </h1>

        <p>
          Your secure file storage area
        </p>

        {/* User information */}
        <div className="user-info">
          <p>
            <strong>
              Logged in as:
            </strong>
          </p>

          <p>{user.email}</p>
        </div>

        {/* Upload section */}
        <div className="upload-section">

          <h3>
            🔒 Upload Encrypted File
          </h3>

          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
          />

          {selectedFile && (
            <p>
              Selected:{" "}
              <strong>
                {selectedFile.name}
              </strong>
            </p>
          )}

          <input
            type="password"
            placeholder="Enter encryption password"
            value={encryptionPassword}
            onChange={(event) =>
              setEncryptionPassword(
                event.target.value
              )
            }
          />

          <p className="password-note">
            Minimum 8 characters. Remember this
            password — it is not stored.
          </p>

          <button
            className="primary-btn"
            onClick={handleUpload}
            disabled={
              uploading ||
              !selectedFile
            }
          >
            {uploading
              ? "Encrypting & Uploading..."
              : "🔐 Encrypt & Upload"}
          </button>

        </div>

        {/* Message */}
        {message && (
          <p className="login-footer">
            {message}
          </p>
        )}

        {/* Files section */}
        <div className="my-files-section">

          <h3>
            📂 My Files
          </h3>

          {loadingFiles ? (
            <p>
              Loading files...
            </p>
          ) : files.length === 0 ? (
            <p>
              No files uploaded yet.
            </p>
          ) : (
            <div className="file-list">

              {files.map((file) => (

                <div
                  className="file-item"
                  key={file.id}
                >

                  <div>
                    <strong>
                      {file.file_name}
                    </strong>

                    <p>
                      {file.file_size
                        ? `${Math.round(
                            file.file_size / 1024
                          )} KB`
                        : "Size unavailable"}
                    </p>

                    <small>
                      {file.encryption_salt &&
                      file.encryption_iv
                        ? "🔐 AES-GCM Encrypted"
                        : "⚠️ Legacy unencrypted file"}
                    </small>
                  </div>

                  <div>

                    <button
                      className="secondary-btn"
                      onClick={() =>
                        handleDownload(file)
                      }
                      disabled={
                        downloadingFileId ===
                          file.id ||
                        deletingFileId ===
                          file.id
                      }
                    >
                      {downloadingFileId ===
                      file.id
                        ? "Decrypting..."
                        : "⬇️ Download"}
                    </button>

                    <button
                      className="logout-btn"
                      onClick={() =>
                        handleDelete(file)
                      }
                      disabled={
                        deletingFileId ===
                          file.id ||
                        downloadingFileId ===
                          file.id
                      }
                    >
                      {deletingFileId ===
                      file.id
                        ? "Deleting..."
                        : "🗑️ Delete"}
                    </button>

                  </div>

                </div>

              ))}

            </div>
          )}

        </div>

        {/* Logout */}
        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>
    </div>
  );
}

export default Dashboard;