import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

let bucket: GridFSBucket;

export const initGridFS = (db: mongoose.Connection) => {
  if (!db.db) {
    throw new Error('Database connection not established');
  }
  bucket = new GridFSBucket(db.db, { bucketName: 'attachments' });
  return bucket;
};

export const uploadFile = (filename: string, fileStream: Readable): Promise<ObjectId> => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      reject(new Error('GridFS not initialized'));
      return;
    }

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        uploadedAt: new Date()
      }
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve(uploadStream.id as ObjectId);
    });

    fileStream.pipe(uploadStream);
  });
};

export const downloadFile = async (fileId: string): Promise<{ stream: Readable; filename: string }> => {
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  try {
    const objectId = new ObjectId(fileId);
    
    // Get file info first
    const files = await bucket.find({ _id: objectId }).toArray();
    
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }

    const file = files[0];
    const downloadStream = bucket.openDownloadStream(objectId);
    
    return {
      stream: downloadStream,
      filename: file.filename
    };
  } catch (error) {
    throw new Error('Invalid file ID');
  }
};

export const deleteFile = async (fileId: string): Promise<void> => {
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  try {
    const objectId = new ObjectId(fileId);
    await bucket.delete(objectId);
  } catch (error) {
    throw new Error('Invalid file ID');
  }
};

export const getFileInfo = async (fileId: string): Promise<any> => {
  if (!bucket) {
    throw new Error('GridFS not initialized');
  }

  try {
    const objectId = new ObjectId(fileId);
    const files = await bucket.find({ _id: objectId }).toArray();
    
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }

    return files[0];
  } catch (error) {
    throw new Error('Invalid file ID');
  }
}; 