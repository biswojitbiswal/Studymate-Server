// src/cloudinary/cloudinary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  raw?: any; // original cloudinary response if you want more
}

export interface UploadOptions {
  folder?: string;         // Cloudinary folder, e.g. 'studymate/icons'
  publicId?: string;       // override public_id (without extension)
  resourceType?: 'image' | 'auto' | 'raw' | 'video';
  overwrite?: boolean;
  transformation?: any;    // pass transformations if needed
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
      secure: true,
    });
  }

  // Upload a single Buffer
  async uploadFile(buffer: Buffer, opts: UploadOptions = {}): Promise<UploadResult> {
    const folder = opts.folder ?? 'studymate/images';
    const resource_type = opts.resourceType ?? 'image';

    return new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: opts.publicId ? String(opts.publicId).replace(/\.[^/.]+$/, '') : undefined,
          overwrite: typeof opts.overwrite === 'boolean' ? opts.overwrite : true,
          resource_type,
          transformation: opts.transformation,
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error', error);
            return reject(error);
          }
          if (!result) return reject(new Error('Empty upload result'));
          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            raw: result,
          });
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  // Upload multiple buffers (concurrent)
  async uploadFiles(buffers: Buffer[], opts: UploadOptions = {}): Promise<UploadResult[]> {
    if (!Array.isArray(buffers)) throw new Error('buffers must be an array of Buffer');
    return Promise.all(buffers.map((b) => this.uploadFile(b, opts)));
  }

  // Delete a single file by publicId
  // note: resource_type typically 'image' (or 'raw' for non-image)
  async deleteFile(publicId: string, resourceType: 'image' | 'raw' | 'auto' = 'image') {
    if (!publicId) throw new Error('publicId required');
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
        if (error) {
          this.logger.error('Cloudinary delete error', error);
          return reject(error);
        }
        // result example: { result: 'ok' } or { result: 'not_found' }
        resolve(result);
      });
    });
  }

  // Delete many files (concurrent)
  async deleteFiles(publicIds: string[], resourceType: 'image' | 'raw' | 'auto' = 'image') {
    if (!Array.isArray(publicIds)) throw new Error('publicIds must be an array');
    return Promise.all(publicIds.map((id) => this.deleteFile(id, resourceType)));
  }

  // Optional helper: extract publicId from a Cloudinary URL (if you didn't store public_id)
  // This tries to pick `folder/filename` portion used as public_id (without extension and version)
  extractPublicIdFromUrl(url: string): string | null {
    if (!url) return null;
    try {
      const u = new URL(url);
      // path like /<cloud_name>/image/upload/v1234/folder/name.png
      const parts = u.pathname.split('/');
      // find 'upload' segment
      const uploadIndex = parts.findIndex((p) => p === 'upload');
      if (uploadIndex === -1) return null;
      // everything after upload and optional version
      let after = parts.slice(uploadIndex + 1);
      // remove version if present (v12345)
      if (after[0] && after[0].startsWith('v') && /^\bv\d+\b/.test(after[0])) {
        after = after.slice(1);
      }
      // join remaining and strip extension
      const last = after.join('/');
      return last.replace(/\.[^/.]+$/, '');
    } catch {
      return null;
    }
  }
}
