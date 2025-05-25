import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
export declare const initGridFS: (db: mongoose.Connection) => mongoose.mongo.GridFSBucket;
export declare const uploadFile: (filename: string, fileStream: Readable) => Promise<ObjectId>;
export declare const downloadFile: (fileId: string) => Promise<{
    stream: Readable;
    filename: string;
}>;
export declare const deleteFile: (fileId: string) => Promise<void>;
export declare const getFileInfo: (fileId: string) => Promise<any>;
//# sourceMappingURL=gridfs.d.ts.map