export type UserRole = "buyer" | "seller" | "admin";

export interface UploadPresignedUrlResponse {
  file_name: string;
  upload_url: string;
}

export interface GetPresignedUrlPreviewResponse {
  file_name: string;
  preview_url: string;
}

export function getFileServiceBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_FILE_SERVICE;
  if (envUrl) {
    const formatted = envUrl.startsWith("http") ? envUrl : `http://${envUrl}`;
    return `${formatted}/api/v1/files`;
  }

  if (typeof window !== "undefined") {
    const isGateway = window.location.port === "" || window.location.port === "80";
    if (isGateway) {
      return "/api/v1/files";
    }
  }

  return "http://localhost:3004/api/v1/files";
}

/**
 * Step 1: Call File-Service to generate S3 upload presigned URL
 */
export async function getUploadPresignedUrl(
  fileName: string,
  role: UserRole = "buyer"
): Promise<UploadPresignedUrlResponse> {
  const baseUrl = getFileServiceBaseUrl();
  const response = await fetch(`${baseUrl}/presigned-url/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: fileName,
      role: role,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to generate upload presigned URL from File-Service");
  }

  return data;
}

/**
 * Step 2: Upload file binary to S3 via presigned PUT URL with optional progress callback
 */
export async function uploadFileToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during S3 upload.")));
    xhr.addEventListener("abort", () => reject(new Error("S3 upload aborted.")));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

/**
 * Step 3: Call File-Service to generate S3 preview presigned URL for a given file key
 */
export async function getPreviewPresignedUrl(
  fileName: string
): Promise<GetPresignedUrlPreviewResponse> {
  const baseUrl = getFileServiceBaseUrl();
  const response = await fetch(`${baseUrl}/presigned-url/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: fileName,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to generate preview presigned URL from File-Service");
  }

  return data;
}

export function getAuthServiceBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE;
  if (envUrl) {
    const formatted = envUrl.startsWith("http") ? envUrl : `http://${envUrl}`;
    return `${formatted}/api/v1/auth`;
  }

  if (typeof window !== "undefined") {
    const isGateway = window.location.port === "" || window.location.port === "80";
    if (isGateway) {
      return "/api/v1/auth";
    }
  }

  return "http://localhost:3002/api/v1/auth";
}

/**
 * Call Auth-Service to generate S3 preview presigned URL for a given file key
 */
export async function getAuthServicePreviewPresignedUrl(
  fileName: string
): Promise<GetPresignedUrlPreviewResponse> {
  const baseUrl = getAuthServiceBaseUrl();
  const response = await fetch(`${baseUrl}/profile/presigned-url/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: fileName,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to generate preview presigned URL from Auth-Service");
  }

  return data;
}

/**
 * Call Auth-Service to generate S3 upload presigned URL
 */
export async function getAuthServiceAvatarUploadPresignedUrl(
  fileExtension: string,
  role: UserRole = "buyer"
): Promise<{ fileName: string; presignedUrl: string }> {
  const baseUrl = getAuthServiceBaseUrl();
  const response = await fetch(`${baseUrl}/user/avatar-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileExtension,
      role,
    }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error || resData.message || "Failed to generate presigned upload URL from Auth-Service");
  }

  return {
    fileName: resData.data.fileName,
    presignedUrl: resData.data.presignedUrl,
  };
}

/**
 * High-level helper: Uploads avatar via Auth-Service presigned URL & S3, then fetches preview presigned URL from Auth-Service
 */
export async function uploadAvatarViaAuthService({
  file,
  role = "buyer",
  onProgress,
}: {
  file: File;
  role?: UserRole;
  onProgress?: (percentage: number) => void;
}): Promise<{ fileName: string; previewUrl: string }> {
  const fileNameParts = file.name.split(".");
  const ext = fileNameParts[fileNameParts.length - 1].toLowerCase();

  // 1. Get presigned upload URL from Auth-Service
  const { fileName: key, presignedUrl } = await getAuthServiceAvatarUploadPresignedUrl(ext, role);

  // 2. Upload file binary directly to S3
  await uploadFileToS3(presignedUrl, file, onProgress);

  // 3. Get preview presigned URL from Auth-Service
  const { preview_url: previewUrl } = await getAuthServicePreviewPresignedUrl(key);

  return { fileName: key, previewUrl };
}

export function getItemServiceBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_ITEM_SERVICE;
  if (envUrl) {
    const formatted = envUrl.startsWith("http") ? envUrl : `http://${envUrl}`;
    return `${formatted}/api/v1/items`;
  }

  if (typeof window !== "undefined") {
    const isGateway = window.location.port === "" || window.location.port === "80";
    if (isGateway) {
      return "/api/v1/items";
    }
  }

  return "http://localhost:3001/api/v1/items";
}

/**
 * Call Item-Service to generate S3 preview presigned URL for a given file key
 */
export async function getItemServicePreviewPresignedUrl(
  fileName: string
): Promise<GetPresignedUrlPreviewResponse> {
  const baseUrl = getItemServiceBaseUrl();
  const response = await fetch(`${baseUrl}/presigned-url/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: fileName,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Failed to generate preview presigned URL from Item-Service");
  }

  return data;
}

/**
 * High-level helper: Uploads avatar via File-Service & S3, then fetches preview presigned URL from File-Service
 */
export async function uploadAvatarAndGetPreview({
  file,
  role = "buyer",
  onProgress,
}: {
  file: File;
  role?: UserRole;
  onProgress?: (percentage: number) => void;
}): Promise<{ fileName: string; previewUrl: string }> {
  // 1. Get presigned upload URL from File-Service
  const { file_name: key, upload_url: uploadUrl } = await getUploadPresignedUrl(file.name, role);

  // 2. Upload file binary directly to S3
  await uploadFileToS3(uploadUrl, file, onProgress);

  // 3. Get preview presigned URL from File-Service
  const { preview_url: previewUrl } = await getPreviewPresignedUrl(key);

  return { fileName: key, previewUrl };
}

