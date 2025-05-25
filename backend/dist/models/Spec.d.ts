import mongoose, { Document } from 'mongoose';
export interface ILoadProfile {
    rampUp: number;
    users: number;
    steady: number;
    rampDown: number;
}
export interface IRequestConfig {
    method: string;
    url: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: string;
    attachmentId?: string;
}
export interface ISpec extends Document {
    name: string;
    request: IRequestConfig;
    loadProfile: ILoadProfile;
    attachmentId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Spec: mongoose.Model<ISpec, {}, {}, {}, mongoose.Document<unknown, {}, ISpec, {}> & ISpec & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Spec.d.ts.map