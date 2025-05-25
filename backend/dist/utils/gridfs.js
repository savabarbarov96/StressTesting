"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileInfo = exports.deleteFile = exports.downloadFile = exports.uploadFile = exports.initGridFS = void 0;
const mongodb_1 = require("mongodb");
let bucket;
const initGridFS = (db) => {
    if (!db.db) {
        throw new Error('Database connection not established');
    }
    bucket = new mongodb_1.GridFSBucket(db.db, { bucketName: 'attachments' });
    return bucket;
};
exports.initGridFS = initGridFS;
const uploadFile = (filename, fileStream) => {
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
            resolve(uploadStream.id);
        });
        fileStream.pipe(uploadStream);
    });
};
exports.uploadFile = uploadFile;
const downloadFile = async (fileId) => {
    if (!bucket) {
        throw new Error('GridFS not initialized');
    }
    try {
        const objectId = new mongodb_1.ObjectId(fileId);
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
    }
    catch (error) {
        throw new Error('Invalid file ID');
    }
};
exports.downloadFile = downloadFile;
const deleteFile = async (fileId) => {
    if (!bucket) {
        throw new Error('GridFS not initialized');
    }
    try {
        const objectId = new mongodb_1.ObjectId(fileId);
        await bucket.delete(objectId);
    }
    catch (error) {
        throw new Error('Invalid file ID');
    }
};
exports.deleteFile = deleteFile;
const getFileInfo = async (fileId) => {
    if (!bucket) {
        throw new Error('GridFS not initialized');
    }
    try {
        const objectId = new mongodb_1.ObjectId(fileId);
        const files = await bucket.find({ _id: objectId }).toArray();
        if (!files || files.length === 0) {
            throw new Error('File not found');
        }
        return files[0];
    }
    catch (error) {
        throw new Error('Invalid file ID');
    }
};
exports.getFileInfo = getFileInfo;
//# sourceMappingURL=gridfs.js.map